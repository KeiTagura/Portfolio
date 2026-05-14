const base = import.meta.env.BASE_URL;

export function withBase(path: string) {
  if (!path || path.startsWith("http") || path.startsWith("mailto:") || path.startsWith("#")) {
    return path;
  }

  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}` || normalizedPath;
}
