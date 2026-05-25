import { NextRequest } from "next/server";

export async function POST(_req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }
  // Dynamically import seed to avoid bundling in production
  try {
    const { main } = await import("@/prisma/seed");
    await main();
    return Response.json({ success: true, message: "Database seeded" });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
