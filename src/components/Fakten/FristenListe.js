// src/components/Fakten/FristenListe.js
//
// Befristete Termine eines Landes aus dem Faktenregister (Welle 2, Paket FRI).
// Zeigt je Termin Zeitraum bzw. Stichtag, Stand (Prüfstatus), Quelle mit Abrufdatum und Ablauf.
//  - Abgelaufene Einträge (gueltigBis vor heute) erscheinen NICHT.
//  - Keine Countdowns, keine Dringlichkeits-Hinweise: nur das Datum.
//  - Land als Parameter (DE | AT | CH); DACH-Termine gelten für alle drei.
// Bewusst ohne JSX (createElement) und ohne Hooks: als Server-Komponente nutzbar und direkt mit
// node --test prüfbar (wie JsonLd.js). Deshalb eigene kleine Stand-/Quellen-Bausteine statt
// StandHinweis/Quellenzeile (JSX); Optik und Texte entsprechen diesen.
//
//   <FristenListe land="AT" />
//   <FristenListe land="DE" heute="2026-10-20" />      Stichtag (Tests, Vorschau)
//   fristenFuer("CH", { heute, liste })                 reine Auswahl (Tests, Berichte)

import { createElement as h } from "react";
import { CalendarDays, CircleCheck, Clock, ExternalLink, PencilRuler, TriangleAlert } from "lucide-react";
import { fakten as faktenAusRegister, anzeigeStatus, istAbgelaufen, datumDe, datumLang, HINWEIS_ABGELAUFEN } from "@/lib/fakten";
import { cn } from "@/components/ui/cn";
import { datumKurzEn, faktEn, LAND_NAME_EN, quelleTitelEn, terminTextEn } from "@/lib/sprache/faktenEn";

export const LAND_NAME = { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", DACH: "Deutschland, Österreich, Schweiz" };

const passtLand = (f, land) => f.land === land || f.land === "DACH";

/**
 * Noch gültige Termine eines Landes, nach Datum sortiert (ohne Entwürfe, ohne Abgelaufene).
 * @param {"DE"|"AT"|"CH"} land
 * @param {{ heute?: Date|string, liste?: object[] }} [optionen] liste: eigene Fakten (Tests)
 */
export function fristenFuer(land, { heute = new Date(), liste } = {}) {
  const quelle = liste || faktenAusRegister({ land, praefix: "termin." });
  return quelle
    .filter((f) => f?.id?.startsWith("termin.") && passtLand(f, land) && f.status !== "entwurf" && !istAbgelaufen(f, heute) && f.wert && typeof f.wert === "object")
    .sort((a, b) => String(a.wert.beginn || a.wert.ende).localeCompare(String(b.wert.beginn || b.wert.ende)));
}

/** Datumstext eines Termins: „8. bis 22. Oktober 2026“, „1. Dezember 2026“, „erwartet bis 31. Dezember 2026“ */
export function terminText(w) {
  if (!w) return "";
  if (w.art === "erwartet") return `erwartet bis ${datumLang(w.ende)}`;
  if (w.art === "zeitraum" && w.beginn) {
    const [jb, mb] = w.beginn.split("-");
    const [je, me] = w.ende.split("-");
    if (jb === je && mb === me) return `${Number(w.beginn.slice(8, 10))}. bis ${datumLang(w.ende)}`;
    if (jb === je) return `${datumLang(w.beginn).replace(` ${jb}`, "")} bis ${datumLang(w.ende)}`;
    return `${datumLang(w.beginn)} bis ${datumLang(w.ende)}`;
  }
  return datumLang(w.ende);
}

/** Englischer Stand-Text (gleiche Bedingungen wie standZeile) */
function standZeileEn(f, heute) {
  const status = anzeigeStatus(f, heute);
  const abgelaufen = "Information out of date, under review";
  if (status === "abgelaufen") return { status, ton: "warn", text: f.gueltigBis ? `${abgelaufen} (valid until ${datumKurzEn(f.gueltigBis)})` : abgelaufen };
  const stand = f.abruf ? `As at ${datumKurzEn(f.abruf)}` : "Date open";
  if (status === "geprueft") return { status, ton: "ok", text: `${stand} · checked against the original` };
  if (status === "entwurf") return { status, ton: "neutral", text: `${stand} · draft, not approved` };
  if (f.klasse === "C" || f.quelle?.art === "eigen") return { status, ton: "neutral", text: `${stand} · own assessment` };
  return { status, ton: "neutral", text: `${stand} · review pending` };
}

/** Stand-Text wie StandHinweis (Masterplan H7): nie „aktuell“ für abgelaufene Werte */
export function standZeile(f, heute = new Date(), sprache = "de") {
  if (sprache === "en") return standZeileEn(f, heute);
  const status = anzeigeStatus(f, heute);
  if (status === "abgelaufen") return { status, ton: "warn", text: f.gueltigBis ? `${HINWEIS_ABGELAUFEN} (gültig bis ${datumDe(f.gueltigBis)})` : HINWEIS_ABGELAUFEN };
  const stand = f.abruf ? `Stand ${datumDe(f.abruf)}` : "Stand offen";
  if (status === "geprueft") return { status, ton: "ok", text: `${stand} · am Original geprüft` };
  if (status === "entwurf") return { status, ton: "neutral", text: `${stand} · Entwurf, nicht freigegeben` };
  if (f.klasse === "C" || f.quelle?.art === "eigen") return { status, ton: "neutral", text: `${stand} · eigene Einschätzung` };
  return { status, ton: "neutral", text: `${stand} · Prüfung ausstehend` };
}

const TON = {
  ok: "bg-ov-50 text-ov-800 ring-ov-200",
  warn: "bg-sun-50 text-sun-700 ring-sun-200",
  neutral: "bg-ink-100 text-ink-700 ring-ink-200",
};
const ICON = { geprueft: CircleCheck, abgelaufen: TriangleAlert, zu_pruefen: Clock, entwurf: PencilRuler };

/** Stand-Etikett (Status nie nur über Farbe: Text ist immer dabei) */
export function StandEtikett({ fakt, heute, className, sprache = "de" }) {
  const { status, ton, text } = standZeile(fakt, heute || new Date(), sprache);
  return h(
    "span",
    {
      role: status === "abgelaufen" ? "status" : undefined,
      "data-fakt-status": status,
      className: cn("inline-flex max-w-full items-center gap-1.5 rounded-2xl px-2.5 py-1 text-left text-[12px] font-semibold ring-1 ring-inset", TON[ton], className),
    },
    h(ICON[status] || Clock, { "aria-hidden": "true", className: "h-3.5 w-3.5 shrink-0" }),
    h("span", { className: "min-w-0" }, text)
  );
}

/** „Quelle: <Titel> · abgerufen TT.MM.JJJJ“ (wie Quellenzeile) */
export function QuelleZeile({ fakt, className, sprache = "de" }) {
  const q = fakt?.quelle;
  if (!q) return null;
  const eigen = q.art === "eigen";
  const en = sprache === "en";
  return h(
    "p",
    { className: cn("text-[12.5px] leading-relaxed text-ink-500", className), "data-fakt-quelle": fakt.id },
    h("span", { className: "font-semibold" }, en ? (eigen ? "Basis: " : "Source: ") : eigen ? "Grundlage: " : "Quelle: "),
    q.url
      ? h(
          "a",
          {
            href: q.url,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "break-words text-ink-700 underline decoration-ink-300 underline-offset-2 transition-colors hover:text-navy-700 hover:decoration-navy-400",
          },
          en ? quelleTitelEn(q) : q.titel,
          h(ExternalLink, { "aria-hidden": "true", className: "ml-0.5 inline h-3 w-3 align-[-1px]" }),
          h("span", { className: "sr-only" }, en ? " (opens in a new window)" : " (öffnet in neuem Fenster)")
        )
      : h("span", null, en ? quelleTitelEn(q) : q.titel),
    fakt.abruf
      ? h("span", null, en ? ` · ${eigen ? "as at" : "retrieved"} ${datumKurzEn(fakt.abruf)}` : ` · ${eigen ? "Stand" : "abgerufen"} ${datumDe(fakt.abruf)}`)
      : null
  );
}

/** Text mit **fett** (wie Region/Fett) */
export function mitFett(text) {
  if (typeof text !== "string") return text;
  return text.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 === 1 ? h("strong", { key: i, className: "font-semibold text-ink-900" }, t) : t));
}

