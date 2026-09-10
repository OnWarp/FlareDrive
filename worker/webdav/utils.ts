import type { FileEntry, StorageProvider } from "../storage/types";

export interface RequestHandlerParams {
  store: StorageProvider;
  path: string;
  request: Request;
  davPrefix: string;
}

export const ROOT_OBJECT: FileEntry = {
  key: "",
  uploaded: new Date(),
  httpMetadata: {
    contentType: "application/x-directory",
  },
  size: 0,
  etag: undefined,
};

export function notFound() {
  return new Response("Not found", { status: 404 });
}

export function davPrefixFromPath(pathname: string): string | null {
  if (pathname === "/dav" || pathname.startsWith("/dav/")) return "/dav/";
  if (pathname === "/webdav" || pathname.startsWith("/webdav/"))
    return "/webdav/";
  return null;
}

export function stripDavPathname(pathname: string): {
  davPrefix: string;
  path: string;
} | null {
  const prefix = davPrefixFromPath(pathname);
  if (!prefix) return null;
  const mount = prefix.replace(/\/$/, "");
  let rest = pathname;
  if (rest === mount) rest = "";
  else if (rest.startsWith(prefix)) rest = rest.slice(prefix.length);
  else return null;
  rest = decodeURIComponent(rest).replace(/^\/+/, "");
  return { davPrefix: prefix, path: rest };
}

export async function* listAll(
  store: StorageProvider,
  prefix?: string,
  isRecursive: boolean = false
) {
  for await (const obj of store.list(prefix, isRecursive)) {
    if (!obj.key.startsWith("_$flaredrive$/")) yield obj;
  }
}
