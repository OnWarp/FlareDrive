import { RequestHandlerParams, ROOT_OBJECT } from "./utils";

export async function handleRequestMkcol({
  store,
  path,
}: RequestHandlerParams) {
  const resource = await store.head(path);
  if (resource !== null) {
    return new Response("Method Not Allowed", { status: 405 });
  }
  const parentPath = path.replace(/(\/|^)[^/]*$/, "");
  const parentDir =
    parentPath === "" ? ROOT_OBJECT : await store.head(parentPath);
  if (parentDir === null) return new Response("Conflict", { status: 409 });

  await store.put(path, "", {
    httpMetadata: { contentType: "application/x-directory" },
  });
  return new Response("Created", { status: 201 });
}
