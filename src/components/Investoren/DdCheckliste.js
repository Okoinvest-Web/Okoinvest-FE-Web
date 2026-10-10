"use client";

import { useState } from "react";
import { Check, FileSearch, Gauge, Landmark, MapPinned, PlugZap, Scale, Wrench } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import useLand from "@/components/Land/useLand";

/**
 * Interaktive Due-Diligence-Checkliste für Solarprojekte. Rein clientseitig,
 * speichert nichts – zum Abhaken beim Lesen eines Exposés.
 *
 * Ländermodell (W3-0): nurDE = Indizes der Prüfpunkte, die deutsches Recht bzw. deutsche Register
 * und Normen nennen. In AT/CH stehen sie mit „In Deutschland:“ davor (keine ungeprüften AT/CH-
 * Entsprechungen); die Seite zeigt darunter den Länderhinweis.
 */

export const DD_BEREICHE = [
  {
    id: "flaeche",
    icon: MapPinned,
    titel: "Flächensicherung",
    punkte: [
      "Pacht- oder Nutzungsverträge für alle Flurstücke, Laufzeit mindestens Betriebsdauer plus Rückbau",
      "Beschränkte persönliche Dienstbarkeiten im Grundbuch (Anlage, Leitungen, Zuwegung) und Rangrücktritt der Grundpfandgläubiger",
      "Zustimmung aller Eigentümer, Erbengemeinschaften und Pächter; Kündigung laufender Landpacht",
      "Übertragbarkeit der Verträge auf Käufer und finanzierende Bank (Eintrittsrecht)",
    ],
  },
  {
    id: "genehmigung",
    icon: Landmark,
    titel: "Genehmigung & Baurecht",
    nurDE: [0, 2, 4],
    punkte: [
      "Bebauungsplan: Aufstellungsbeschluss, Beteiligung, Satzungsbeschluss, Bekanntmachung – bzw. Privilegierung nach § 35 BauGB",
      "Baugenehmigung mit Auflagen, Fristen und Nebenbestimmungen",
      "Umwelt- und Artenschutz (Umweltbericht, saP, Ausgleichsflächen), ggf. UVP-Vorprüfung",
      "Blendgutachten, Boden- und Kampfmittelgutachten, Denkmal- und Wasserschutz",
      "Städtebaulicher Vertrag und Vereinbarung nach § 6 EEG mit der Gemeinde",
    ],
  },
  {
    id: "netz",
    icon: PlugZap,
    titel: "Netzanschluss",
    nurDE: [3],
    punkte: [
      "Netzanschlusszusage mit Einspeisepunkt, Spannungsebene und Leistung",
      "Reservierung und deren Fristen, Baukostenzuschuss, Kostenschätzung des Netzbetreibers",
      "Kabeltrasse: Wegerechte, Kreuzungen, Genehmigungen entlang der Trasse",
      "Einspeisemanagement, Redispatch-Erwartung und ggf. flexible Netzanschlussvereinbarung",
    ],
  },
  {
    id: "ertrag",
    icon: Gauge,
    titel: "Ertragsgutachten",
    nurDE: [2],
    punkte: [
      "Unabhängiges Gutachten mit P50 und P90 (1 und 10 Jahre), Einstrahlungsdaten und Unsicherheiten",
      "Layout, Modul- und Wechselrichterwahl, Verschattung, Verluste, Degradation",
      "Bei Agri-PV: Nachweis nach DIN SPEC 91434 und landwirtschaftliches Nutzungskonzept",
    ],
  },
  {
    id: "technik",
    icon: Wrench,
    titel: "Technik & Bau",
    nurDE: [2],
    punkte: [
      "EPC-Angebot oder -Vertrag, Bauzeitenplan, Gewährleistung und Garantien",
      "Baugrund und Rammtests, Einfriedung, Zuwegung, Brandschutz",
      "Umspannwerk bzw. Übergabestation, Schutzkonzept, Zertifizierung nach VDE-Anwendungsregeln",
      "Betriebsführung, Wartung, Monitoring und Versicherung",
    ],
  },
  {
    id: "recht",
    icon: Scale,
    titel: "Recht, Erlöse & Gesellschaft",
    nurDE: [1, 2, 3],
    punkte: [
      "Projektgesellschaft: Handelsregister, Gesellschafter, keine Altlasten oder Nebenabreden",
      "EEG-Zuschlag (Gebotstermin, Fristen, Pönalen) oder PPA-Term-Sheet bzw. -Vertrag",
      "Direktvermarktungsvertrag, Förderberechtigung, Anmeldung im Marktstammdatenregister",
      "Rückbauverpflichtung und Sicherheitsleistung, Steuern und Zerlegung der Gewerbesteuer",
    ],
  },
];

