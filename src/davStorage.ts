let currentStorageId = "";

export function getCurrentStorageId() {
  return currentStorageId;
}

export function setCurrentStorageId(id: string) {
  currentStorageId = id;
}

export function davHeaders(extra?: HeadersInit): Headers {
  const h = new Headers(extra);
  if (currentStorageId) h.set("X-FlareDrive-Storage", currentStorageId);
  return h;
}

export function withDav(init: RequestInit = {}): RequestInit {
  return {
    ...init,
    credentials: "include",
    headers: davHeaders(init.headers),
  };
}

export function davPath(path: string) {
  const q = currentStorageId
    ? `?storage=${encodeURIComponent(currentStorageId)}`
    : "";
  return `/dav/${path}${q}`;
}
