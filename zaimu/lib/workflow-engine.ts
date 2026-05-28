// lib/workflow-engine.ts
// Zaimu institutional workflow engine — creates, advances, and analyses
// asset-level business-process workflows.

import Anthropic from "@anthropic-ai/sdk";
import {
  WorkflowType,
  WorkflowStatus,
  StepStatus,
  StepType,
  type Workflow,
  type WorkflowStep,
} from "@/app/generated/prisma";
import { db } from "@/lib/db";

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowCreateInput {
  orgId: string;
  assetId: string;
  workflowType: WorkflowType;
  templateCode?: string; // use this template, or pick best match
  title: string;
  titleJa?: string;
  description?: string;
  targetDate?: Date;
  createdById?: string;
  linkedRiskEventIds?: string[];
  notes?: string;
}

export interface StepAdvanceResult {
  stepId: string;
  newStatus: StepStatus;
  nextStepsUnblocked: string[]; // IDs of steps that can now start
  workflowComplete: boolean;
}

export interface WorkflowStatusSummary {
  workflow: Workflow;
  totalSteps: number;
  completedSteps: number;
  blockedSteps: number;
  overdueSteps: number;
  nextActionStep: WorkflowStep | null; // first IN_PROGRESS step by order
  estimatedCompletion: Date | null;
  isBlocked: boolean;
  blockingReasons: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic client (same pattern as extract.ts)
// ─────────────────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;
let _clientKey: string | null = null;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
  const currentKey = apiKey ?? authToken ?? null;

  if (!currentKey) {
    throw new Error("ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is not configured.");
  }

