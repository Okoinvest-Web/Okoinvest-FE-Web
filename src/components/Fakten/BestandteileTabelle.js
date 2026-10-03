// src/components/Fakten/BestandteileTabelle.js
//
// Preisbestandteile eines Landes aus dem Faktenregister (Welle 2, Paket FRI): Umlagen und
// Netzentgelte mit Wert, Geltung, Stand (Prüfstatus), Quelle und Ablauf.
//  - Ein offener Wert (wert null) erscheint als „noch nicht veröffentlicht“ – mit dem erwarteten
//    Veröffentlichungstermin aus der Quelle, nie mit einem Schätzwert.
//  - Abgelaufene Einträge (gueltigBis vor heute) erscheinen nicht.
//  - Land als Parameter (DE | AT | CH); CH-Werte in CHF/Rp. über fmtFaktWert.
// Bewusst ohne JSX (createElement) und ohne Hooks – siehe FristenListe.js.
//
//   <BestandteileTabelle land="DE" />
//   bestandteileFuer("AT", { heute, liste })      reine Auswahl (Tests, Berichte)

import { createElement as h } from "react";
import { fakten as faktenAusRegister, istAbgelaufen, datumDe, fmtFaktWert } from "@/lib/fakten";
import { cn } from "@/components/ui/cn";
import { LAND_NAME, QuelleZeile, StandEtikett } from "./FristenListe";

export const PRAEFIXE_BESTANDTEILE = ["umlage.", "netzentgelt."];

/** Anzeigenamen der Bestandteile (unbekannte ids erscheinen mit ihrer id) */
export const BESTANDTEIL_NAME = {
  "umlage.kwkg": "KWKG-Umlage",
  "umlage.offshoreNetz": "Offshore-Netzumlage",
  "umlage.besondereNetznutzung": "Aufschlag für besondere Netznutzung",
  "netzentgelt.de.struktur": "Netzentgelte (Aufbau)",
  "netzentgelt.at.sne2027": "Systemnutzungsentgelte 2027",
  "netzentgelt.ch.elcomTarife2027": "Stromtarife 2027 der Grundversorgung",
};

export const TEXT_OFFEN = "noch nicht veröffentlicht";

/** „Veröffentlichung erwartet bis TT.MM.JJJJ“ aus der Notiz eines offenen Werts (oder null) */
export function erwarteteVeroeffentlichung(f) {
  const m = typeof f?.notiz === "string" ? f.notiz.match(/Veröffentlichung erwartet bis (\d{2}\.\d{2}\.\d{4})/) : null;
  return m ? m[1] : null;
}

/** Notiz ohne den (schon in der Wert-Spalte gezeigten) Satz „Veröffentlichung erwartet bis …“ */
const notizOhneTermin = (f) => (typeof f?.notiz === "string" ? f.notiz.replace(/Veröffentlichung erwartet bis \d{2}\.\d{2}\.\d{4}\.?\s*/, "").trim() : "");

/** Anzeigetext des Werts: offener Wert → „noch nicht veröffentlicht“ */
export function bestandteilWert(f, land = f?.land) {
  if (!f || f.wert === null || f.wert === undefined) return TEXT_OFFEN;
  return fmtFaktWert(f, land);
}

/**
 * Noch gültige Umlagen und Netzentgelte eines Landes (ohne Entwürfe, ohne Abgelaufene),
 * Umlagen vor Netzentgelten, sonst in Registerreihenfolge.
 */
export function bestandteileFuer(land, { heute = new Date(), liste } = {}) {
  const quelle = liste || PRAEFIXE_BESTANDTEILE.flatMap((praefix) => faktenAusRegister({ land, praefix }));
  const rang = (f) => PRAEFIXE_BESTANDTEILE.findIndex((p) => f.id.startsWith(p));
  return quelle
    .filter((f) => typeof f?.id === "string" && rang(f) >= 0 && (f.land === land || f.land === "DACH") && f.status !== "entwurf" && !istAbgelaufen(f, heute))
    .map((f, i) => ({ f, i }))
    .sort((a, b) => rang(a.f) - rang(b.f) || a.i - b.i)
    .map(({ f }) => f);
}

