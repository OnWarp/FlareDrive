/// <reference types="@cloudflare/workers-types" />

import type { Env } from "./env";

const SESSION_COOKIE = "fd_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export interface CredentialProvider {
  verify(username: string, password: string): Promise<boolean>;
}

export class StaticCredentialProvider implements CredentialProvider {
  constructor(
    private readonly username: string,
    private readonly password: string
  ) {}

  async verify(username: string, password: string): Promise<boolean> {
    const userOk = timingSafeEqualString(username, this.username);
    const passOk = timingSafeEqualString(password, this.password);
    return userOk && passOk;
  }
}

export function credentialProviderFromEnv(env: Env): CredentialProvider | null {
  if (!env.WEBDAV_USERNAME || !env.WEBDAV_PASSWORD) return null;
  return new StaticCredentialProvider(env.WEBDAV_USERNAME, env.WEBDAV_PASSWORD);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aa = encoder.encode(a);
  const bb = encoder.encode(b);
  const len = Math.max(aa.length, bb.length, 1);
  const pa = new Uint8Array(len);
  const pb = new Uint8Array(len);
  pa.set(aa);
  pb.set(bb);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= pa[i] ^ pb[i];
  return diff === 0;
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return atob(b64);
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return [...new Uint8Array(sig)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function issueSessionCookie(
  env: Env,
  username: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = b64url(encoder.encode(JSON.stringify({ u: username, exp })));
  const sig = await hmacHex(env.WEBDAV_PASSWORD, payload);
  const token = `${payload}.${sig}`;
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SEC}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("Cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

export async function sessionUser(
  request: Request,
  env: Env
): Promise<string | null> {
  if (!env.WEBDAV_PASSWORD) return null;
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(env.WEBDAV_PASSWORD, payload);
  if (!timingSafeEqualString(sig, expected)) return null;
  try {
    const data = JSON.parse(b64urlDecode(payload)) as { u?: string; exp?: number };
    if (!data.u || typeof data.exp !== "number") return null;
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    if (env.WEBDAV_USERNAME && data.u !== env.WEBDAV_USERNAME) return null;
    return data.u;
  } catch {
    return null;
  }
}

export async function verifyBasic(
  request: Request,
  provider: CredentialProvider
): Promise<boolean> {
  const header = request.headers.get("Authorization");
  if (!header || !header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return false;
    return provider.verify(decoded.slice(0, idx), decoded.slice(idx + 1));
  } catch {
    return false;
  }
}

export async function authorizeDav(
  request: Request,
  env: Env
): Promise<Response | null> {
  const skipAuth =
    env.WEBDAV_PUBLIC_READ === "1" &&
    ["GET", "HEAD", "PROPFIND"].includes(request.method);
  if (skipAuth) return null;

  const provider = credentialProviderFromEnv(env);
  if (!provider) {
    return new Response("WebDAV protocol is not enabled", { status: 403 });
  }
  if (await sessionUser(request, env)) return null;
  if (await verifyBasic(request, provider)) return null;

  const headers = new Headers();
  if (!readCookie(request, SESSION_COOKIE)) {
    headers.set("WWW-Authenticate", `Basic realm="WebDAV"`);
  }
  return new Response("Unauthorized", { status: 401, headers });
}

export async function handleAuthApi(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await sessionUser(request, env);
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ username: user });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    return new Response(null, {
      status: 204,
      headers: { "Set-Cookie": clearSessionCookie() },
    });
  }

  if (path === "/api/auth/login" && request.method === "POST") {
    const provider = credentialProviderFromEnv(env);
    if (!provider) {
      return Response.json({ error: "auth_disabled" }, { status: 403 });
    }
    let body: { username?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "invalid_json" }, { status: 400 });
    }
    const username = body.username ?? "";
    const password = body.password ?? "";
    if (!(await provider.verify(username, password))) {
      return Response.json({ error: "invalid_credentials" }, { status: 401 });
    }
    const cookie = await issueSessionCookie(env, username);
    return new Response(JSON.stringify({ username }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookie,
      },
    });
  }

  return Response.json({ error: "not_found" }, { status: 404 });
}
