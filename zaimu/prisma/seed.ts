/**
 * Seed script — development only.
 * Creates representative data for Sanyo Capital Holdings.
 * Run via: npx tsx prisma/seed.ts
 * Or via:  npx prisma db seed
 */

import "dotenv/config";
import { db } from "@/lib/db";

export async function main() {
  console.log("Seeding database...");

  // ── Organisation ────────────────────────────────────────────────────────────
  const org = await db.organisation.upsert({
    where: { id: "org_sanyo_001" },
    update: {},
    create: {
      id: "org_sanyo_001",
      name: "Sanyo Capital Holdings",
      nameJa: "三洋キャピタルホールディングス",
      type: "CORPORATE",
      country: "JP",
      timezone: "Asia/Tokyo",
      currency: "JPY",
    },
  });

  console.log("  + Organisation:", org.name);

  // ── User ────────────────────────────────────────────────────────────────────
  const user = await db.user.upsert({
    where: { email: "admin@sanyocapital.co.jp" },
    update: {},
    create: {
      id: "user_admin_001",
      orgId: org.id,
      email: "admin@sanyocapital.co.jp",
      name: "Kenji Tanaka",
      nameJa: "田中健二",
      role: "ADMIN",
      language: "ja",
    },
  });

  console.log("  + User:", user.email, "(", user.role, ")");

  // ── Portfolio ────────────────────────────────────────────────────────────────
  const portfolio = await db.portfolio.upsert({
    where: { id: "portfolio_apac_001" },
    update: {},
    create: {
      id: "portfolio_apac_001",
      orgId: org.id,
      name: "APAC Core Office Fund",
      nameJa: "アジア太平洋コアオフィスファンド",
      description: "Institutional-grade office assets across major APAC gateway cities.",
      targetAum: 500000000,
      currency: "AUD",
    },
  });

  console.log("  + Portfolio:", portfolio.name);

  // ── Asset ────────────────────────────────────────────────────────────────────
  const asset = await db.asset.upsert({
    where: { id: "asset_collins_001" },
    update: {},
    create: {
      id: "asset_collins_001",
      orgId: org.id,
      portfolioId: portfolio.id,
      name: "Collins Square Tower 5",
      nameJa: "コリンズスクエア・タワー5",
      assetType: "OFFICE",
      status: "ACTIVE",
      country: "AU",
      city: "Melbourne",
      address: "727 Collins Street, Docklands VIC 3008",
      totalArea: 42000,
      areaUnit: "sqm",
      currency: "AUD",
      acquisitionDate: new Date("2019-11-01"),
      acquisitionCost: 420000000,
      acquisitionFx: 71.2,
      currentValuation: 435000000,
      lastValuationDate: new Date("2025-03-31"),
      occupancyRate: 94.2,
      operationalScore: 82,
      reportingScore: 85,
      covenantStatus: "COMPLIANT",
      refinancingDate: new Date("2026-08-30"),
    },
  });

  console.log("  + Asset:", asset.name);

  // ── Loan ────────────────────────────────────────────────────────────────────
  const loan = await db.loan.upsert({
    where: { id: "loan_anz_collins_001" },
    update: {},
    create: {
      id: "loan_anz_collins_001",
      assetId: asset.id,
      lenderName: "ANZ Bank",
      loanType: "SENIOR",
      currency: "AUD",
      originalBalance: 81400000,
      currentBalance: 81400000,
      interestRate: 0.0350,
      rateType: "FLOATING",
      margin: 0.0175,
      benchmark: "BBSY",
      originationDate: new Date("2021-09-01"),
      maturityDate: new Date("2026-08-30"),
      ltv: 18.7,
      dscr: 2.41,
      status: "CURRENT",
    },
  });

  console.log("  + Loan:", loan.lenderName, "AUD", Number(loan.originalBalance).toLocaleString());

  // ── Covenants ────────────────────────────────────────────────────────────────
  await db.loanCovenant.upsert({
    where: { id: "cov_ltv_collins_001" },
    update: {},
    create: {
      id: "cov_ltv_collins_001",
      loanId: loan.id,
      covenantType: "LTV",
      description: "Loan-to-Value ratio must not exceed 60%",
      threshold: "60.00%",
      currentValue: "18.70%",
      status: "COMPLIANT",
      testFreq: "SEMI_ANNUAL",
      nextTestDate: new Date("2025-09-30"),
    },
  });

  await db.loanCovenant.upsert({
    where: { id: "cov_dscr_collins_001" },
    update: {},
    create: {
      id: "cov_dscr_collins_001",
      loanId: loan.id,
      covenantType: "DSCR",
      description: "Debt Service Coverage Ratio must be at least 1.25x",
      threshold: "1.25x",
      currentValue: "2.41x",
      status: "COMPLIANT",
      testFreq: "ANNUAL",
      nextTestDate: new Date("2025-12-31"),
    },
  });

  console.log("  + Covenants: LTV <=60% (COMPLIANT 18.7%), DSCR >=1.25x (COMPLIANT 2.41x)");

  // ── Covenant Test Results — 4 quarters of history ────────────────────────────

  // LTV test results (threshold <=60%, lower is better — values trending upward toward threshold)
  const ltvTestResults = [
    { id: "ctr_ltv_001_q1", testedAt: new Date("2025-03-31"), value: "41.20%", status: "COMPLIANT" as const },
    { id: "ctr_ltv_001_q2", testedAt: new Date("2025-06-30"), value: "43.80%", status: "COMPLIANT" as const },
    { id: "ctr_ltv_001_q3", testedAt: new Date("2025-09-30"), value: "47.10%", status: "COMPLIANT" as const },
    { id: "ctr_ltv_001_q4", testedAt: new Date("2025-12-31"), value: "49.30%", status: "COMPLIANT" as const },
  ];

  for (const r of ltvTestResults) {
    await db.covenantTestResult.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        covenantId: "cov_ltv_collins_001",
        testedAt: r.testedAt,
        value: r.value,
        status: r.status,
      },
    });
  }

  // DSCR test results (threshold >=1.25x, higher is better — values trending down toward threshold)
  const dscrTestResults = [
    { id: "ctr_dscr_001_q1", testedAt: new Date("2025-03-31"), value: "2.41x", status: "COMPLIANT" as const },
    { id: "ctr_dscr_001_q2", testedAt: new Date("2025-06-30"), value: "2.18x", status: "COMPLIANT" as const },
    { id: "ctr_dscr_001_q3", testedAt: new Date("2025-09-30"), value: "1.89x", status: "COMPLIANT" as const },
    { id: "ctr_dscr_001_q4", testedAt: new Date("2025-12-31"), value: "1.72x", status: "COMPLIANT" as const },
  ];

  for (const r of dscrTestResults) {
    await db.covenantTestResult.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        covenantId: "cov_dscr_collins_001",
        testedAt: r.testedAt,
        value: r.value,
        status: r.status,
      },
    });
  }

  console.log("  + Covenant test results: LTV (4 quarters, 41.2% → 49.3%), DSCR (4 quarters, 2.41x → 1.72x)");

  // ── Leases ──────────────────────────────────────────────────────────────────
  await db.lease.upsert({
    where: { id: "lease_nab_collins_001" },
    update: {},
    create: {
      id: "lease_nab_collins_001",
      assetId: asset.id,
      tenantName: "National Australia Bank Limited",
      tenantNameJa: "ナショナル・オーストラリア銀行",
      floor: "Levels 1-18",
      area: 32000,
      areaUnit: "sqm",
      currency: "AUD",
      baseRent: 1760000,
      rentFrequency: "MONTHLY",
      leaseStart: new Date("2020-01-01"),
      leaseEnd: new Date("2030-12-31"),
      renewalWindow: new Date("2030-06-30"),
      renewalOptions: "Two x 5-year options at market rent",
      status: "ACTIVE",
      securityDeposit: 5280000,
      notes: "Anchor tenant. Lease runs to 2030 with renewal options.",
    },
  });

  await db.lease.upsert({
    where: { id: "lease_small_collins_001" },
    update: {},
    create: {
      id: "lease_small_collins_001",
      assetId: asset.id,
      tenantName: "Meridian Advisory Group",
      tenantNameJa: "メリディアン・アドバイザリー・グループ",
      floor: "Level 19, Suite 1901",
      area: 850,
      areaUnit: "sqm",
      currency: "AUD",
      baseRent: 46750,
      rentFrequency: "MONTHLY",
      leaseStart: new Date("2023-03-01"),
      leaseEnd: new Date("2026-02-28"),
      breakDate: new Date("2025-02-28"),
      status: "ACTIVE",
      securityDeposit: 140250,
      notes: "Small tenant. Break clause Feb 2025 not yet exercised.",
    },
  });

  console.log("  + Leases: NAB anchor (32,000 sqm), Meridian Advisory (850 sqm)");

  // ── Document ─────────────────────────────────────────────────────────────────
  const document = await db.document.upsert({
    where: { id: "doc_pm_collins_q1_2025" },
    update: {},
    create: {
      id: "doc_pm_collins_q1_2025",
      orgId: org.id,
      assetId: asset.id,
      name: "Collins Square Tower 5 — Q1 2025 PM Report",
      nameJa: "コリンズスクエア・タワー5 — 2025年Q1 PMレポート",
      docType: "PM_REPORT",
      status: "PENDING",
      mimeType: "application/pdf",
      tags: ["pm-report", "q1-2025", "melbourne"],
      parties: ["JLL Property Management", "ANZ Bank", "National Australia Bank"],
    },
  });

  console.log("  + Document:", document.name, "(", document.status, ")");

  // ── Tasks ────────────────────────────────────────────────────────────────────
  await db.task.upsert({
    where: { id: "task_pm_review_001" },
    update: {},
    create: {
      id: "task_pm_review_001",
      orgId: org.id,
      assetId: asset.id,
      title: "Review Q1 2025 PM Report — Collins Square",
      titleJa: "2025年Q1 PMレポートのレビュー — コリンズスクエア",
      description: "Review and approve the Q1 2025 property management report from JLL. Check occupancy, NOI, and any maintenance items.",
      category: "PM_REVIEW",
      priority: "HIGH",
      status: "OPEN",
      creatorId: user.id,
      assigneeId: user.id,
      dueDate: new Date("2025-06-15"),
      tags: ["pm-report", "q1-2025"],
    },
  });

  await db.task.upsert({
    where: { id: "task_covenant_test_001" },
    update: {},
    create: {
      id: "task_covenant_test_001",
      orgId: org.id,
      assetId: asset.id,
      title: "Prepare Sep 2025 Covenant Test Package — ANZ",
      titleJa: "2025年9月コベナンツ・テストパッケージの準備 — ANZ",
      description: "Prepare LTV and DSCR covenant test certificates for ANZ semi-annual review due September 2025.",
      category: "COVENANT",
      priority: "MEDIUM",
      status: "OPEN",
      creatorId: user.id,
      assigneeId: user.id,
      dueDate: new Date("2025-09-15"),
      tags: ["covenant", "anz", "semi-annual"],
    },
  });

  await db.task.upsert({
    where: { id: "task_lease_renewal_001" },
    update: {},
    create: {
      id: "task_lease_renewal_001",
      orgId: org.id,
      assetId: asset.id,
      title: "Commence Meridian Advisory Lease Renewal Discussions",
      titleJa: "メリディアン・アドバイザリーのリース更新交渉の開始",
      description: "Meridian Advisory lease expires Feb 2026. Initiate renewal discussions or prepare for re-letting.",
      category: "LEASE_MANAGEMENT",
      priority: "MEDIUM",
      status: "OPEN",
      creatorId: user.id,
      assigneeId: user.id,
      dueDate: new Date("2025-08-31"),
      tags: ["lease-renewal", "meridian"],
    },
  });

  console.log("  + Tasks: PM review, covenant test, lease renewal");

  // ── Alerts ───────────────────────────────────────────────────────────────────
  await db.alert.upsert({
    where: { id: "alert_loan_maturity_001" },
    update: {},
    create: {
      id: "alert_loan_maturity_001",
      assetId: asset.id,
      alertType: "LOAN_MATURITY",
      severity: "MEDIUM",
      title: "Loan Maturity in 15 Months — ANZ Collins Square",
      titleJa: "ローン満期まで15ヶ月 — ANZ コリンズスクエア",
      message: "The ANZ senior loan for Collins Square Tower 5 matures on 30 August 2026. Refinancing process should commence by Q4 2025.",
      messageJa: "コリンズスクエア・タワー5のANZシニアローンは2026年8月30日に満期を迎えます。2025年Q4までに借り換えプロセスを開始する必要があります。",
      resolved: false,
      metadata: {
        loanId: loan.id,
        maturityDate: "2026-08-30",
        currentBalance: 81400000,
        currency: "AUD",
      },
    },
  });

  await db.alert.upsert({
    where: { id: "alert_occupancy_stable_001" },
    update: {},
    create: {
      id: "alert_occupancy_stable_001",
      assetId: asset.id,
      alertType: "OCCUPANCY_DROP",
      severity: "INFO",
      title: "Occupancy Stable at 94.2% — Collins Square",
      titleJa: "稼働率94.2%で安定推移 — コリンズスクエア",
      message: "Occupancy at Collins Square Tower 5 remains stable at 94.2% as of Q1 2025. NAB anchor lease provides strong base.",
      messageJa: "コリンズスクエア・タワー5の稼働率は2025年Q1時点で94.2%と安定しています。NABのアンカー・リースが強固な基盤を提供しています。",
      resolved: true,
      resolvedAt: new Date("2025-04-15"),
      metadata: {
        occupancyRate: 94.2,
        reportPeriod: "Q1 2025",
      },
    },
  });

  console.log("  + Alerts: loan maturity (MEDIUM), occupancy stable (INFO)");

  // ── FX Rates ─────────────────────────────────────────────────────────────────
  const fxRateDate = new Date("2025-05-01");

  await db.fxRate.upsert({
    where: {
      orgId_baseCurrency_quoteCurrency_rateDate: {
        orgId: org.id,
        baseCurrency: "USD",
        quoteCurrency: "JPY",
        rateDate: fxRateDate,
      },
    },
    update: {},
    create: {
      orgId: org.id,
      baseCurrency: "USD",
      quoteCurrency: "JPY",
      rate: 155.40,
      source: "MANUAL",
      rateDate: fxRateDate,
    },
  });

  await db.fxRate.upsert({
    where: {
      orgId_baseCurrency_quoteCurrency_rateDate: {
        orgId: org.id,
        baseCurrency: "AUD",
        quoteCurrency: "JPY",
        rateDate: fxRateDate,
      },
    },
    update: {},
    create: {
      orgId: org.id,
      baseCurrency: "AUD",
      quoteCurrency: "JPY",
      rate: 101.85,
      source: "MANUAL",
      rateDate: fxRateDate,
    },
  });

  console.log("  + FX Rates: USDJPY 155.40, AUDJPY 101.85 (2025-05-01)");

  // ── Institutional Memory ─────────────────────────────────────────────────────
  await db.institutionalMemory.upsert({
    where: { id: "memory_acquisition_rationale_001" },
    update: {},
    create: {
      id: "memory_acquisition_rationale_001",
      orgId: org.id,
      assetId: asset.id,
      userId: user.id,
      memoryType: "INVESTMENT_RATIONALE",
      title: "Collins Square T5 Acquisition Rationale — Nov 2019",
      titleJa: "コリンズスクエア T5 取得の合理性 — 2019年11月",
      content: "Collins Square Tower 5 was acquired in November 2019 for AUD 420M at a 5.25% initial yield. The investment thesis centred on the NAB anchor tenancy (15-year lease from 2020), Docklands precinct infrastructure investment, and Melbourne CBD office supply constraints. The Board approved the acquisition at a price 2.1% below the independent valuation of AUD 429M.",
      contentJa: "コリンズスクエア・タワー5は2019年11月に4億2,000万豪ドルで取得しました。初回利回りは5.25%です。投資の根拠は、NABのアンカーテナント（2020年から15年リース）、ドックランド地区のインフラ投資、およびメルボルンCBDのオフィス供給制約に基づいていました。取締役会は独立鑑定評価額4億2,900万豪ドルを2.1%下回る価格での取得を承認しました。",
      tags: ["acquisition", "rationale", "nab", "2019", "melbourne"],
      importance: "HIGH",
      period: new Date("2019-11-01"),
    },
  });

  console.log("  + Institutional memory: acquisition rationale");

  console.log("\nSeed complete.");
  console.log("Organisation ID:", org.id);
  console.log("Admin user:", user.email);
  console.log("Asset:", asset.name, "| Asset ID:", asset.id);
}

// Allow direct execution
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
