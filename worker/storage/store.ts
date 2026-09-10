import type { Env } from "../env";
import { decryptSecret, encryptSecret } from "./crypto";
import { BUILTIN_R2_ID, CONFIG_KEY, type MountRecord, type StorageConfigFile } from "./types";

function builtin(): MountRecord {
  return { id: BUILTIN_R2_ID, name: "My R2", type: "r2", builtin: true };
}

export function publicMount(m: MountRecord): MountRecord {
  const { secretAccessKey, ...rest } = m;
  return rest;
}

export async function loadConfig(env: Env): Promise<StorageConfigFile> {
  const obj = await env.BUCKET.get(CONFIG_KEY);
  if (!obj) {
    return { version: 1, defaultId: BUILTIN_R2_ID, mounts: [builtin()] };
  }
  const raw = JSON.parse(await obj.text()) as StorageConfigFile;
  const master = env.WEBDAV_PASSWORD || "";
  const mounts: MountRecord[] = [];
  let hasBuiltin = false;
  for (const m of raw.mounts || []) {
    if (m.id === BUILTIN_R2_ID) hasBuiltin = true;
    if (m.type === "s3" && m.secretAccessKey && master) {
      try {
        m.secretAccessKey = await decryptSecret(master, m.secretAccessKey);
      } catch {
        /* leave as-is if not encrypted yet */
      }
    }
    mounts.push(m);
  }
  if (!hasBuiltin) mounts.unshift(builtin());
  return {
    version: 1,
    defaultId: raw.defaultId || BUILTIN_R2_ID,
    mounts,
  };
}

export async function saveConfig(env: Env, cfg: StorageConfigFile) {
  const master = env.WEBDAV_PASSWORD || "";
  const mounts: MountRecord[] = [];
  for (const m of cfg.mounts) {
    const copy = { ...m };
    if (copy.type === "s3" && copy.secretAccessKey && master) {
      copy.secretAccessKey = await encryptSecret(master, copy.secretAccessKey);
    }
    mounts.push(copy);
  }
  await env.BUCKET.put(CONFIG_KEY, JSON.stringify({ ...cfg, mounts }), {
    httpMetadata: { contentType: "application/json" },
  });
}
