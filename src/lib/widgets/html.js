// src/lib/widgets/html.js
//
// HTML-Renderer der Partner-Widgets (Welle 4, Paket WIDGETS). Erzeugt vollständige, in sich
// geschlossene HTML-Dokumente für die Embed-Routen /widgets/<name>:
//
//  - reines HTML + Inline-CSS, KEIN JavaScript, keine externen Ressourcen (CSP default-src 'none');
//  - der Kurzrechner arbeitet mit einem GET-Formular auf sich selbst (serverseitige Berechnung);
//  - alle Links hinaus tragen target="_top" (brechen aus dem iframe aus) und den utm-Herkunftsnachweis
//    der Partner-Kennung (src/lib/widgets/register.js → widgetZiel);
//  - Attribution „bereitgestellt von ÖkoInvest“ ist fest eingebaut;
//  - Farben entsprechen den Marken-Tokens aus src/app/globals.css (ov/navy/ink).
//
// Reine Funktionen (String-Bau), testbar mit node --test.

import { KURZ_MODELLE, KURZ_PROFILE, KURZ_TEXTE, egKurzRechnen } from "./egSparKurz.js";
import { tickerEintraege } from "./fristenTicker.js";
import { WIDGETS, widgetZiel } from "./register.js";

/** HTML-Escaping für Textknoten und Attributwerte. */
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const eur = (n, en) => new Intl.NumberFormat(en ? "en-IE" : "de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const zahlFmt = (n, en) => new Intl.NumberFormat(en ? "en-IE" : "de-AT", { maximumFractionDigits: 0 }).format(Number(n) || 0);

const CSS = `
:root{--ov6:#558227;--ov7:#436621;--ov1:#e6f1d8;--navy8:#03285a;--ink9:#1b2430;--ink6:#55606e;--ink2:#e4e8ee;--sand:#faf7f0}
*{box-sizing:border-box;margin:0}
ul{padding:0}
body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink9);background:#fff;padding:16px}
.w{max-width:608px;margin:0 auto}
h1{font-size:18px;line-height:1.3;color:var(--navy8);margin-bottom:2px}
.sub{font-size:13px;color:var(--ink6);margin-bottom:14px}
form{display:grid;gap:10px;background:var(--sand);border:1px solid var(--ink2);border-radius:12px;padding:14px}
label{display:grid;gap:4px;font-size:13px;font-weight:600}
input,select{font:inherit;padding:8px 10px;border:1px solid var(--ink2);border-radius:8px;background:#fff;color:inherit;width:100%}
button{font:inherit;font-weight:700;padding:10px 14px;border:0;border-radius:8px;background:var(--ov6);color:#fff;cursor:pointer}
button:hover{background:var(--ov7)}
.erg{margin-top:14px;border:1px solid var(--ink2);border-radius:12px;padding:14px}
.erg strong.gross{display:block;font-size:26px;color:var(--ov7)}
.teile{list-style:none;margin-top:8px;display:grid;gap:4px;font-size:13px}
.teile li{display:flex;justify-content:space-between;gap:12px;border-top:1px dashed var(--ink2);padding-top:4px}
.hin{margin-top:10px;font-size:12.5px;color:var(--ink6)}
.hin p{margin-top:4px}
ul.fristen{list-style:none;display:grid;gap:10px}
ul.fristen li{border:1px solid var(--ink2);border-radius:12px;padding:12px 14px}
ul.fristen .datum{font-size:13px;font-weight:700;color:var(--ov7)}
ul.fristen .quelle{font-size:12px;color:var(--ink6);margin-top:4px}
a{color:var(--navy8)}
.cta{display:inline-block;margin-top:12px;font-weight:700;color:var(--ov7)}
footer{margin-top:16px;padding-top:10px;border-top:1px solid var(--ink2);font-size:12px;color:var(--ink6);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
`;

/** Dokument-Skelett: <html lang>, noindex, Inline-CSS, Attribution. */
export function seite({ sprache = "de", titel, inhalt, basis, partner = null, widgetId = "" }) {
  const en = sprache === "en";
  const attribution = widgetZiel(basis, "/", { partner, widgetId });
  return `<!doctype html>
<html lang="${en ? "en" : "de"}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(titel)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="w">
${inhalt}
<footer>
<span>${en ? "No cookies, no tracking in this widget." : "Dieses Widget setzt keine Cookies und kein Tracking ein."}</span>
<span>${en ? "provided by" : "bereitgestellt von"} <a href="${esc(attribution)}" target="_top" rel="noopener">ÖkoInvest</a></span>
</footer>
</div>
</body>
</html>`;
}

const T_RECHNER = {
  de: {
    titel: "Energiegemeinschaft: Was bringt sie mir?",
    sub: "Jahres-Näherung für Österreich (2026) – vereinfachte Eingaben, gerechnet mit dem Rechenkern des ÖkoInvest-Rechners. Ersetzt keine individuelle Berechnung.",
    verbrauch: "Jahresverbrauch (kWh)",
    profil: "Verbrauchsprofil",
    modell: "Modell der Gemeinschaft",
    rechnen: "Ersparnis schätzen",
    netto: "geschätzter Vorteil pro Jahr (nach Gebühren)",
    quote: (q, kwh) => `Annahme: rund ${q} % des Verbrauchs (${kwh} kWh) kommen aus der Gemeinschaft.`,
    gebuehren: "Gebühren der Gemeinschaft",
    mehr: "Zum ausführlichen Rechner mit allen Annahmen",
    regel: "Regelstand",
    nurAt: "Der Kurzrechner rechnet derzeit nur mit geprüften Werten für Österreich. Für Deutschland und die Schweiz zeigen wir keine Schätzwerte.",
    nurAtCta: "Energiegemeinschaften bei ÖkoInvest",
  },
  en: {
    titel: "Energy community: what's in it for me?",
    sub: "Annual estimate for Austria (2026) – simplified inputs, computed with the engine of the full ÖkoInvest calculator. Not a substitute for an individual calculation.",
    verbrauch: "Annual consumption (kWh)",
    profil: "Consumption profile",
    modell: "Community model",
    rechnen: "Estimate savings",
    netto: "estimated benefit per year (after fees)",
    quote: (q, kwh) => `Assumption: around ${q}% of consumption (${kwh} kWh) comes from the community.`,
    gebuehren: "Community fees",
    mehr: "Open the full calculator with all assumptions",
    regel: "Rule basis",
    nurAt: "This quick calculator currently uses verified values for Austria only. We do not show estimates for Germany or Switzerland.",
    nurAtCta: "Energy communities at ÖkoInvest",
  },
};

/** Hinweistexte des Rechenkerns (deutsch) – englische Entsprechungen für das Widget. */
const HINWEISE_EN = {
  luecke: "Oct–Dec 2026: whether reduced grid fees under SNE-V 2018 continue to apply during the transition is presented inconsistently – your grid invoice is decisive (to be confirmed).",
  platzhalter: "From 2027 the grid fee follows the new proximity rules; the values of the new ordinance are still pending – calculated here as a working hypothesis.",
  beg: "Citizen energy communities currently receive no grid-fee reduction and no levy exemption – the benefit comes from the price.",
  negativ: "With these assumptions the benefits do not cover the fees. More flexible consumption or a lower community price improves the result.",
};

/** Inhalt des EG-Spar-Kurzrechners (Formular + serverseitiges Ergebnis). */
export function egSparrechnerHtml({ land, sprache = "de", partner = null, basis, query = {} }) {
  const en = sprache === "en";
  const t = T_RECHNER[en ? "en" : "de"];
  const tx = KURZ_TEXTE[en ? "en" : "de"];
  const kopf = `<h1>${esc(t.titel)}</h1><p class="sub">${esc(t.sub)}</p>`;

  if (land !== "at") {
    const ziel = widgetZiel(basis, "/energiegemeinschaften", { partner, widgetId: "eg-sparrechner" });
    return `${kopf}<div class="erg"><p>${esc(t.nurAt)}</p><a class="cta" href="${esc(ziel)}" target="_top" rel="noopener">${esc(t.nurAtCta)} →</a></div>`;
  }

  const r = egKurzRechnen(query);
  const e = r.eingaben;
  const feld = (name, wert) => `<input type="hidden" name="${name}" value="${esc(wert)}">`;
  const option = (wert, label, aktiv) => `<option value="${wert}"${aktiv ? " selected" : ""}>${esc(label)}</option>`;
  const formular = `<form method="get" action="">
${feld("land", "at")}${sprache === "en" ? feld("sprache", "en") : ""}${partner ? feld("partner", partner) : ""}
<label>${esc(t.verbrauch)}<input type="number" name="verbrauchKwh" min="100" max="1000000" step="100" value="${e.verbrauchKwh}"></label>
<label>${esc(t.profil)}<select name="profil">${KURZ_PROFILE.map((p) => option(p, tx.profile[p], p === e.profil)).join("")}</select></label>
<label>${esc(t.modell)}<select name="modell">${KURZ_MODELLE.map((m) => option(m, tx.modelle[m], m === e.modell)).join("")}</select></label>
<button type="submit">${esc(t.rechnen)}</button>
</form>`;

  const teile = r.teile
    .map((x) => `<li><span>${esc(x.label)}</span><span>${eur(x.eur, en)}</span></li>`)
    .concat(`<li><span>${esc(t.gebuehren)}</span><span>−${eur(r.gebuehrenEur, en)}</span></li>`)
    .join("");
  const hinweise = [
    ...r.hinweise.map((h) => (en ? HINWEISE_EN[h.id] || h.text : h.text)),
    `${t.regel}: ${r.regel.text}`, // Regeltext aus der Regeltabelle (deutsch, amtliche Begriffe – bewusst nicht frei übersetzt)
  ]
    .map((x) => `<p>${esc(x)}</p>`)
    .join("");
  // In diesem Zweig ist land immer "at" (Guard oben); dynamisch wie beim Fristen-Ticker, kein fester Präfix
  const ziel = widgetZiel(basis, `/${land}/energiegemeinschaften/rechner`, { partner, widgetId: "eg-sparrechner" });
  const ergebnis = `<div class="erg">
<strong class="gross">${r.nettoEur >= 0 ? "≈ " : ""}${eur(r.nettoEur, en)}</strong>
<span class="sub">${esc(t.netto)}</span>
<p class="sub" style="margin-top:6px">${esc(t.quote(r.quotePct, zahlFmt(r.bezugKwh, en)))}</p>
<ul class="teile">${teile}</ul>
<div class="hin">${hinweise}</div>
<a class="cta" href="${esc(ziel)}" target="_top" rel="noopener">${esc(t.mehr)} →</a>
</div>`;

  return kopf + formular + ergebnis;
}

const T_FRISTEN = {
  de: {
    titel: { de: "Fristen Deutschland", at: "Fristen Österreich", ch: "Fristen Schweiz" },
    sub: "Nächste Förder- und Gebotsfristen aus dem ÖkoInvest-Faktenregister – mit Quelle und Stand. Abgelaufene Termine erscheinen nicht.",
    leer: "Derzeit sind keine aktuellen Fristen eingetragen.",
    quelle: "Quelle",
    alle: "Alle Fristen und Termine",
  },
  en: {
    titel: { de: "Deadlines Germany", at: "Deadlines Austria", ch: "Deadlines Switzerland" },
    sub: "Upcoming funding and bidding deadlines from the ÖkoInvest fact register – with source and date. Expired items are hidden.",
    leer: "No current deadlines are listed at the moment.",
    quelle: "Source",
    alle: "All deadlines and dates",
  },
};

/** Inhalt des Fristen-Tickers. */
export function fristenHtml({ land, sprache = "de", partner = null, basis, heute = new Date() }) {
  const en = sprache === "en";
  const t = T_FRISTEN[en ? "en" : "de"];
  const eintraege = tickerEintraege(land, { heute, sprache: en ? "en" : "de" });
  const kopf = `<h1>${esc(t.titel[land] || t.titel.de)}</h1><p class="sub">${esc(t.sub)}</p>`;
  const liste = eintraege.length
    ? `<ul class="fristen">${eintraege
        .map(
          (f) => `<li><span class="datum">${esc(f.terminText)}</span><p>${esc(f.titel)}</p><p class="quelle">${esc(t.quelle)}: ${esc(f.quelleTitel)}${f.stand ? ` · ${esc(f.stand)}` : ""}</p></li>`
        )
        .join("")}</ul>`
    : `<p class="sub">${esc(t.leer)}</p>`;
  const ziel = widgetZiel(basis, `/${land}/marktdaten/fristen`, { partner, widgetId: "fristen" });
  return `${kopf}${liste}<a class="cta" href="${esc(ziel)}" target="_top" rel="noopener">${esc(t.alle)} →</a>`;
}

/** Vollständiges Dokument eines Widgets. */
export function widgetDokument({ widgetId, land, sprache, partner, basis, query = {}, heute = new Date() }) {
  const w = WIDGETS[widgetId];
  const titel = sprache === "en" ? `${w.titelEn} – ÖkoInvest` : `${w.titel} – ÖkoInvest`;
  const inhalt =
    widgetId === "eg-sparrechner"
      ? egSparrechnerHtml({ land, sprache, partner, basis, query })
      : fristenHtml({ land, sprache, partner, basis, heute });
  return seite({ sprache, titel, inhalt, basis, partner, widgetId });
}