export default function FristenListe({ land = "DE", heute, liste, leerText, className, sprache = "de" }) {
  const en = sprache === "en";
  const jetzt = heute || new Date();
  const eintraege = fristenFuer(land, { heute: jetzt, liste });
  if (!eintraege.length) {
    return h(
      "p",
      { className: cn("rounded-3xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200/70", className), "data-fristen-land": land, "data-fristen-leer": "" },
      leerText ||
        (en ? `There are currently no open dates in the register for ${LAND_NAME_EN[land] || land}.` : `Derzeit sind für ${LAND_NAME[land] || land} keine offenen Termine im Register.`)
    );
  }
  return h(
    "ul",
    { className: cn("grid gap-4 md:grid-cols-2", className), "data-fristen-land": land },
    eintraege.map((f) =>
      h(
        "li",
        {
          key: `${f.id}|${f.land}`,
          className: "flex min-w-0 flex-col rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 md:p-6",
          "data-fakt": f.id,
          "data-fakt-land": f.land,
        },
        h(
          "p",
          { className: "inline-flex items-center gap-2 text-[13px] font-semibold text-ov-700" },
          h(CalendarDays, { "aria-hidden": "true", className: "h-4 w-4 shrink-0" }),
          h("span", null, en ? terminTextEn(f.wert) : terminText(f.wert))
        ),
        h("h3", { className: "mt-2 font-display text-[17px] font-bold leading-snug text-ink-900" }, (en && faktEn(f.id, "titel")) || f.wert.titel),
        f.wert.text ? h("p", { className: "mt-2.5 text-[14.5px] leading-relaxed text-ink-600" }, mitFett((en && faktEn(f.id, "text")) || f.wert.text)) : null,
        h(
          "div",
          { className: "mt-4 flex flex-wrap items-center gap-x-3 gap-y-2" },
          h(StandEtikett, { fakt: f, heute: jetzt, sprache }),
          f.gueltigBis
            ? h("span", { className: "text-[12px] text-ink-500" }, en ? `Entry valid until ${datumKurzEn(f.gueltigBis)}` : `Eintrag gilt bis ${datumDe(f.gueltigBis)}`)
            : null
        ),
        h("div", { className: "mt-auto pt-4" }, h(QuelleZeile, { fakt: f, className: "border-t border-ink-200/70 pt-3", sprache }))
      )
    )
  );
}
