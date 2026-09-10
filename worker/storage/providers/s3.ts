import { parseListXml, s3Fetch, s3List, type S3Target } from "../s3-client";
import type {
  FileEntry,
  MultipartHandle,
  StorageProvider,
  StoredObject,
  WriteOptions,
} from "../types";

function metaHeaders(options?: WriteOptions): Record<string, string> {
  const h: Record<string, string> = {};
  const http = options?.httpMetadata;
  let ct: string | undefined;
  if (http instanceof Headers) ct = http.get("content-type") || undefined;
  else if (http) ct = http.contentType;
  if (ct) h["content-type"] = ct;
  if (options?.customMetadata?.thumbnail) {
    h["x-amz-meta-thumbnail"] = options.customMetadata.thumbnail;
  }
  return h;
}

function fromHead(key: string, res: Response): FileEntry {
  const lm = res.headers.get("last-modified");
  return {
    key,
    size: Number(res.headers.get("content-length") || 0),
    uploaded: lm ? new Date(lm) : new Date(),
    etag: (res.headers.get("etag") || "").replace(/"/g, ""),
    httpMetadata: { contentType: res.headers.get("content-type") || undefined },
    customMetadata: res.headers.get("x-amz-meta-thumbnail")
      ? { thumbnail: res.headers.get("x-amz-meta-thumbnail")! }
      : undefined,
  };
}

export class S3Provider implements StorageProvider {
  readonly type = "s3" as const;
  constructor(
    readonly id: string,
    private target: S3Target
  ) {}

  async *list(prefix: string | undefined, recursive: boolean) {
    let token: string | undefined;
    do {
      const xml = await s3List(
        this.target,
        prefix,
        recursive ? undefined : "/",
        token
      );
      const page = parseListXml(xml);
      for (const obj of page.objects) {
        if (obj.key.startsWith("_$flaredrive$/")) continue;
        yield {
          key: obj.key,
          size: obj.size,
          uploaded: obj.lastModified ? new Date(obj.lastModified) : new Date(),
          etag: obj.etag,
          httpMetadata: {
            contentType: obj.key.endsWith("/")
              ? "application/x-directory"
              : undefined,
          },
        } as FileEntry;
      }
      for (const p of page.prefixes) {
        const key = p.replace(/\/$/, "");
        if (key.startsWith("_$flaredrive$")) continue;
        yield {
          key,
          size: 0,
          uploaded: new Date(0),
          httpMetadata: { contentType: "application/x-directory" },
        };
      }
      token = page.truncated ? page.next : undefined;
    } while (token);
  }

  async head(key: string): Promise<FileEntry | null> {
    const res = await s3Fetch(this.target, "HEAD", key);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return fromHead(key, res);
  }

  async get(key: string): Promise<StoredObject | null> {
    const res = await s3Fetch(this.target, "GET", key);
    if (res.status === 404 || !res.body) return null;
    if (!res.ok) return null;
    const entry = fromHead(key, res);
    return {
      ...entry,
      body: res.body,
      writeHttpMetadata: (h) => {
        const ct = res.headers.get("content-type");
        if (ct) h.set("content-type", ct);
        const lm = res.headers.get("last-modified");
        if (lm) h.set("last-modified", lm);
        const etag = res.headers.get("etag");
        if (etag) h.set("etag", etag);
      },
    };
  }

  async put(key: string, body: ReadableStream | ArrayBuffer | Blob | string | null, options?: WriteOptions) {
    const res = await s3Fetch(this.target, "PUT", key, {
      headers: metaHeaders(options),
      body: body as BodyInit | null,
    });
    return { ok: res.ok };
  }

  async delete(key: string) {
    const res = await s3Fetch(this.target, "DELETE", key);
    if (!res.ok && res.status !== 404) throw new Error(`s3_delete_${res.status}`);
  }

  async copy(source: string, destination: string) {
    const src = `${this.target.bucket}/${source}`;
    const res = await s3Fetch(this.target, "PUT", destination, {
      headers: { "x-amz-copy-source": encodeURI(src) },
    });
    if (!res.ok) throw new Error(`s3_copy_${res.status}`);
  }

  async createMultipart(key: string, options?: WriteOptions): Promise<MultipartHandle> {
    const res = await s3Fetch(this.target, "POST", key, {
      query: "uploads",
      headers: metaHeaders(options),
    });
    const xml = await res.text();
    const uploadId = xml.match(/<UploadId>([\s\S]*?)<\/UploadId>/)?.[1];
    if (!res.ok || !uploadId) throw new Error(`s3_mp_create_${res.status}`);
    return this.resumeMultipart(key, uploadId);
  }

  resumeMultipart(key: string, uploadId: string): MultipartHandle {
    const t = this.target;
    return {
      key,
      uploadId,
      uploadPart: async (partNumber, body) => {
        const res = await s3Fetch(t, "PUT", key, {
          query: `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`,
          body: body as BodyInit,
        });
        if (!res.ok) throw new Error(`s3_part_${res.status}`);
        return { etag: (res.headers.get("etag") || "").replace(/"/g, "") };
      },
      complete: async (parts) => {
        const xml =
          `<CompleteMultipartUpload>` +
          parts
            .map(
              (p) =>
                `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>"${p.etag}"</ETag></Part>`
            )
            .join("") +
          `</CompleteMultipartUpload>`;
        const res = await s3Fetch(t, "POST", key, {
          query: `uploadId=${encodeURIComponent(uploadId)}`,
          headers: { "content-type": "application/xml" },
          body: xml,
        });
        if (!res.ok) throw new Error(`s3_mp_complete_${res.status}`);
        return { etag: res.headers.get("etag") || undefined };
      },
    };
  }
}

export async function testS3(t: S3Target): Promise<{ ok: boolean; error?: string }> {
  try {
    await s3List(t, undefined, "/", undefined);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}
