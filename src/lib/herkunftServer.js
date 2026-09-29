// Serverseitige Prüfung der Kampagnen-Zuordnung (siehe src/lib/herkunft.js).

const KANAELE = ["Anzeige", "Social Media", "E-Mail", "Offline/QR", "Kampagne", "Suchmaschine", "KI-Assistent", "Verweis", "Direkt"];
const VERBOTEN = new Set(["<", ">", '"', "'", "`"]);

/** Steuerzeichen und HTML-relevante Zeichen entfernen, kürzen. */
const text = (v, n) =>
  [...String(v ?? "")]
    .filter((z) => z.codePointAt(0) >= 32 && !VERBOTEN.has(z))
    .join("")
    .trim()
    .slice(0, n);
const pfad = (v) => (/^\/[\w\-/.%~]*$/.test(String(v || "")) ? String(v).slice(0, 200) : "");

/** Liefert Frappe-Felder für die Herkunft oder {} */
export function herkunftFelder(h) {
  if (!h || typeof h !== "object") return {};
  return {
    herkunft_kanal: KANAELE.includes(h.kanal) ? h.kanal : "",
    utm_source: text(h.utm_source, 100),
    utm_medium: text(h.utm_medium, 100),
    utm_campaign: text(h.utm_campaign, 100),
    utm_term: text(h.utm_term, 100),
    utm_content: text(h.utm_content, 100),
    herkunft_referrer: text(h.referrer, 120).replace(/[^a-z0-9.\-]/gi, ""),
    einstiegsseite: pfad(h.einstieg),
  };
}

/** Kompakte Zeile für die Übergangslösung über Kontaktanfragen. */
export function herkunftZeile(h) {
  const f = herkunftFelder(h);
  const teile = [
    f.herkunft_kanal && `Kanal: ${f.herkunft_kanal}`,
    f.utm_source && `Quelle: ${f.utm_source}`,
    f.utm_medium && `Medium: ${f.utm_medium}`,
    f.utm_campaign && `Kampagne: ${f.utm_campaign}`,
    f.herkunft_referrer && `Verweis: ${f.herkunft_referrer}`,
    f.einstiegsseite && `Einstieg: ${f.einstiegsseite}`,
  ].filter(Boolean);
  return teile.length ? `[Herkunft] ${teile.join(" · ")}` : "";
}
