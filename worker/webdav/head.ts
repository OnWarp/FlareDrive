import { notFound } from "./utils";
import { RequestHandlerParams } from "./utils";

export async function handleRequestHead({
  store,
  path,
}: RequestHandlerParams) {
  const obj = await store.head(path);
  if (obj === null) return notFound();
  const headers = new Headers();
  if (obj.httpMetadata?.contentType)
    headers.set("content-type", obj.httpMetadata.contentType);
  if (obj.etag) headers.set("etag", obj.etag);
  headers.set("content-length", String(obj.size));
  return new Response(null, { headers });
}
