import { RequestHandlerParams, ROOT_OBJECT } from "./utils";

export async function handleRequestPut({
  store,
  path,
  request,
}: RequestHandlerParams) {
  const searchParams = new URLSearchParams(new URL(request.url).search);
  if (searchParams.has("uploadId")) {
    const uploadId = searchParams.get("uploadId");
    const partNumberStr = searchParams.get("partNumber");
    if (!uploadId || !partNumberStr || !request.body)
      return new Response("Bad Request", { status: 400 });
    const mp = store.resumeMultipart(path, uploadId);
    const uploadedPart = await mp.uploadPart(parseInt(partNumberStr), request.body);
    return new Response(null, {
      headers: { "Content-Type": "application/json", etag: uploadedPart.etag },
    });
  }

  if (request.url.endsWith("/")) {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!path.startsWith("_$flaredrive$/")) {
    const parentPath = path.replace(/(\/|^)[^/]*$/, "");
    const parentDir =
      parentPath === "" ? ROOT_OBJECT : await store.head(parentPath);
    if (parentDir === null) return new Response("Conflict", { status: 409 });
  }

  const thumbnail = request.headers.get("fd-thumbnail");
  const customMetadata = thumbnail ? { thumbnail } : undefined;
  const result = await store.put(path, request.body, {
    httpMetadata: request.headers,
    customMetadata,
  });
  if (!result.ok) return new Response("Preconditions failed", { status: 412 });
  return new Response("", { status: 201 });
}
