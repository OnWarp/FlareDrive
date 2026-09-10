import type { Env } from "../env";

export interface RequestHandlerParams {
  bucket: R2Bucket;
  path: string;
  request: Request;
  davPrefix: string;
}

export const ROOT_OBJECT = {
  key: "",
  uploaded: new Date(),
  httpMetadata: {
    contentType: "application/x-directory",
    contentDisposition: undefined,
    contentLanguage: undefined,
  },
  customMetadata: undefined,
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

export function parseBucketPath(
  request: Request,
  env: Env
): { bucket: R2Bucket; path: string; davPrefix: string } | undefined {
  const url = new URL(request.url);
  const stripped = stripDavPathname(url.pathname);
  if (!stripped) return undefined;

  const driveid = url.hostname.replace(/\..*/, "");
  const named = env[driveid];
  const bucket =
    named && typeof named === "object" && "list" in named
      ? (named as R2Bucket)
      : env.BUCKET;
  if (!bucket) return undefined;
  return { bucket, path: stripped.path, davPrefix: stripped.davPrefix };
}

export async function* listAll(
  bucket: R2Bucket,
  prefix?: string,
  isRecursive: boolean = false
) {
  let cursor: string | undefined = undefined;
  do {
    var r2Objects = await bucket.list({
      prefix: prefix,
      delimiter: isRecursive ? undefined : "/",
      cursor: cursor,
      // @ts-ignore
      include: ["httpMetadata", "customMetadata"],
    });

    for await (const obj of r2Objects.objects)
      if (!obj.key.startsWith("_$flaredrive$/")) yield obj;

    if (r2Objects.truncated) cursor = r2Objects.cursor;
  } while (r2Objects.truncated);
}
