import { notFound } from "./utils";
import { RequestHandlerParams } from "./utils";

export async function handleRequestPost({
  store,
  path,
  request,
}: RequestHandlerParams) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  if (searchParams.has("uploads")) {
    const thumbnail = request.headers.get("fd-thumbnail");
    const customMetadata = thumbnail ? { thumbnail } : undefined;
    const mp = await store.createMultipart(path, {
      httpMetadata: request.headers,
      customMetadata,
    });
    return new Response(JSON.stringify({ key: mp.key, uploadId: mp.uploadId }));
  }

  if (searchParams.has("uploadId")) {
    const uploadId = searchParams.get("uploadId");
    if (!uploadId) return notFound();
    const mp = store.resumeMultipart(path, uploadId);
    const completeBody: { parts: Array<{ partNumber: number; etag: string }> } =
      await request.json();
    try {
      const object = await mp.complete(completeBody.parts);
      return new Response(null, {
        headers: { etag: object.etag || "" },
      });
    } catch (error: any) {
      return new Response(error.message, { status: 400 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
