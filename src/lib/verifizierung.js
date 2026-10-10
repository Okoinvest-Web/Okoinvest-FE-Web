// src/lib/verifizierung.js – Bestätigungscodes für Google Search Console und Bing Webmaster Tools (Welle 3, Paket NL)
//
// Die Codes kommen NUR aus Umgebungsvariablen (.env.example): NEXT_PUBLIC_GSC_VERIFICATION, NEXT_PUBLIC_BING_VERIFICATION.
// Ohne Wert entsteht kein Meta-Tag. Ein Wert wird nur übernommen, wenn er wie ein Bestätigungscode aussieht
// (Buchstaben, Ziffern, „-“ und „_“, 6–100 Zeichen) – versehentlich eingefügte ganze Meta-Tags, Anführungszeichen
// oder Leerzeichen erzeugen kein kaputtes oder fremdes Markup. Es wird nichts extern angemeldet: Die Anmeldung der
// Domain in Search Console und Bing macht der Inhaber nach dem Domainkauf (dann Wert setzen, neu bauen).
// Rein, ohne Importe (node:test).

const CODE = /^[A-Za-z0-9_-]{6,100}$/;

/** Wert prüfen: gültiger Code oder null */
export function verifizierungsCode(wert) {
  const s = typeof wert === "string" ? wert.trim() : "";
  return CODE.test(s) ? s : null;
}

/**
 * Next.js-Metadaten `verification` aus den Umgebungswerten – oder {} ohne gültigen Code.
 * @param {{ google?: string, bing?: string }} werte  process.env.NEXT_PUBLIC_GSC_VERIFICATION / …_BING_VERIFICATION
 */
export function verifizierungMetadaten({ google, bing } = {}) {
  const g = verifizierungsCode(google);
  const b = verifizierungsCode(bing);
  if (!g && !b) return {};
  return { verification: { ...(g ? { google: g } : {}), ...(b ? { other: { "msvalidate.01": b } } : {}) } };
}
