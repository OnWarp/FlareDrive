import type { Env } from "./env";
import { authorizeDav, handleAuthApi } from "./auth";
import { handleStorageApi } from "./api/storage";
import { StorageManager } from "./storage/manager";
import { handleRequestCopy } from "./webdav/copy";
import { handleRequestDelete } from "./webdav/delete";
import { handleRequestGet } from "./webdav/get";
import { handleRequestHead } from "./webdav/head";
import { handleRequestMkcol } from "./webdav/mkcol";
import { handleRequestMove } from "./webdav/move";
import { handleRequestPost } from "./webdav/post";
import { handleRequestPropfind } from "./webdav/propfind";
import { handleRequestPut } from "./webdav/put";
import {
  davPrefixFromPath,
  notFound,
  stripDavPathname,
  type RequestHandlerParams,
} from "./webdav/utils";

const HANDLERS: Record<
  string,
  (context: RequestHandlerParams) => Promise<Response>
> = {
  PROPFIND: handleRequestPropfind,
  MKCOL: handleRequestMkcol,
  HEAD: handleRequestHead,
  GET: handleRequestGet,
  POST: handleRequestPost,
  PUT: handleRequestPut,
  COPY: handleRequestCopy,
  MOVE: handleRequestMove,
  DELETE: handleRequestDelete,
};

function handleRequestOptions() {
  return new Response(null, {
    headers: {
      Allow: ["OPTIONS", ...Object.keys(HANDLERS)].join(", "),
      DAV: "1",
    },
  });
}

async function handleWebdav(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") return handleRequestOptions();

  const denied = await authorizeDav(request, env);
  if (denied) return denied;

  const stripped = stripDavPathname(new URL(request.url).pathname);
  if (!stripped) return notFound();

  const mgr = await StorageManager.load(env);
  const store = mgr.defaultProvider();

  const handler =
    HANDLERS[request.method] ??
    (() => Promise.resolve(new Response(null, { status: 405 })));
  return handler({
    store,
    path: stripped.path,
    request,
    davPrefix: stripped.davPrefix,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path.startsWith("/api/auth")) {
      return handleAuthApi(request, env);
    }
    if (path.startsWith("/api/storage")) {
      return handleStorageApi(request, env);
    }
    if (davPrefixFromPath(path)) {
      return handleWebdav(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