  if (!_client || _clientKey !== currentKey) {
    _client = apiKey
      ? new Anthropic({ apiKey })
      : new Anthropic({ authToken, apiKey: null });
    _clientKey = currentKey;
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateStepDef {
  order: number;
  name: string;
  type: StepType;
  requiresApproval?: boolean;
  approverRoles?: string[];
  dueDaysFromStart: number;
  dependsOnOrders?: number[];
}

interface TemplateDef {
  code: string;
  name: string;
  workflowType: WorkflowType;
  assetTypes: string[];
  estimatedDays: number;
  steps: TemplateStepDef[];
}

const SYSTEM_TEMPLATES: TemplateDef[] = [
  // 1. REFINANCING
  {
    code: "SYS_REFINANCING_STANDARD",
    name: "Loan Refinancing Process",
    workflowType: WorkflowType.REFINANCING,
    assetTypes: ["OFFICE", "RETAIL", "LOGISTICS"],
    estimatedDays: 120,
    steps: [
      { order: 1, name: "Appoint Financial Adviser", type: StepType.ACTION, dueDaysFromStart: 7 },
      { order: 2, name: "Prepare Information Memorandum", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 21, dependsOnOrders: [1] },
      { order: 3, name: "Obtain Indicative Terms from Lenders", type: StepType.ACTION, dueDaysFromStart: 45, dependsOnOrders: [2] },
      { order: 4, name: "Select Preferred Lender & Terms", type: StepType.ACTION, dueDaysFromStart: 60, dependsOnOrders: [3] },
      { order: 5, name: "Fund Manager Approval — Refinancing Terms", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 65, dependsOnOrders: [4] },
      { order: 6, name: "Commission Independent Valuation", type: StepType.ACTION, dueDaysFromStart: 70, dependsOnOrders: [5] },
      { order: 7, name: "Upload Valuation Report", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 90, dependsOnOrders: [6] },
      { order: 8, name: "Execute Loan Documentation", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager", "legal_counsel"], dueDaysFromStart: 105, dependsOnOrders: [7] },
      { order: 9, name: "Financial Close", type: StepType.MILESTONE, dueDaysFromStart: 120, dependsOnOrders: [8] },
    ],
  },

  // 2. LEASE_RENEWAL
  {
    code: "SYS_LEASE_RENEWAL_STANDARD",
    name: "Lease Renewal Process",
    workflowType: WorkflowType.LEASE_RENEWAL,
    assetTypes: [],
    estimatedDays: 90,
    steps: [
      { order: 1, name: "Review Existing Lease Terms", type: StepType.ACTION, dueDaysFromStart: 5 },
      { order: 2, name: "Tenant Engagement — Renewal Intentions", type: StepType.ACTION, dueDaysFromStart: 14, dependsOnOrders: [1] },
      { order: 3, name: "Instruct Leasing Agent", type: StepType.ACTION, dueDaysFromStart: 14, dependsOnOrders: [1] },
      { order: 4, name: "Prepare Heads of Agreement", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 40, dependsOnOrders: [2, 3] },
      { order: 5, name: "Commercial Terms Approval", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 45, dependsOnOrders: [4] },
      { order: 6, name: "Lease Drafting by Legal Counsel", type: StepType.ACTION, dueDaysFromStart: 65, dependsOnOrders: [5] },
      { order: 7, name: "Lease Execution — Sign-Off", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager", "legal_counsel"], dueDaysFromStart: 80, dependsOnOrders: [6] },
      { order: 8, name: "Upload Executed Lease Document", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 85, dependsOnOrders: [7] },
      { order: 9, name: "Lease Renewal Complete", type: StepType.MILESTONE, dueDaysFromStart: 90, dependsOnOrders: [8] },
    ],
  },

  // 3. VALUATION_UPDATE
  {
    code: "SYS_VALUATION_UPDATE",
    name: "Independent Valuation Update",
    workflowType: WorkflowType.VALUATION_UPDATE,
    assetTypes: [],
    estimatedDays: 45,
    steps: [
      { order: 1, name: "Appoint Approved Valuer", type: StepType.ACTION, dueDaysFromStart: 5 },
      { order: 2, name: "Provide Asset Information Pack to Valuer", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 10, dependsOnOrders: [1] },
      { order: 3, name: "Valuer Site Inspection", type: StepType.EXTERNAL, dueDaysFromStart: 20, dependsOnOrders: [2] },
      { order: 4, name: "Receive Draft Valuation", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 35, dependsOnOrders: [3] },
      { order: 5, name: "Review & Respond to Draft", type: StepType.ACTION, dueDaysFromStart: 38, dependsOnOrders: [4] },
      { order: 6, name: "Upload Final Valuation Report", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 42, dependsOnOrders: [5] },
      { order: 7, name: "Update Asset Record with Valuation", type: StepType.ACTION, dueDaysFromStart: 44, dependsOnOrders: [6] },
      { order: 8, name: "Valuation Approved by Fund Manager", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 45, dependsOnOrders: [7] },
    ],
  },

  // 4. MONTHLY_REPORTING
  {
    code: "SYS_MONTHLY_REPORTING",
    name: "Monthly Board Reporting",
    workflowType: WorkflowType.MONTHLY_REPORTING,
    assetTypes: [],
    estimatedDays: 14,
    steps: [
      { order: 1, name: "Collect Asset Operational Data", type: StepType.ACTION, dueDaysFromStart: 3 },
      { order: 2, name: "Upload PM Report", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 5, dependsOnOrders: [1] },
      { order: 3, name: "Upload Financial Statements", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 5, dependsOnOrders: [1] },
      { order: 4, name: "Generate AI Board Report", type: StepType.ACTION, dueDaysFromStart: 7, dependsOnOrders: [2, 3] },
      { order: 5, name: "Analyst Review", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["analyst"], dueDaysFromStart: 9, dependsOnOrders: [4] },
      { order: 6, name: "Fund Manager Sign-Off", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 11, dependsOnOrders: [5] },
      { order: 7, name: "Distribute to Board", type: StepType.MILESTONE, dueDaysFromStart: 14, dependsOnOrders: [6] },
    ],
  },

  // 5. INSURANCE_RENEWAL
  {
    code: "SYS_INSURANCE_RENEWAL",
    name: "Insurance Renewal",
    workflowType: WorkflowType.INSURANCE_RENEWAL,
    assetTypes: [],
    estimatedDays: 60,
    steps: [
      { order: 1, name: "Review Expiring Policy Schedule", type: StepType.ACTION, dueDaysFromStart: 7 },
      { order: 2, name: "Instruct Insurance Broker", type: StepType.ACTION, dueDaysFromStart: 14, dependsOnOrders: [1] },
      { order: 3, name: "Obtain Renewal Quotes", type: StepType.EXTERNAL, dueDaysFromStart: 35, dependsOnOrders: [2] },
      { order: 4, name: "Select Insurer & Coverage", type: StepType.ACTION, dueDaysFromStart: 40, dependsOnOrders: [3] },
      { order: 5, name: "Approval — Insurance Terms", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 45, dependsOnOrders: [4] },
      { order: 6, name: "Bind Policy & Upload Certificate", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 55, dependsOnOrders: [5] },
      { order: 7, name: "Insurance Renewal Complete", type: StepType.MILESTONE, dueDaysFromStart: 60, dependsOnOrders: [6] },
    ],
  },

  // 6. COVENANT_REPORTING
  {
    code: "SYS_COVENANT_REPORTING",
    name: "Covenant Compliance Reporting",
    workflowType: WorkflowType.COVENANT_REPORTING,
    assetTypes: [],
    estimatedDays: 21,
    steps: [
      { order: 1, name: "Gather Financial Data for Testing Period", type: StepType.ACTION, dueDaysFromStart: 5 },
      { order: 2, name: "Calculate LTV and DSCR", type: StepType.ACTION, dueDaysFromStart: 8, dependsOnOrders: [1] },
      { order: 3, name: "Prepare Compliance Certificate", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 12, dependsOnOrders: [2] },
      { order: 4, name: "Fund Manager Review & Sign-Off", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 15, dependsOnOrders: [3] },
      { order: 5, name: "Submit to Lender", type: StepType.ACTION, dueDaysFromStart: 18, dependsOnOrders: [4] },
      { order: 6, name: "Upload Lender Acknowledgement", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 21, dependsOnOrders: [5] },
    ],
  },

  // 7. CAPEX_APPROVAL
  {
    code: "SYS_CAPEX_APPROVAL",
    name: "Capital Expenditure Approval",
    workflowType: WorkflowType.CAPEX_APPROVAL,
    assetTypes: [],
    estimatedDays: 30,
    steps: [
      { order: 1, name: "Prepare Capex Proposal & Cost Estimates", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 7 },
      { order: 2, name: "Technical Review", type: StepType.ACTION, dueDaysFromStart: 12, dependsOnOrders: [1] },
      { order: 3, name: "Obtain Contractor Quotes", type: StepType.EXTERNAL, dueDaysFromStart: 18, dependsOnOrders: [2] },
      { order: 4, name: "Analyst Approval", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["analyst"], dueDaysFromStart: 21, dependsOnOrders: [3] },
      { order: 5, name: "Fund Manager Approval", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["fund_manager"], dueDaysFromStart: 25, dependsOnOrders: [4] },
      { order: 6, name: "Issue Works Order", type: StepType.ACTION, dueDaysFromStart: 28, dependsOnOrders: [5] },
      { order: 7, name: "Capex Approved & Initiated", type: StepType.MILESTONE, dueDaysFromStart: 30, dependsOnOrders: [6] },
    ],
  },

  // 8. ACQUISITION_ONBOARDING
  {
    code: "SYS_ACQUISITION_ONBOARDING",
    name: "Asset Acquisition Onboarding",
    workflowType: WorkflowType.ACQUISITION_ONBOARDING,
    assetTypes: [],
    estimatedDays: 90,
    steps: [
      { order: 1, name: "Create Asset Record", type: StepType.ACTION, dueDaysFromStart: 1 },
      { order: 2, name: "Upload Sale & Purchase Agreement", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 3, dependsOnOrders: [1] },
      { order: 3, name: "KYC & Entity Verification", type: StepType.ACTION, dueDaysFromStart: 14, dependsOnOrders: [1] },
      { order: 4, name: "Commission Independent Valuation", type: StepType.ACTION, dueDaysFromStart: 21, dependsOnOrders: [2] },
      { order: 5, name: "Upload Title Documents", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 21, dependsOnOrders: [2] },
      { order: 6, name: "Ownership Structure Setup", type: StepType.ACTION, dueDaysFromStart: 30, dependsOnOrders: [3] },
      { order: 7, name: "Upload Insurance Policy", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 45, dependsOnOrders: [6] },
      { order: 8, name: "Loan Documentation Upload", type: StepType.DOCUMENT_UPLOAD, dueDaysFromStart: 60, dependsOnOrders: [6] },
      { order: 9, name: "Run Initial Risk Scan", type: StepType.ACTION, dueDaysFromStart: 65, dependsOnOrders: [4, 5, 6, 7] },
      { order: 10, name: "Board Approval — Acquisition Sign-Off", type: StepType.APPROVAL, requiresApproval: true, approverRoles: ["board", "fund_manager"], dueDaysFromStart: 80, dependsOnOrders: [9] },
      { order: 11, name: "Asset Onboarding Complete", type: StepType.MILESTONE, dueDaysFromStart: 90, dependsOnOrders: [10] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// seedWorkflowTemplates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Idempotent. Creates all 8 system workflow templates if they don't exist.
 */
export async function seedWorkflowTemplates(): Promise<void> {
  for (const tpl of SYSTEM_TEMPLATES) {
    const existing = await db.workflowTemplate.findUnique({
      where: { code: tpl.code },
    });

    if (existing) continue;

    await db.workflowTemplate.create({
      data: {
        code: tpl.code,
        name: tpl.name,
        workflowType: tpl.workflowType,
        assetTypes: tpl.assetTypes,
        jurisdictions: [],
        isSystem: true,
        isActive: true,
        estimatedDays: tpl.estimatedDays,
        orgId: null,
        steps: {
          create: tpl.steps.map((s) => ({
            stepOrder: s.order,
            name: s.name,
            stepType: s.type,
            requiresApproval: s.requiresApproval ?? false,
            approverRoles: s.approverRoles ?? [],
            dueDaysFromStart: s.dueDaysFromStart,
            dependsOnOrders: s.dependsOnOrders ?? [],
            isRequired: true,
          })),
        },
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createWorkflow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new Workflow (DRAFT) and instantiates all template steps.
 */
export async function createWorkflow(input: WorkflowCreateInput): Promise<Workflow> {
  // 1. Find the best matching template
  let template;

  if (input.templateCode) {
    template = await db.workflowTemplate.findUnique({
      where: { code: input.templateCode },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });
    if (!template) {
      throw new Error(`Workflow template not found: ${input.templateCode}`);
    }
  } else {
    // Look up asset type to find the best match
    const asset = await db.asset.findUnique({
      where: { id: input.assetId },
      select: { assetType: true },
    });

    if (!asset) {
      throw new Error(`Asset not found: ${input.assetId}`);
    }

    // Prefer templates matching workflowType + assetType, fall back to any matching workflowType
    const candidates = await db.workflowTemplate.findMany({
      where: {
        workflowType: input.workflowType,
        isActive: true,
        isSystem: true,
      },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    });

    if (candidates.length === 0) {
      throw new Error(`No active template found for workflowType: ${input.workflowType}`);
    }

    // Prefer templates that list this assetType; otherwise take first match
    const assetTypeStr = asset.assetType as string;
    const specific = candidates.find((c) => c.assetTypes.includes(assetTypeStr));
    template = specific ?? candidates[0];
  }

  // 2. Create the Workflow record
  const now = new Date();
  const workflow = await db.workflow.create({
    data: {
      orgId: input.orgId,
      assetId: input.assetId,
      templateId: template.id,
      workflowType: input.workflowType,
      status: WorkflowStatus.DRAFT,
      title: input.title,
      titleJa: input.titleJa,
      description: input.description,
      targetDate: input.targetDate,
      createdById: input.createdById ?? "",
      linkedRiskEventIds: input.linkedRiskEventIds ?? [],
      notes: input.notes,
    },
  });

  // 3. Instantiate template steps
  // First pass: create all steps without dependsOnStepIds so we get their IDs
  const estimatedDays = template.estimatedDays ?? 0;

  // Calculate due dates
  // dueDate = targetDate - (estimatedDays - dueDaysFromStart) OR startedAt + dueDaysFromStart
  const calculateDueDate = (dueDaysFromStart: number): Date | null => {
    if (input.targetDate) {
      const daysOffset = estimatedDays - dueDaysFromStart;
      return addDays(input.targetDate, -daysOffset);
    }
    // No targetDate yet; use creation time + offset
    return addDays(now, dueDaysFromStart);
  };

  // First pass: create all steps, collect order → id mapping
  const orderToStepId = new Map<number, string>();

  for (const tplStep of template.steps) {
    const dueDate = calculateDueDate(tplStep.dueDaysFromStart ?? 0);
    const hasDeps = tplStep.dependsOnOrders.length > 0;
    const initialStatus = hasDeps ? StepStatus.NOT_STARTED : StepStatus.NOT_STARTED;

    const step = await db.workflowStep.create({
      data: {
        workflowId: workflow.id,
        stepOrder: tplStep.stepOrder,
        name: tplStep.name,
        nameJa: tplStep.nameJa ?? null,
        description: tplStep.description ?? null,
        stepType: tplStep.stepType,
        status: initialStatus,
        dueDate: dueDate,
        dependsOnStepIds: [], // will be patched in second pass
        guidanceNote: tplStep.guidanceNote ?? null,
      },
    });

    orderToStepId.set(tplStep.stepOrder, step.id);
  }

  // Second pass: resolve dependsOnOrders → actual step IDs and patch
  for (const tplStep of template.steps) {
    if (tplStep.dependsOnOrders.length === 0) continue;

    const stepId = orderToStepId.get(tplStep.stepOrder);
    if (!stepId) continue;

    const depIds = tplStep.dependsOnOrders
      .map((order) => orderToStepId.get(order))
      .filter((id): id is string => id !== undefined);

    await db.workflowStep.update({
      where: { id: stepId },
      data: { dependsOnStepIds: depIds },
    });
  }

  // Return the workflow with steps
  const result = await db.workflow.findUniqueOrThrow({
    where: { id: workflow.id },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return result as Workflow;
}

// ─────────────────────────────────────────────────────────────────────────────
// startWorkflow
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sets workflow to ACTIVE and advances all steps with no dependencies to IN_PROGRESS.
 */
export async function startWorkflow(workflowId: string): Promise<Workflow> {
  const now = new Date();

  await db.workflow.update({
    where: { id: workflowId },
    data: {
      status: WorkflowStatus.ACTIVE,
      startedAt: now,
    },
  });

  // Advance all steps with no dependencies to IN_PROGRESS
  const steps = await db.workflowStep.findMany({
    where: { workflowId },
    orderBy: { stepOrder: "asc" },
  });

  for (const step of steps) {
    if (step.dependsOnStepIds.length === 0) {
      const isOverdue = step.dueDate != null && step.dueDate < now;
      await db.workflowStep.update({
        where: { id: step.id },
        data: {
          status: isOverdue ? StepStatus.OVERDUE : StepStatus.IN_PROGRESS,
          startedAt: now,
        },
      });
    }
  }

  const result = await db.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  return result as Workflow;
}

// ─────────────────────────────────────────────────────────────────────────────
// completeStep
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks a step as COMPLETE, unblocks any dependent steps whose all prerequisites
 * are now satisfied, and closes the workflow if all required steps are done.
 *
 * The second argument may be either a `completedBy` string (canonical form) or
 * an options object `{ completedBy?, note? }` (used by route handlers that were
 * scaffolded before the engine was finalised).
 */
export async function completeStep(
  stepId: string,
  completedByOrOptions?: string | { completedBy?: string; note?: string },
  noteArg?: string
): Promise<StepAdvanceResult> {
  let completedBy: string;
  let note: string | undefined;

  if (typeof completedByOrOptions === "string") {
    completedBy = completedByOrOptions;
    note = noteArg;
  } else if (completedByOrOptions && typeof completedByOrOptions === "object") {
    completedBy = completedByOrOptions.completedBy ?? "";
    note = completedByOrOptions.note;
  } else {
    completedBy = "";
    note = noteArg;
  }
  const now = new Date();

  // 1. Mark this step as COMPLETE
  await db.workflowStep.update({
    where: { id: stepId },
    data: {
      status: StepStatus.COMPLETE,
      completedAt: now,
      completedBy,
      completionNote: note ?? null,
    },
  });

  // Load the step to get workflowId
  const completedStep = await db.workflowStep.findUniqueOrThrow({
    where: { id: stepId },
  });

  // Load all steps in the workflow
  const allSteps = await db.workflowStep.findMany({
    where: { workflowId: completedStep.workflowId },
    orderBy: { stepOrder: "asc" },
  });

  const stepMap = new Map(allSteps.map((s) => [s.id, s]));
  const nextStepsUnblocked: string[] = [];

  // 2. Find dependents of this step and check if they can now start
  const dependents = allSteps.filter(
    (s) =>
      s.dependsOnStepIds.includes(stepId) &&
      (s.status === StepStatus.NOT_STARTED || s.status === StepStatus.BLOCKED)
  );

  for (const dep of dependents) {
    // Check if ALL its dependencies are now COMPLETE or SKIPPED
    const allDepsDone = dep.dependsOnStepIds.every((depId) => {
      const depStep = stepMap.get(depId);
      return (
        depStep?.status === StepStatus.COMPLETE ||
        depStep?.status === StepStatus.SKIPPED
      );
    });

    if (allDepsDone) {
      const isOverdue = dep.dueDate != null && dep.dueDate < now;
      await db.workflowStep.update({
        where: { id: dep.id },
        data: {
          status: isOverdue ? StepStatus.OVERDUE : StepStatus.IN_PROGRESS,
          startedAt: now,
          blockedReason: null,
        },
      });
      nextStepsUnblocked.push(dep.id);
    }
  }

  // 3. Reload all steps to check workflow completion
  const refreshedSteps = await db.workflowStep.findMany({
    where: { workflowId: completedStep.workflowId },
  });

  // Workflow is complete if all required steps (not SKIPPED) are COMPLETE
  // We treat "required" as steps that are not SKIPPED — any non-COMPLETE, non-SKIPPED
  // step means the workflow is still running
  const workflowComplete = refreshedSteps.every(
    (s) => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED
  );

  if (workflowComplete) {
    await db.workflow.update({
      where: { id: completedStep.workflowId },
      data: {
        status: WorkflowStatus.COMPLETED,
        completedAt: now,
      },
    });
  }

  return {
    stepId,
    newStatus: StepStatus.COMPLETE,
    nextStepsUnblocked,
    workflowComplete,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getWorkflowStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a full status summary for the workflow.
 */
export async function getWorkflowStatus(
  workflowId: string
): Promise<WorkflowStatusSummary> {
  const workflow = await db.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  const steps = (workflow as Workflow & { steps: WorkflowStep[] }).steps;
  const now = new Date();

  const totalSteps = steps.length;
  const completedSteps = steps.filter(
    (s) => s.status === StepStatus.COMPLETE || s.status === StepStatus.SKIPPED
  ).length;
  const blockedSteps = steps.filter((s) => s.status === StepStatus.BLOCKED).length;
  const overdueSteps = steps.filter(
    (s) =>
      s.status !== StepStatus.COMPLETE &&
      s.status !== StepStatus.SKIPPED &&
      s.dueDate != null &&
      s.dueDate < now
  ).length;

  const nextActionStep =
    steps.find((s) => s.status === StepStatus.IN_PROGRESS) ?? null;

  // Estimate completion: find the latest dueDate among incomplete steps
  const remainingDueDates = steps
    .filter(
      (s) =>
        s.status !== StepStatus.COMPLETE &&
        s.status !== StepStatus.SKIPPED &&
        s.dueDate != null
    )
    .map((s) => s.dueDate as Date);

  const estimatedCompletion =
    remainingDueDates.length > 0
      ? new Date(Math.max(...remainingDueDates.map((d) => d.getTime())))
      : null;

  const blockingReasons: string[] = steps
    .filter((s) => s.status === StepStatus.BLOCKED && s.blockedReason)
    .map((s) => `Step "${s.name}": ${s.blockedReason}`);

  const isBlocked = blockedSteps > 0;

  return {
    workflow: workflow as Workflow,
    totalSteps,
    completedSteps,
    blockedSteps,
    overdueSteps,
    nextActionStep: nextActionStep as WorkflowStep | null,
    estimatedCompletion,
    isBlocked,
    blockingReasons,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// analyzeWorkflowWithAI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls Claude to analyse the current workflow state and returns actionable suggestions.
 * Persists result to workflow.aiSuggestions and workflow.aiAnalyzedAt.
 */
export async function analyzeWorkflowWithAI(
  workflowId: string
): Promise<{ suggestions: string; analyzedAt: Date }> {
  const client = getAnthropicClient();
  const now = new Date();

  const workflow = await db.workflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });

  const steps = (workflow as Workflow & { steps: WorkflowStep[] }).steps;

  // Build step summary lines
  const stepLines = steps.map((s) => {
    const due = s.dueDate
      ? `due ${s.dueDate.toISOString().slice(0, 10)}`
      : "no due date";
    const overdue =
      s.dueDate != null &&
      s.dueDate < now &&
      s.status !== StepStatus.COMPLETE &&
      s.status !== StepStatus.SKIPPED
        ? " [OVERDUE]"
        : "";
    const blocked =
      s.status === StepStatus.BLOCKED && s.blockedReason
        ? ` [BLOCKED: ${s.blockedReason}]`
        : "";
    const owner = s.ownerId ? ` owner=${s.ownerId}` : "";
    return `  ${s.stepOrder}. [${s.status}] ${s.name} (${s.stepType}, ${due}${overdue}${blocked}${owner})`;
  }).join("\n");

  const blockedLines = steps
    .filter((s) => s.status === StepStatus.BLOCKED && s.blockedReason)
    .map((s) => `  - "${s.name}": ${s.blockedReason}`)
    .join("\n");

  const overdueLines = steps
    .filter(
      (s) =>
        s.dueDate != null &&
        s.dueDate < now &&
        s.status !== StepStatus.COMPLETE &&
        s.status !== StepStatus.SKIPPED
    )
    .map((s) => `  - "${s.name}" was due ${s.dueDate!.toISOString().slice(0, 10)}`)
    .join("\n");

  const targetDateStr = workflow.targetDate
    ? workflow.targetDate.toISOString().slice(0, 10)
    : "not set";

  const userMessage = `You are reviewing an institutional real estate workflow for a Japanese investment firm.

Workflow: ${workflow.title}
Type: ${workflow.workflowType}
Status: ${workflow.status}
Target completion date: ${targetDateStr}
Today: ${now.toISOString().slice(0, 10)}

Steps:
${stepLines}
${blockedLines ? `\nBlocked steps:\n${blockedLines}` : ""}
${overdueLines ? `\nOverdue steps:\n${overdueLines}` : ""}

Provide a concise operational analysis with exactly these three sections:
1. Immediate attention (2–3 bullet points): which steps need action right now and why.
2. Schedule risk: flag any blockers or overdue items that may delay the target date.
3. Next actions (2 bullet points): the two most important operational actions the team should take today.

Rules:
- NEVER invent facts not present in the data above.
- NEVER auto-resolve or change any step status.
- Be concise and actionable. No preamble, no sign-off.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }

  const suggestions = content.text;

  // Persist to workflow record
  await db.workflow.update({
    where: { id: workflowId },
    data: {
      aiSuggestions: suggestions,
      aiAnalyzedAt: now,
    },
  });

  return { suggestions, analyzedAt: now };
}
