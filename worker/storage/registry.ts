import { R2Provider } from "./providers/r2";
import { S3Provider } from "./providers/s3";
import type { MountRecord, StorageProvider } from "./types";
import type { Env } from "../env";

export function createProvider(env: Env, rec: MountRecord): StorageProvider {
  if (rec.type === "r2") return new R2Provider(rec.id, env.BUCKET);
  if (rec.type === "s3") {
    if (!rec.s3 || !rec.secretAccessKey) throw new Error("s3_incomplete");
    return new S3Provider(rec.id, {
      endpoint: rec.s3.endpoint,
      region: rec.s3.region || "auto",
      bucket: rec.s3.bucket,
      accessKeyId: rec.s3.accessKeyId,
      secretAccessKey: rec.secretAccessKey,
    });
  }
  throw new Error("unknown_provider");
}
