// German/Austrian umlaut transliteration per DIN 5007-2 / Duden:
// ä→ae, ö→oe, ü→ue, ß→ss. Must run BEFORE normalize("NFD"), otherwise NFD
// decomposes ü into "u" + combining mark and we'd lose the "e".
export function generateSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s–—]+/g, "-")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Used for job and hersteller names
export function generateJobSlug(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, "-")
    .replace(/\//g, "-")
    .replace(/[^a-z0-9-]/g, "");
}