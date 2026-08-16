// SLUGIFY ---------------------------------------------------------------------------------------------------------------------------------
export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

export function suffixSlug(base: string, sequence: number) {
  return sequence === 1 ? base : `${base}-${sequence}`;
}