/** Englisch (Sprachmodell): deutsche Rechtsbegriffe erklärt statt ersetzt – die Liste folgt deutschem Recht. */
const TEXTE = {
  de: {
    bereiche: DD_BEREICHE,
    hinweis: "Beim Lesen eines Exposés abhaken – nichts wird gespeichert.",
    fortschritt: "Fortschritt der Checkliste",
    inDe: "In Deutschland: ",
  },
  en: {
    bereiche: [
      {
        titel: "Land securing",
        punkte: [
          "Lease or land-use agreements for all plots, term at least the operating life plus decommissioning",
          "Limited personal easements in the land register (plant, cables, access) and subordination by the mortgage lenders",
          "Consent of all owners, communities of heirs and tenants; termination of existing agricultural leases",
          "Transferability of the agreements to the buyer and the financing bank (step-in right)",
        ],
      },
      {
        titel: "Permits & building rights",
        punkte: [
          "Development plan (Bebauungsplan): resolution to draw up, public participation, adoption, publication – or privileged status under § 35 BauGB (German Federal Building Code)",
          "Building permit with conditions, deadlines and ancillary provisions",
          "Environmental and species protection (environmental report, special species protection assessment, compensation areas), screening for an environmental impact assessment where required",
          "Glare report, soil and unexploded ordnance surveys, heritage and water protection",
          "Urban development contract and agreement with the municipality under § 6 EEG (German Renewable Energy Sources Act)",
        ],
      },
      {
        titel: "Grid connection",
        punkte: [
          "Grid connection commitment with feed-in point, voltage level and capacity",
          "Reservation and its deadlines, construction cost contribution, cost estimate from the grid operator",
          "Cable route: rights of way, crossings, permits along the route",
          "Feed-in management, expected redispatch and, where applicable, a flexible grid connection agreement",
        ],
      },
      {
        titel: "Yield assessment",
        punkte: [
          "Independent assessment with P50 and P90 (1 and 10 years), irradiation data and uncertainties",
          "Layout, choice of modules and inverters, shading, losses, degradation",
          "For agrivoltaics: evidence under DIN SPEC 91434 and an agricultural use concept",
        ],
      },
      {
        titel: "Technology & construction",
        punkte: [
          "EPC offer or contract, construction schedule, warranties and guarantees",
          "Subsoil and pile-driving tests, fencing, access, fire protection",
          "Substation or transfer station, protection concept, certification under the VDE application rules",
          "Operations management, maintenance, monitoring and insurance",
        ],
      },
      {
        titel: "Legal, revenues & company",
        punkte: [
          "Project company: commercial register, shareholders, no legacy liabilities or side agreements",
          "EEG tender award (bid date, deadlines, penalties) or PPA term sheet or contract",
          "Direct marketing agreement, eligibility for support, registration in the Market Master Data Register (Marktstammdatenregister)",
          "Decommissioning obligation and security, taxes and the allocation of trade tax between municipalities",
        ],
      },
    ],
    hinweis: "Tick off while reading an exposé – nothing is saved.",
    fortschritt: "Checklist progress",
    inDe: "In Germany: ",
  },
};

export default function DdCheckliste() {
  const t = useTexte(TEXTE);
  const { land } = useLand();
  const fremd = land === "AT" || land === "CH"; // deutsche Rechtsbegriffe kennzeichnen
  const [haken, setHaken] = useState({});
  const gesamt = t.bereiche.reduce((s, b) => s + b.punkte.length, 0);
  const erledigt = Object.values(haken).filter(Boolean).length;

  return (
    <div>
      <div className="sticky top-[84px] z-10 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/95 px-5 py-4 shadow-e2 ring-1 ring-ink-200/70 backdrop-blur max-md:static">
        <p className="flex items-center gap-2.5 text-[14.5px] font-semibold text-ink-800">
          <FileSearch aria-hidden="true" className="h-5 w-5 text-ov-600" />
          {t.hinweis}
        </p>
        <div className="flex min-w-[200px] flex-1 items-center gap-3 sm:max-w-xs">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={gesamt} aria-valuenow={erledigt} aria-label={t.fortschritt}>
            <div className="h-full w-full origin-left rounded-full bg-ov-500 motion-safe:transition-transform motion-safe:duration-300" style={{ transform: `scaleX(${erledigt / gesamt})` }} />
          </div>
          <span className="ov-num shrink-0 text-[13.5px] font-semibold text-ink-700">
            {erledigt}/{gesamt}
          </span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {t.bereiche.map((b) => {
          const Icon = b.icon;
          const fertig = b.punkte.every((_, i) => haken[`${b.id}-${i}`]);
          const anzahl = b.punkte.filter((_, i) => haken[`${b.id}-${i}`]).length;
          return (
            <fieldset key={b.id} className={cn("rounded-3xl bg-white p-6 shadow-e1 ring-1 transition-[box-shadow,color] duration-300", fertig ? "shadow-e2 ring-2 ring-ov-400" : "ring-ink-200/70")}>
              <legend className="sr-only">{b.titel}</legend>
              <div className="flex items-center gap-3" aria-hidden="true">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl transition-colors", fertig ? "bg-ov-500 text-white" : "bg-ov-50 text-ov-600")}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="min-w-0 flex-1 font-display text-[18px] font-bold text-ink-900">{b.titel}</h3>
                <span className={cn("ov-num shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold", fertig ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-600")}>
                  {anzahl}/{b.punkte.length}
                </span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {b.punkte.map((p, i) => {
                  const k = `${b.id}-${i}`;
                  const an = !!haken[k];
                  return (
                    <li key={k}>
                      <label className="group flex cursor-pointer items-start gap-3 text-[14px] leading-relaxed text-ink-700 has-[:focus-visible]:rounded-lg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500">
                        <input type="checkbox" checked={an} onChange={(e) => setHaken((h) => ({ ...h, [k]: e.target.checked }))} className="sr-only" />
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md ring-1 transition-colors",
                            an ? "bg-ov-500 text-white ring-ov-500" : "bg-white text-transparent ring-ink-300 group-hover:ring-ov-400"
                          )}
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <span className={an ? "text-ink-500 line-through decoration-ink-300" : undefined}>
                          {fremd && b.nurDE?.includes(i) && <span className="font-semibold text-ink-500">{t.inDe}</span>}
                          {p}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}
