import type { Env } from "../env";
import { sessionUser } from "../auth";

const DEFAULT_QUOTA = 10 * 1024 ** 3;

const UNIT: Record<string, number> = {
  b: 1,
  kb: 1024,
  kib: 1024,
  mb: 1024 ** 2,
  mib: 1024 ** 2,
  gb: 1024 ** 3,
  gib: 1024 ** 3,
  tb: 1024 ** 4,
  tib: 1024 ** 4,
};

export function parseQuota(raw?: string): number {
  if (!raw) return DEFAULT_QUOTA;
  const s = raw.trim();
  const m = /^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb|tb|kib|mib|gib|tib)?$/i.exec(s);
  if (!m) {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_QUOTA;
  }
  const n = Number(m[1]);
  const unit = (m[2] || "b").toLowerCase();
  const mul = UNIT[unit] ?? 1;
  return Number.isFinite(n) && n > 0 ? n * mul : DEFAULT_QUOTA;
}

async function sumBucket(bucket: R2Bucket): Promise<{ usedBytes: number; objectCount: number }> {
  let usedBytes = 0;
  let objectCount = 0;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ limit: 1000, cursor });
    for (const obj of page.objects) {
      usedBytes += obj.size;
      objectCount += 1;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return { usedBytes, objectCount };
}

export async function handleUsageApi(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }
  if (!(await sessionUser(request, env))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!env.BUCKET) {
    return Response.json({ error: "no_bucket" }, { status: 503 });
  }

  const { usedBytes, objectCount } = await sumBucket(env.BUCKET);
  return Response.json(
    {
      usedBytes,
      quotaBytes: parseQuota(env.STORAGE_QUOTA),
      objectCount,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
