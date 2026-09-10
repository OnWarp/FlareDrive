import type { FileEntry } from "../storage/types";
import { listAll, RequestHandlerParams, ROOT_OBJECT } from "./utils";

type DavProperties = {
  creationdate: string | undefined;
  displayname: string | undefined;
  getcontentlanguage: string | undefined;
  getcontentlength: string | undefined;
  getcontenttype: string | undefined;
  getetag: string | undefined;
  getlastmodified: string | undefined;
  resourcetype: string;
  "fd:thumbnail": string | undefined;
};

function fromEntry(object: FileEntry): DavProperties {
  return {
    creationdate: object.uploaded.toUTCString(),
    displayname: object.httpMetadata?.contentDisposition,
    getcontentlanguage: object.httpMetadata?.contentLanguage,
    getcontentlength: object.size.toString(),
    getcontenttype: object.httpMetadata?.contentType,
    getetag: object.etag,
    getlastmodified: object.uploaded.toUTCString(),
    resourcetype:
      object.httpMetadata?.contentType === "application/x-directory"
        ? "<collection />"
        : "",
    "fd:thumbnail": object.customMetadata?.thumbnail,
  };
}

export async function handleRequestPropfind({
  store,
  path,
  request,
  davPrefix,
}: RequestHandlerParams) {
  const responseTemplate = `<?xml version="1.0" encoding="utf-8" ?>
<multistatus xmlns="DAV:" xmlns:fd="flaredrive">
{{items}}
</multistatus>`;

  const rootObject = path === "" ? ROOT_OBJECT : await store.head(path);
  if (!rootObject) return new Response("Not found", { status: 404 });
  const isDirectory =
    rootObject === ROOT_OBJECT ||
    rootObject.httpMetadata?.contentType === "application/x-directory";
  const depth = request.headers.get("Depth") ?? "infinity";

  const children: FileEntry[] = [];
  if (isDirectory && ["1", "infinity"].includes(depth)) {
    const prefix = path === "" ? path : `${path}/`;
    for await (const object of listAll(store, prefix, depth === "infinity")) {
      children.push(object);
    }
  }

  const items = [rootObject, ...children].map((child) => {
    const properties = fromEntry(child);
    return `
  <response>
    <href>${encodeURI(`${davPrefix}${child.key}`)}</href>
    <propstat>
      <prop>
        ${Object.entries(properties)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => `<${key}>${value}</${key}>`)
          .join("\n")}
      </prop>
      <status>HTTP/1.1 200 OK</status>
    </propstat>
  </response>`;
  });

  return new Response(responseTemplate.replace("{{items}}", items.join("")), {
    status: 207,
    headers: { "Content-Type": "application/xml" },
  });
}
