export const BUILTIN_R2_ID = "builtin-r2";
export const CONFIG_KEY = "_$flaredrive$/config/storage.json";

export type StorageType = "r2" | "s3";

export interface FileEntry {
  key: string;
  size: number;
  uploaded: Date;
  etag?: string;
  httpMetadata?: {
    contentType?: string;
    contentDisposition?: string;
    contentLanguage?: string;
  };
  customMetadata?: Record<string, string>;
}

export interface StoredObject extends FileEntry {
  body: ReadableStream | null;
  writeHttpMetadata(headers: Headers): void;
}

export interface WriteOptions {
  httpMetadata?: Headers | { contentType?: string };
  customMetadata?: Record<string, string>;
}

export interface MultipartHandle {
  key: string;
  uploadId: string;
  uploadPart(
    partNumber: number,
    body: ReadableStream | ArrayBuffer | Blob
  ): Promise<{ etag: string }>;
  complete(parts: { partNumber: number; etag: string }[]): Promise<{ etag?: string }>;
}

export interface StorageProvider {
  readonly id: string;
  readonly type: StorageType;
  list(prefix: string | undefined, recursive: boolean): AsyncGenerator<FileEntry>;
  head(key: string): Promise<FileEntry | null>;
  get(key: string): Promise<StoredObject | null>;
  put(
    key: string,
    body: ReadableStream | ArrayBuffer | Blob | string | null,
    options?: WriteOptions
  ): Promise<{ ok: boolean }>;
  delete(key: string): Promise<void>;
  copy(source: string, destination: string): Promise<void>;
  createMultipart(key: string, options?: WriteOptions): Promise<MultipartHandle>;
  resumeMultipart(key: string, uploadId: string): MultipartHandle;
}

export interface S3ConfigPublic {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
}

export interface MountPublic {
  id: string;
  name: string;
  type: StorageType;
  builtin?: boolean;
  s3?: S3ConfigPublic;
}

export interface MountRecord extends MountPublic {
  secretAccessKey?: string;
}

export interface StorageConfigFile {
  version: 1;
  defaultId: string;
  mounts: MountRecord[];
}
