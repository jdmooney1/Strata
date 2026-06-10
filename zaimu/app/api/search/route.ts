import { NextRequest } from "next/server";
import { db } from "@/lib/db";

const ORG_ID = "org_sanyo_001";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return Response.json({ results: [] });

  const term = q.toLowerCase();

  const [assets, workflows, reports, tasks] = await Promise.all([
    db.asset.findMany({
      where: {
        orgId: ORG_ID,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { nameJa: { contains: q, mode: "insensitive" } },
          { city: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, nameJa: true, city: true, country: true, assetType: true },
      take: 5,
    }),
    db.workflow.findMany({
      where: {
        orgId: ORG_ID,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, status: true, workflowType: true },
      take: 5,
    }),
    db.report.findMany({
      where: {
        orgId: ORG_ID,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, reportType: true, status: true },
      take: 5,
    }),
    db.task.findMany({
      where: {
        orgId: ORG_ID,
        status: { notIn: ["COMPLETE", "CANCELLED"] },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, priority: true, dueDate: true, assetId: true },
      take: 5,
    }),
  ]);

  const results = [
    ...assets.map(a => ({ kind: "asset" as const, id: a.id, label: a.name, sublabel: `${a.city} · ${a.assetType}`, href: `/assets/${a.id}` })),
    ...workflows.map(w => ({ kind: "workflow" as const, id: w.id, label: w.title, sublabel: `${w.workflowType} · ${w.status}`, href: `/workflows/${w.id}` })),
    ...reports.map(r => ({ kind: "report" as const, id: r.id, label: r.title, sublabel: r.reportType, href: `/reports/${r.id}` })),
    ...tasks.map(t => ({ kind: "task" as const, id: t.id, label: t.title, sublabel: `${t.priority} priority`, href: `/tasks` })),
  ].filter(r => r.label.toLowerCase().includes(term) || r.sublabel.toLowerCase().includes(term));

  return Response.json({ results });
}
