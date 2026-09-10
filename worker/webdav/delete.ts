import { listAll, notFound, RequestHandlerParams } from "./utils";

export async function handleRequestDelete({
  store,
  path,
}: RequestHandlerParams) {
  if (path !== "") {
    const obj = await store.head(path);
    if (obj === null) return notFound();
    await store.delete(path);
    if (obj.httpMetadata?.contentType !== "application/x-directory")
      return new Response(null, { status: 204 });
  }

  const prefix = path === "" ? undefined : `${path}/`;
  for await (const child of listAll(store, prefix, true)) {
    await store.delete(child.key);
  }
  return new Response(null, { status: 204 });
}
