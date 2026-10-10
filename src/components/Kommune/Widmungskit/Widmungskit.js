"use client";

// src/components/Kommune/Widmungskit/Widmungskit.js – AT-Widmungskit (Welle 3, Paket B8)
//
// Bundesland wählen → Ablauf der Umwidmung, beteiligte Stellen und Prüfpunkte mit Quelle (Server-Props aus den
// Regionsdaten, src/lib/kommune/widmung.js). Prüfpunkte zum Abhaken (nur im Browser, nichts wird gespeichert oder
// gesendet), Druckansicht über die Druckfunktion des Browsers. Lead: Ratsvorlage für Österreich (ohne Geldwerte)
// über den Bericht-Baustein – Gemeinde und Bundesland gehen mit, Name und E-Mail im Formular.

import { useId, useState } from "react";
import { CheckSquare, ExternalLink, ListChecks, Printer, Route, Users } from "lucide-react";
import Link from "@/components/Land/Link";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import Textfeld from "@/components/formular/Textfeld";
import { checkboxKlasse } from "@/components/formular/stil";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { GiltFuer } from "@/components/Land/LandHinweis";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { Gruppe } from "@/components/Rechner/bausteine";
import { ErgebnisKopf, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { STANDARD_BUNDESLAND } from "@/lib/rechner/kommunePflichten";

const GEMEINDE_MUSTER = /^[\p{L}\p{M}0-9 .,'’()/-]{2,80}$/u;

const TEXTE = {
  de: {
    bundesland: "Bundesland",
    gemeindeGruppe: "Ihre Gemeinde",
    gemeinde: "Name der Gemeinde",
    gemeindeHinweis: "Nur für die Ratsvorlage – die Checkliste funktioniert auch ohne.",
    titel: (bl) => `Umwidmung in ${bl}`,
    plakette: (n, m) => `${n} von ${m} abgehakt`,
    ablauf: "Ablauf",
    stellen: "Beteiligte Stellen",
    pruefpunkte: "Prüfpunkte vor der Widmung",
    pruefHinweis: "Zum Abhaken – bleibt nur in diesem Browserfenster.",
    quelle: "Quelle",
    gemeinsam: "Für ganz Österreich",
    region: (bl) => `Mehr zu ${bl}: Kulisse, Netz und Behörden`,
    drucken: "Checkliste drucken",
    vorlageTitel: "Als Ratsvorlage anfordern",
    vorlageText: "Die Prüfpunkte Ihres Bundeslands als druckfertige Ratsvorlage mit Beschlussvorschlag (Muster) – per Bestätigungslink an Ihre E-Mail-Adresse. Für Österreich ohne Geldwerte.",
    vorlageKnopf: "Ratsvorlage anfordern",
    gemeindeFehlt: "Bitte tragen Sie zuerst den Namen der Gemeinde ein (Feld „Name der Gemeinde“).",
    hinweis: "Zusammengestellt aus unseren Regionsdaten mit Quelle je Punkt – keine Rechtsberatung. Maßgeblich sind Raumordnungsgesetz und Verordnungen Ihres Landes in der geltenden Fassung.",
  },
  en: {
    bundesland: "Federal state",
    gemeindeGruppe: "Your municipality",
    gemeinde: "Name of the municipality",
    gemeindeHinweis: "Only for the council paper – the checklist also works without it.",
    titel: (bl) => `Rezoning in ${bl}`,
    plakette: (n, m) => `${n} of ${m} ticked`,
    ablauf: "Procedure",
    stellen: "Authorities involved",
    pruefpunkte: "Checkpoints before zoning",
    pruefHinweis: "To tick off – stays in this browser window only.",
    quelle: "Source",
    gemeinsam: "For all of Austria",
    region: (bl) => `More on ${bl}: land categories, grid and authorities`,
    drucken: "Print checklist",
    vorlageTitel: "Request as a council paper",
    vorlageText: "The checkpoints of your federal state as a ready-to-print council paper with a draft resolution (template) – via a confirmation link to your email address. For Austria without monetary values. The paper itself is in German.",
    vorlageKnopf: "Request council paper",
    gemeindeFehlt: "Please enter the name of the municipality first (field “Name of the municipality”).",
    hinweis: "Compiled from our regional data with a source for each point – not legal advice. The spatial planning act and ordinances of your state in their current version are authoritative.",
  },
};

/**
 * @param {{ kits: Array<object>, namen: Record<string,string>, gemeinsam: Array<{titel,text}> }} p
 */
export default function Widmungskit({ kits, gemeinsam }) {
  const t = useTexte(TEXTE);
  const seitenLand = useSeitenLand();
  const id = useId();
  const [slug, setSlug] = useState(STANDARD_BUNDESLAND.AT);
  const [gemeinde, setGemeinde] = useState("");
  const [haken, setHaken] = useState({});
  const kit = kits.find((k) => k.slug === slug) || kits[0];
  const gemeindeName = gemeinde.trim().replace(/\s{2,}/g, " ");
  const gemeindeOk = GEMEINDE_MUSTER.test(gemeindeName);
  const abgehakt = kit.pruefpunkte.filter((p) => haken[`${kit.slug}:${p.titel}`]).length;

  return (
    <RechnerRahmen
      werkzeuge={false}
      eingaben={
        <div className="space-y-8">
          <Gruppe titel={t.bundesland}>
            <Textfeld id={`${id}-bl`} als="select" label={t.bundesland} value={slug} onChange={(e) => setSlug(e.target.value)}>
              {kits.map((k) => (
                <option key={k.slug} value={k.slug}>
                  {k.name}
                </option>
              ))}
            </Textfeld>
          </Gruppe>
          <Gruppe titel={t.gemeindeGruppe}>
            <Textfeld id={`${id}-gm`} label={t.gemeinde} hinweis={t.gemeindeHinweis} maxLength={80} autoComplete="off" value={gemeinde} onChange={(e) => setGemeinde(e.target.value)} gueltig={gemeindeOk} />
          </Gruppe>
          <section aria-labelledby={`${id}-gs`} className="rounded-2xl bg-white/70 p-4 ring-1 ring-ink-200">
            <h3 id={`${id}-gs`} className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">
              {t.gemeinsam}
            </h3>
            <ul className="mt-3 space-y-3">
              {gemeinsam.map((g) => (
                <li key={g.titel} className="text-[13.5px] leading-relaxed text-ink-700">
                  <span className="block font-semibold text-ink-900">{g.titel}</span>
                  {g.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      }
      ergebnis={
        <>
          <ErgebnisKopf titel={t.titel(kit.name)} plakette={t.plakette(abgehakt, kit.pruefpunkte.length)} />
          {seitenLand === null && (
            <p className="mt-1">
              <GiltFuer land="AT" />
            </p>
          )}
          <section aria-labelledby={`${id}-ab`} className="mt-5 rounded-3xl bg-ink-50 p-5 md:p-6">
            <h3 id={`${id}-ab`} className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
              <Route aria-hidden="true" className="h-4 w-4 text-ov-700" />
              {t.ablauf}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-700">{kit.ablauf}</p>
            <h4 className="mt-5 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              <Users aria-hidden="true" className="h-3.5 w-3.5" />
              {t.stellen}
            </h4>
            <ol className="mt-2 space-y-2">
              {kit.stellen.map((s, i) => (
                <li key={s.name} className="flex gap-3 text-[14px] leading-relaxed">
                  <span aria-hidden="true" className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[12px] font-bold text-ov-800 ring-1 ring-inset ring-ov-200">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <strong className="font-semibold text-ink-900">{s.name}</strong> – <span className="text-ink-700">{s.rolle}</span>
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="ml-1.5 inline-flex items-center gap-1 text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                        {t.quelle}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                        <span className="sr-only">: {s.name}</span>
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby={`${id}-pp`} className="mt-5 rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id={`${id}-pp`} className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
                <ListChecks aria-hidden="true" className="h-4 w-4 text-ov-700" />
                {t.pruefpunkte}
              </h3>
              <Button type="button" variant="secondary" size="sm" icon={Printer} className="print:hidden" onClick={() => window.print()}>
                {t.drucken}
              </Button>
            </div>
            <p className="mt-1 text-[12.5px] text-ink-500 print:hidden">{t.pruefHinweis}</p>
            <ul className="mt-4 space-y-3">
              {kit.pruefpunkte.map((p) => {
                const schluessel = `${kit.slug}:${p.titel}`;
                const an = !!haken[schluessel];
                return (
                  <li key={schluessel} className={cn("rounded-2xl px-4 py-3.5 ring-1 ring-inset transition-colors md:px-5", an ? "bg-ov-50 ring-ov-200" : "bg-white ring-ink-200/80")}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={an}
                        onChange={(e) => setHaken((h) => ({ ...h, [schluessel]: e.target.checked }))}
                        className={checkboxKlasse}
                      />
                      <span className="min-w-0">
                        <span className="block text-[14.5px] font-semibold text-ink-900">{p.titel}</span>
                        <span className="mt-1 block text-[14px] leading-relaxed text-ink-700">{p.text}</span>
                      </span>
                    </label>
                    <a href={p.quelle.url} target="_blank" rel="noopener noreferrer" className="ml-8 mt-1.5 inline-flex items-center gap-1 text-[12.5px] text-ink-500 underline decoration-ink-300 underline-offset-2 hover:text-ink-800">
                      {t.quelle}: {p.quelle.titel}
                      <ExternalLink aria-hidden="true" className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-600">
              <CheckSquare aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {t.hinweis}
            </p>
            <Link href={kit.href} className="mt-3 inline-flex text-[14px] font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2 hover:decoration-current print:hidden">
              {t.region(kit.name)}
            </Link>
          </section>

          <BerichtAnfordern
            rechner="ratsvorlage"
            land="AT"
            eingaben={{ gemeinde: gemeindeName, bundesland: kit.slug }}
            texte={{ de: { titel: TEXTE.de.vorlageTitel, text: TEXTE.de.vorlageText, knopf: TEXTE.de.vorlageKnopf }, en: { titel: TEXTE.en.vorlageTitel, text: TEXTE.en.vorlageText, knopf: TEXTE.en.vorlageKnopf } }}
            deaktiviert={!gemeindeOk}
            deaktiviertHinweis={t.gemeindeFehlt}
          />
        </>
      }
    />
  );
}
