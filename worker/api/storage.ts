import { sessionUser } from "../auth";
import type { Env } from "../env";
import { StorageManager } from "../storage/manager";

async function requireUser(request: Request, env: Env) {
  const user = await sessionUser(request, env);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

export async function handleStorageApi(request: Request, env: Env): Promise<Response> {
  const denied = await requireUser(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const parts = url.pathname.replace(/\/+$/, "").split("/");
  // /api/storage ...
  const mgr = await StorageManager.load(env);

  if (request.method === "GET" && url.pathname === "/api/storage") {
    return Response.json(mgr.listPublic());
  }

  if (request.method === "PUT" && url.pathname === "/api/storage/default") {
    const body = (await request.json()) as { id?: string };
    if (!body.id) return Response.json({ error: "missing_id" }, { status: 400 });
    try {
      await mgr.setDefault(body.id);
      return Response.json(mgr.listPublic());
    } catch {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/storage/test") {
    const body = (await request.json()) as any;
    const inline =
      body.endpoint && body.accessKeyId && body.secretAccessKey
        ? body
        : undefined;
    const result = await mgr.test(body.id, inline);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  }

  if (request.method === "POST" && url.pathname === "/api/storage") {
    const body = (await request.json()) as any;
    if (body.type !== "s3") return Response.json({ error: "unsupported_type" }, { status: 400 });
    if (!body.endpoint || !body.bucket || !body.accessKeyId || !body.secretAccessKey) {
      return Response.json({ error: "missing_fields" }, { status: 400 });
    }
    const rec = await mgr.addS3({
      name: body.name || "S3",
      endpoint: body.endpoint,
      region: body.region || "auto",
      bucket: body.bucket,
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
    });
    return Response.json(rec, { status: 201 });
  }

  const id = parts[3];
  if (!id) return Response.json({ error: "not_found" }, { status: 404 });

  if (request.method === "PUT" && parts[2] === "storage" && parts.length === 4) {
    try {
      const body = (await request.json()) as any;
      const rec = await mgr.update(id, body);
      return Response.json(rec);
    } catch {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  if (request.method === "DELETE" && parts[2] === "storage" && parts.length === 4) {
    try {
      await mgr.remove(id);
      return new Response(null, { status: 204 });
    } catch {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
  }

  return Response.json({ error: "not_found" }, { status: 404 });
}
