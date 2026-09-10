const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function aesKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`flaredrive-storage-v1:${secret}`)
  );
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(master: string, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(master);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const buf = new Uint8Array(iv.byteLength + ct.byteLength);
  buf.set(iv, 0);
  buf.set(new Uint8Array(ct), iv.byteLength);
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin);
}

export async function decryptSecret(master: string, packed: string): Promise<string> {
  const raw = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 12);
  const data = raw.slice(12);
  const key = await aesKey(master);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(pt);
}
