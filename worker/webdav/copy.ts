import pLimit from "p-limit";
import { listAll, notFound, RequestHandlerParams, stripDavPathname } from "./utils";

export async function handleRequestCopy({
  store,
  path,
  request,
}: RequestHandlerParams) {
  const dontOverwrite = request.headers.get("Overwrite") === "F";
  const destinationHeader = request.headers.get("Destination");
  if (destinationHeader === null)
    return new Response("Bad Request", { status: 400 });

  const src = await store.head(path);
  if (src === null) return notFound();

  const destPathname = new URL(destinationHeader).pathname;
  const stripped = stripDavPathname(destPathname.replace(/\/$/, "") || destPathname);
  if (!stripped) return new Response("Bad Request", { status: 400 });
  const destination = stripped.path;

  if (
    destination === path ||
    (src.httpMetadata?.contentType === "application/x-directory" &&
      destination.startsWith(path + "/"))
  )
    return new Response("Bad Request", { status: 400 });

  const destinationExists = await store.head(destination);
  if (dontOverwrite && destinationExists)
    return new Response("Precondition Failed", { status: 412 });

  await store.copy(path, destination);

  const isDirectory = src.httpMetadata?.contentType === "application/x-directory";
  if (isDirectory) {
    const depth = request.headers.get("Depth") ?? "infinity";
    switch (depth) {
      case "0":
        break;
      case "infinity": {
        const prefix = path + "/";
        const limit = pLimit(5);
        const promises = [];
        for await (const object of listAll(store, prefix, true)) {
          const target = `${destination}/${object.key.slice(prefix.length)}`;
          promises.push(limit(() => store.copy(object.key, target)));
        }
        await Promise.all(promises);
        break;
      }
      default:
        return new Response("Bad Request", { status: 400 });
    }
  }

  if (destinationExists) {
    return new Response(null, { status: 204 });
  }
  return new Response("", { status: 201 });
}
