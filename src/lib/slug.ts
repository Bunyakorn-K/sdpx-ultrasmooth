export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(^-|-$)/g, "");
}

export function uniqueSlug(input: string): string {
  const base = slugify(input) || "item";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
