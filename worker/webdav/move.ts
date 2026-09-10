import { RequestHandlerParams } from "./utils";
import { handleRequestCopy } from "./copy";
import { handleRequestDelete } from "./delete";

export async function handleRequestMove({
  store,
  path,
  request,
}: RequestHandlerParams) {
  const response = await handleRequestCopy({ store, path, request, davPrefix: "" });
  if (response.status >= 400) return response;
  return handleRequestDelete({ store, path, request, davPrefix: "" });
}
