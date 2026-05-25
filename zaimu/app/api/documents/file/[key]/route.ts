import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;

  // Sanitise — only allow UUID-style filenames with a simple extension
  if (!/^[\w\-]+\.\w{2,10}$/.test(key)) {
    return new Response("Not found", { status: 404 });
  }

  const LOCAL_DIR = "/tmp/zaimu-uploads";
  const filePath = path.join(LOCAL_DIR, key);

  try {
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(key).toLowerCase();
    const contentType =
      ext === ".pdf" ? "application/pdf" : "application/octet-stream";
    return new Response(buffer, { headers: { "Content-Type": contentType } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
