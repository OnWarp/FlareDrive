const encoder = new TextEncoder();

function hex(buf: ArrayBuffer | Uint8Array) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return [...u8].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer, msg: string | Uint8Array) {
  const raw = typeof msg === "string" ? encoder.encode(msg) : msg;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, raw);
}

async function sha256Hex(data: string) {
  const buf = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return hex(buf);
}

export interface S3Target {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

function objectUrl(t: S3Target, key: string, query = "") {
  const base = t.endpoint.replace(/\/$/, "");
  const path = `/${encodeURIComponent(t.bucket).replace(/%2F/g, "/")}/${key
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
  return `${base}${path}${query ? `?${query}` : ""}`;
}

export async function s3Fetch(
  t: S3Target,
  method: string,
  key: string,
  opts?: { query?: string; headers?: Record<string, string>; body?: BodyInit | null }
) {
  const url = new URL(objectUrl(t, key, opts?.query || ""));
  const headers = new Headers(opts?.headers);
  const datetime = new Date().toISOString().replace(/[:-]|\.\d+/g, "");
  const payloadHash = "UNSIGNED-PAYLOAD";
  headers.set("x-amz-date", datetime);
  headers.set("x-amz-content-sha256", payloadHash);
  headers.set("host", url.host);

  const signedKeys = [...headers.keys()]
    .filter((h) => h === "host" || h === "content-type" || h.startsWith("x-amz-"))
    .sort();
  const canonicalHeaders = signedKeys.map((k) => `${k}:${headers.get(k)}\n`).join("");
  const signedHeaders = signedKeys.join(";");
  const canonicalQuery = [...url.searchParams]
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const canonicalUri = url.pathname.replace(/[!*'()]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const hashedRequest = await sha256Hex(canonicalRequest);
  const region = t.region && t.region !== "auto" ? t.region : "us-east-1";
  const scope = `${datetime.slice(0, 8)}/${region}/s3/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${datetime}\n${scope}\n${hashedRequest}`;
  const dateKey = await hmac(encoder.encode("AWS4" + t.secretAccessKey).buffer as ArrayBuffer, datetime.slice(0, 8));
  const dateRegionKey = await hmac(dateKey, region);
  const dateServiceKey = await hmac(dateRegionKey, "s3");
  const signingKey = await hmac(dateServiceKey, "aws4_request");
  const signature = hex(await hmac(signingKey, stringToSign));
  headers.set(
    "Authorization",
    `AWS4-HMAC-SHA256 Credential=${t.accessKeyId}/${scope},SignedHeaders=${signedHeaders},Signature=${signature}`
  );
  return fetch(url.toString(), { method, headers, body: opts?.body ?? undefined });
}

export async function s3List(
  t: S3Target,
  prefix: string | undefined,
  delimiter?: string,
  continuation?: string
) {
  const params = new URLSearchParams({ "list-type": "2" });
  if (prefix) params.set("prefix", prefix);
  if (delimiter) params.set("delimiter", delimiter);
  if (continuation) params.set("continuation-token", continuation);
  const res = await s3Fetch(t, "GET", "", { query: params.toString() });
  const xml = await res.text();
  if (!res.ok) throw new Error(`s3_list_${res.status}:${xml.slice(0, 200)}`);
  return xml;
}

export function parseListXml(xml: string): {
  objects: { key: string; size: number; lastModified: string; etag: string }[];
  prefixes: string[];
  truncated: boolean;
  next?: string;
} {
  const objects: { key: string; size: number; lastModified: string; etag: string }[] = [];
  const prefixes: string[] = [];
  const contents = [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)];
  for (const m of contents) {
    const block = m[1];
    const key = block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] || "";
    const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] || 0);
    const lastModified = block.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1] || "";
    const etag = (block.match(/<ETag>([\s\S]*?)<\/ETag>/)?.[1] || "").replace(/&quot;|"/g, "");
    objects.push({ key: decodeXml(key), size, lastModified, etag });
  }
  for (const m of xml.matchAll(/<Prefix>([\s\S]*?)<\/Prefix>/g)) {
    const p = decodeXml(m[1]);
    if (p && xml.includes(`<CommonPrefixes>`) && m.input?.includes("<CommonPrefixes>")) {
      // handled below
    }
  }
  for (const m of xml.matchAll(/<CommonPrefixes>\s*<Prefix>([\s\S]*?)<\/Prefix>\s*<\/CommonPrefixes>/g)) {
    prefixes.push(decodeXml(m[1]));
  }
  const truncated = /<IsTruncated>\s*true\s*<\/IsTruncated>/i.test(xml);
  const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
  return { objects, prefixes, truncated, next: next ? decodeXml(next) : undefined };
}

function decodeXml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