const geltung = (f) => {
  if (f.gueltigAb && f.gueltigBis) return `${datumDe(f.gueltigAb)} bis ${datumDe(f.gueltigBis)}`;
  if (f.gueltigAb) return `ab ${datumDe(f.gueltigAb)}`;
  if (f.gueltigBis) return `bis ${datumDe(f.gueltigBis)}`;
  return "laufend, bis zur nächsten Änderung";
};

const ZELLE = "align-top px-4 py-4 max-md:block max-md:px-0 max-md:py-1.5 max-md:before:mb-0.5 max-md:before:block max-md:before:text-[11.5px] max-md:before:font-semibold max-md:before:uppercase max-md:before:tracking-[0.08em] max-md:before:text-ink-500 max-md:before:content-[attr(data-label)]";

export default function BestandteileTabelle({ land = "DE", heute, liste, beschriftung, className }) {
  const jetzt = heute || new Date();
  const zeilen = bestandteileFuer(land, { heute: jetzt, liste });
  if (!zeilen.length) {
    return h(
      "p",
      { className: cn("rounded-3xl bg-white p-5 text-[14.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200/70", className), "data-bestandteile-land": land, "data-bestandteile-leer": "" },
      `Für ${LAND_NAME[land] || land} sind derzeit keine Preisbestandteile im Register.`
    );
  }
  const kopf = ["Bestandteil", "Wert", "Gilt", "Stand und Quelle"];
  return h(
    "div",
    { className: cn("overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70", className), "data-bestandteile-land": land },
    h(
      "table",
      { className: "w-full border-collapse text-left text-[14.5px] max-md:block" },
      h("caption", { className: "sr-only" }, beschriftung || `Preisbestandteile ${LAND_NAME[land] || land}`),
      h(
        "thead",
        { className: "bg-sand-50 max-md:sr-only" },
        h(
          "tr",
          null,
          kopf.map((k) => h("th", { key: k, scope: "col", className: "px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500" }, k))
        )
      ),
      h(
        "tbody",
        { className: "max-md:block" },
        zeilen.map((f) => {
          const offen = f.wert === null || f.wert === undefined;
          const erwartet = offen ? erwarteteVeroeffentlichung(f) : null;
          return h(
            "tr",
            {
              key: `${f.id}|${f.land}|${f.gueltigAb || ""}`,
              className: "border-t border-ink-200/70 max-md:block max-md:px-5 max-md:py-4 first:max-md:border-t-0",
              "data-fakt": f.id,
              "data-fakt-land": f.land,
              "data-fakt-offen": offen ? "" : undefined,
            },
            h("th", { scope: "row", "data-label": kopf[0], className: cn(ZELLE, "font-display text-[15.5px] font-bold text-ink-900 md:w-[22%]") }, BESTANDTEIL_NAME[f.id] || f.id),
            h(
              "td",
              { "data-label": kopf[1], className: cn(ZELLE, "md:w-[30%]") },
              h("span", { className: offen ? "font-semibold text-ink-600" : "font-semibold text-ink-900" }, bestandteilWert(f, land)),
              erwartet ? h("span", { className: "mt-1 block text-[13px] text-ink-500" }, `Veröffentlichung erwartet bis ${erwartet}`) : null
            ),
            h("td", { "data-label": kopf[2], className: cn(ZELLE, "text-ink-700 md:w-[16%]") }, geltung(f)),
            h(
              "td",
              { "data-label": kopf[3], className: ZELLE },
              h(StandEtikett, { fakt: f, heute: jetzt }),
              h(QuelleZeile, { fakt: f, className: "mt-2" }),
              notizOhneTermin(f) ? h("p", { className: "mt-1.5 text-[12.5px] leading-relaxed text-ink-500" }, notizOhneTermin(f)) : null
            )
          );
        })
      )
    )
  );
}
