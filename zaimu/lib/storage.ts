// lib/storage.ts
// Abstraction over Supabase Storage (production) and local filesystem (development).

import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const BUCKET = "documents";
const LOCAL_DIR = "/tmp/zaimu-uploads";

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string
): Promise<{ key: string; url: string; size: number }> {
  const ext = path.extname(originalName);
  const key = `${randomUUID()}${ext}`;

  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(key, buffer, { contentType: mimeType, upsert: false });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
    return { key, url: data.publicUrl, size: buffer.length };
  }

  // Local fallback
  await fs.mkdir(LOCAL_DIR, { recursive: true });
  const localPath = path.join(LOCAL_DIR, key);
  await fs.writeFile(localPath, buffer);
  return { key, url: `/api/documents/file/${key}`, size: buffer.length };
}

export async function getFileBuffer(key: string): Promise<Buffer> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase.storage.from(BUCKET).download(key);
    if (error || !data) throw new Error(`Download failed: ${error?.message}`);
    return Buffer.from(await data.arrayBuffer());
  }

  // Local fallback
  const localPath = path.join(LOCAL_DIR, key);
  return fs.readFile(localPath);
}
