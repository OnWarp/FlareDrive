import type {
  FileEntry,
  MultipartHandle,
  StorageProvider,
  StoredObject,
  WriteOptions,
} from "../types";

function fromR2(obj: R2Object): FileEntry {
  return {
    key: obj.key,
    size: obj.size,
    uploaded: obj.uploaded,
    etag: obj.etag,
    httpMetadata: {
      contentType: obj.httpMetadata?.contentType,
      contentDisposition: obj.httpMetadata?.contentDisposition,
      contentLanguage: obj.httpMetadata?.contentLanguage,
    },
    customMetadata: obj.customMetadata,
  };
}

function writeMeta(obj: R2Object, headers: Headers) {
  obj.writeHttpMetadata(headers);
}

export class R2Provider implements StorageProvider {
  readonly type = "r2" as const;
  constructor(
    readonly id: string,
    private bucket: R2Bucket
  ) {}

  async *list(prefix: string | undefined, recursive: boolean) {
    let cursor: string | undefined;
    do {
      const page = await this.bucket.list({
        prefix,
        delimiter: recursive ? undefined : "/",
        cursor,
        // @ts-ignore
        include: ["httpMetadata", "customMetadata"],
      });
      for (const obj of page.objects) {
        if (obj.key.startsWith("_$flaredrive$/")) continue;
        yield fromR2(obj);
      }
      if (!recursive) {
        for (const p of page.delimitedPrefixes || []) {
          const key = p.replace(/\/$/, "");
          if (key.startsWith("_$flaredrive$")) continue;
          yield {
            key,
            size: 0,
            uploaded: new Date(0),
            httpMetadata: { contentType: "application/x-directory" },
          };
        }
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
  }

  async head(key: string): Promise<FileEntry | null> {
    const obj = await this.bucket.head(key);
    return obj ? fromR2(obj) : null;
  }

  async get(key: string): Promise<StoredObject | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return {
      ...fromR2(obj),
      body: obj.body,
      writeHttpMetadata: (h) => writeMeta(obj, h),
    };
  }

  async put(key: string, body: ReadableStream | ArrayBuffer | Blob | string | null, options?: WriteOptions) {
    const result = await this.bucket.put(key, body as any, {
      httpMetadata: options?.httpMetadata as any,
      customMetadata: options?.customMetadata,
    });
    return { ok: Boolean(result) };
  }

  async delete(key: string) {
    await this.bucket.delete(key);
  }

  async copy(source: string, destination: string) {
    const src = await this.bucket.get(source);
    if (!src) throw new Error("not_found");
    await this.bucket.put(destination, src.body, {
      httpMetadata: src.httpMetadata,
      customMetadata: src.customMetadata,
    });
  }

  async createMultipart(key: string, options?: WriteOptions): Promise<MultipartHandle> {
    const mp = await this.bucket.createMultipartUpload(key, {
      httpMetadata: options?.httpMetadata as any,
      customMetadata: options?.customMetadata,
    });
    return this.wrapMp(mp);
  }

  resumeMultipart(key: string, uploadId: string): MultipartHandle {
    return this.wrapMp(this.bucket.resumeMultipartUpload(key, uploadId));
  }

  private wrapMp(mp: R2MultipartUpload): MultipartHandle {
    return {
      key: mp.key,
      uploadId: mp.uploadId,
      uploadPart: async (partNumber, body) => {
        const part = await mp.uploadPart(partNumber, body as any);
        return { etag: part.etag };
      },
      complete: async (parts) => {
        const obj = await mp.complete(parts);
        return { etag: obj.httpEtag };
      },
    };
  }
}
