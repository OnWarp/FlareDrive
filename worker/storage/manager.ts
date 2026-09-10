import type { Env } from "../env";
import { createProvider } from "./registry";
import { testS3 } from "./providers/s3";
import { loadConfig, publicMount, saveConfig } from "./store";
import {
  BUILTIN_R2_ID,
  type MountPublic,
  type MountRecord,
  type StorageProvider,
} from "./types";

export class StorageManager {
  constructor(
    private env: Env,
    private cfg: Awaited<ReturnType<typeof loadConfig>>
  ) {}

  static async load(env: Env) {
    return new StorageManager(env, await loadConfig(env));
  }

  listPublic(): { defaultId: string; mounts: MountPublic[] } {
    return {
      defaultId: this.cfg.defaultId,
      mounts: this.cfg.mounts.map(publicMount),
    };
  }

  getRecord(id: string) {
    return this.cfg.mounts.find((m) => m.id === id);
  }

  provider(id?: string): StorageProvider {
    const rec = this.getRecord(id || this.cfg.defaultId) || this.getRecord(BUILTIN_R2_ID)!;
    return createProvider(this.env, rec);
  }

  defaultProvider() {
    return this.provider(this.cfg.defaultId);
  }

  async setDefault(id: string) {
    if (!this.getRecord(id)) throw new Error("not_found");
    this.cfg.defaultId = id;
    await saveConfig(this.env, this.cfg);
  }

  async addS3(input: {
    name: string;
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    const id = `s3_${crypto.randomUUID()}`;
    const rec: MountRecord = {
      id,
      name: input.name.trim() || "S3",
      type: "s3",
      s3: {
        endpoint: input.endpoint.replace(/\/$/, ""),
        region: input.region || "auto",
        bucket: input.bucket,
        accessKeyId: input.accessKeyId,
      },
      secretAccessKey: input.secretAccessKey,
    };
    this.cfg.mounts.push(rec);
    await saveConfig(this.env, this.cfg);
    return publicMount(rec);
  }

  async update(id: string, patch: Partial<{
    name: string;
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }>) {
    const rec = this.getRecord(id);
    if (!rec || rec.builtin) throw new Error("forbidden");
    if (patch.name) rec.name = patch.name;
    if (rec.type === "s3" && rec.s3) {
      if (patch.endpoint) rec.s3.endpoint = patch.endpoint.replace(/\/$/, "");
      if (patch.region) rec.s3.region = patch.region;
      if (patch.bucket) rec.s3.bucket = patch.bucket;
      if (patch.accessKeyId) rec.s3.accessKeyId = patch.accessKeyId;
      if (patch.secretAccessKey) rec.secretAccessKey = patch.secretAccessKey;
    }
    await saveConfig(this.env, this.cfg);
    return publicMount(rec);
  }

  async remove(id: string) {
    const rec = this.getRecord(id);
    if (!rec || rec.builtin) throw new Error("forbidden");
    this.cfg.mounts = this.cfg.mounts.filter((m) => m.id !== id);
    if (this.cfg.defaultId === id) this.cfg.defaultId = BUILTIN_R2_ID;
    await saveConfig(this.env, this.cfg);
  }

  async test(id?: string, inline?: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
  }) {
    if (inline) {
      return testS3({
        endpoint: inline.endpoint.replace(/\/$/, ""),
        region: inline.region || "auto",
        bucket: inline.bucket,
        accessKeyId: inline.accessKeyId,
        secretAccessKey: inline.secretAccessKey,
      });
    }
    if (!id) return { ok: false, error: "missing" };
    const rec = this.getRecord(id);
    if (!rec) return { ok: false, error: "not_found" };
    if (rec.type === "r2") {
      try {
        await this.env.BUCKET.list({ limit: 1 });
        return { ok: true };
      } catch (e: any) {
        return { ok: false, error: String(e?.message || e) };
      }
    }
    if (!rec.s3 || !rec.secretAccessKey) return { ok: false, error: "incomplete" };
    return testS3({
      endpoint: rec.s3.endpoint,
      region: rec.s3.region || "auto",
      bucket: rec.s3.bucket,
      accessKeyId: rec.s3.accessKeyId,
      secretAccessKey: rec.secretAccessKey,
    });
  }
}
