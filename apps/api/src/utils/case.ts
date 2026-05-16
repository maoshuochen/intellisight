export function toCamel<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => toCamel(item)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
      toCamel(nested)
    ])
  ) as T;
}

export function toSnake<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => toSnake(item)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
      toSnake(nested)
    ])
  ) as T;
}
