export function humanReadableSize(size: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  let i = 0;
  let n = size;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return i === 0 ? `${Math.round(n)} B` : `${n.toFixed(1)} ${units[i]}`;
}
