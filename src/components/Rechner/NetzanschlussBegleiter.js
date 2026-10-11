"use client";

// src/components/Rechner/NetzanschlussBegleiter.js – Netzanschluss 2.0 (Welle 4, Paket NETZ2)
//
// Ablauf-Begleiter je Land unter dem Netzanschluss-Rechner: Schritt-für-Schritt-Strecke
// (DE: Netzanschlussbegehren § 8 EEG; AT: Netzzugangsantrag/TOR Erzeuger; CH: Netzanschluss-
// gesuch/Werkvorschriften) mit Dokumenten-Checkliste je Schritt, Fristen- und Statusanzeige
// sowie typischen Ablehnungsgründen. Inhalte und Statuslogik: src/lib/rechner/netzanschlussAblauf.js.
// Keine Geldwerte – Kostenschätzung nur im Rechner darüber (DE). Am Ende führt der Stand in die
// Lead-Kette: Bericht-Baustein (rechner „netzanschluss“, alle drei Länder) und vorbelegte Anfrage.

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, ListChecks, Lightbulb } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl } from "./bausteine";
import { anfrageVorbelegen } from "./ErgebnisAnfrage";
import BerichtAnfordern from "@/components/Bericht/BerichtAnfordern";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { pfad } from "@/lib/land";
import { ABLAUF_LAENDER, rechneAblauf } from "@/lib/rechner/netzanschlussAblauf";

const TEXTE = {
  de: {
    eyebrow: "Ablauf-Begleiter",
    titel: "Vom Antrag bis zur Einspeisung – Schritt für Schritt",
    lead: "Haken Sie ab, was erledigt ist: Der Begleiter zeigt den nächsten Schritt, die Unterlagen dafür und – wo gesetzlich belegt – die Frist.",
    land: "Land",
    laender: { de: ["Deutschland"], at: ["Österreich"], ch: ["Schweiz"] },
    stand: (a, b) => `${a} von ${b} Schritten erledigt`,
    fortschrittAria: (a, b) => `Fortschritt: ${a} von ${b} Schritten erledigt`,
    fertig: "Alle Schritte abgehakt – jetzt läuft der Betrieb.",
    naechster: "Als Nächstes:",
    schrittErledigt: (t) => `Schritt „${t}“ als erledigt markieren`,
    frist: "Frist",
    dokumente: "Unterlagen für diesen Schritt",
    status: { erledigt: "erledigt", aktiv: "als Nächstes", offen: "offen" },
    ablehnungen: "Typische Ablehnungsgründe – und was dann hilft",
    hilfe: "Was hilft:",
    quellen: "Grundlagen:",
    fuss: "Fachliche Orientierung, keine Rechtsberatung. Verbindlich sind die Auskünfte und Bedingungen Ihres Netzbetreibers.",
    anfrageTitel: "Wir übernehmen den Ablauf für Sie.",
    anfrageText: "Als Projektentwickler stellen wir Begehren bzw. Antrag, halten die Fristen nach und verhandeln mit dem Netzbetreiber – für Flächeneigentümer kostenfrei.",
    anfrageKnopf: "Mit diesem Stand anfragen",
    nachricht: (landName, a, b, naechster) =>
      `Aus dem Ablauf-Begleiter Netzanschluss (${landName}): ${a} von ${b} Schritten erledigt${naechster ? `, als Nächstes „${naechster}“` : ""}. Bitte um Unterstützung beim Netzanschluss.`,
  },
  en: {
    eyebrow: "Process companion",
    titel: "From application to feed-in – step by step",
    lead: "Tick off what is done: the companion shows the next step, the documents it needs and – where legally established – the deadline.",
    land: "Country",
    laender: { de: ["Germany"], at: ["Austria"], ch: ["Switzerland"] },
    stand: (a, b) => `${a} of ${b} steps done`,
    fortschrittAria: (a, b) => `Progress: ${a} of ${b} steps done`,
    fertig: "All steps ticked off – the plant is in operation.",
    naechster: "Next up:",
    schrittErledigt: (t) => `Mark step “${t}” as done`,
    frist: "Deadline",
    dokumente: "Documents for this step",
    status: { erledigt: "done", aktiv: "next up", offen: "open" },
    ablehnungen: "Typical rejection reasons – and what helps",
    hilfe: "What helps:",
    quellen: "Basis:",
    fuss: "Professional guidance, not legal advice. Only your grid operator's information and conditions are binding.",
    anfrageTitel: "We take over the process for you.",
    anfrageText: "As a project developer, we submit the request or application, track the deadlines and negotiate with the grid operator – free of charge for landowners.",
    anfrageKnopf: "Enquire with this status",
    nachricht: (landName, a, b, naechster) =>
      `From the grid connection process companion (${landName}): ${a} of ${b} steps done${naechster ? `, next up “${naechster}”` : ""}. Please support us with the grid connection.`,
  },
};

const LAENDER_OPT = [{ id: "de" }, { id: "at" }, { id: "ch" }];
const STATUS_STIL = {
  erledigt: "bg-ov-50 text-ov-800 ring-ov-200",
  aktiv: "bg-sun-50 text-sun-700 ring-sun-200",
  offen: "bg-ink-100 text-ink-600 ring-ink-200",
};

export default function NetzanschlussBegleiter() {
  const seitenLand = useSeitenLand();
  const sprache = useSprache();
  const en = sprache === "en";
  const t = TEXTE[en ? "en" : "de"];
  const [land, setLand] = useState(() => {
    const l = String(seitenLand || "").toLowerCase();
    return ABLAUF_LAENDER.includes(l) ? l : "de";
  });
  const [erledigt, setErledigt] = useState([]);
  const r = useMemo(() => rechneAblauf({ land, erledigt }), [land, erledigt]);
  const landWechseln = (l) => {
    setLand(l);
    setErledigt([]); // Schritte gehören zu einem Verfahren – beim Landwechsel neu beginnen
  };
  const umschalten = (id) => setErledigt((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  const landName = t.laender[land][0];
  const txt = (s) => (en ? s.textEn : s.text);
  const titel = (s) => (en ? s.titelEn : s.titel);
  const fristHinweis = en ? r.fristHinweisEn : r.fristHinweis;

  return (
    <section
      aria-labelledby="na-begleiter-titel"
      className="mt-8 overflow-clip rounded-[2rem] bg-white shadow-[0_40px_80px_-40px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 print:shadow-none"
    >
      <div className="border-b border-ink-100 bg-sand-50 p-5 sm:p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-ov-700">
              <ListChecks aria-hidden="true" className="h-4 w-4" /> {t.eyebrow}
            </p>
            <h2 id="na-begleiter-titel" className="mt-2 font-display text-[clamp(1.35rem,1.15rem+0.8vw,1.8rem)] font-extrabold leading-tight tracking-tight text-ink-900">
              {t.titel}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{t.lead}</p>
          </div>
          <div className="w-full shrink-0 md:w-72">
            <Auswahl legende={t.land} wert={land} onChange={landWechseln} optionen={LAENDER_OPT.map((x) => ({ ...x, label: t.laender[x.id][0] }))} klein />
          </div>
        </div>

        {/* Statusanzeige */}
        <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[13.5px] font-semibold text-ink-800">{en ? r.verfahrenEn : r.verfahren}</p>
            <p className="ov-num text-[13px] font-semibold text-ink-600">{t.stand(r.anzahlErledigt, r.anzahl)}</p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={r.anzahl}
            aria-valuenow={r.anzahlErledigt}
            aria-label={t.fortschrittAria(r.anzahlErledigt, r.anzahl)}
            className="mt-2.5 h-2 overflow-hidden rounded-full bg-ink-100"
          >
            <div className="ov-fortschritt h-full rounded-full bg-ov-500" style={{ width: `${Math.round(r.fortschritt * 100)}%` }} />
          </div>
          <p className="mt-2.5 text-[13.5px] leading-snug text-ink-600" aria-live="polite">
            {r.fertig ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-ov-800">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {t.fertig}
              </span>
            ) : (
              <>
                <span className="font-semibold text-ink-800">{t.naechster}</span> {titel(r.naechster)}
              </>
            )}
          </p>
        </div>

        {fristHinweis && (
          <p className="mt-4 flex gap-2.5 rounded-2xl bg-navy-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-navy-100" data-land-hinweis={land}>
            <CalendarClock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-500" />
            <span>{fristHinweis}</span>
          </p>
        )}
      </div>

      {/* Schritt-für-Schritt-Strecke */}
      <ol className="p-5 sm:p-6 md:p-8">
        {r.schritte.map((s, i) => (
          <li key={s.id} className={cn("relative pb-6 pl-10 sm:pl-12", i === r.schritte.length - 1 && "pb-0")}>
            {/* Verbindungslinie */}
            {i < r.schritte.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-9 h-[calc(100%-2rem)] w-0.5 rounded bg-ink-100 sm:left-[17px]" />}
            {/* Abhaken */}
            <span className="absolute left-0 top-0.5">
              <input
                type="checkbox"
                id={`na-schritt-${s.id}`}
                checked={s.status === "erledigt"}
                onChange={() => umschalten(s.id)}
                className="peer h-8 w-8 cursor-pointer appearance-none rounded-full bg-white ring-2 ring-inset ring-ink-300 transition checked:bg-ov-600 checked:ring-ov-600 hover:ring-ov-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ov-300 sm:h-9 sm:w-9"
                aria-label={t.schrittErledigt(titel(s))}
              />
              <CheckCircle2 aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto hidden h-5 w-5 text-white peer-checked:block" />
              <span aria-hidden="true" className="ov-num pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] font-bold text-ink-600 peer-checked:hidden">
                {s.nummer}
              </span>
            </span>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <label htmlFor={`na-schritt-${s.id}`} className={cn("cursor-pointer font-display text-[17px] font-bold tracking-tight", s.status === "erledigt" ? "text-ink-500 line-through decoration-ink-300" : "text-ink-900")}>
                {titel(s)}
              </label>
              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ring-inset", STATUS_STIL[s.status])}>{t.status[s.status]}</span>
            </div>
            <p className="mt-1.5 max-w-3xl text-[14px] leading-relaxed text-ink-600">{txt(s)}</p>
            {s.frist && (
              <p className="mt-2 inline-flex items-start gap-1.5 rounded-xl bg-sun-50 px-3 py-1.5 text-[13px] font-medium leading-snug text-sun-800 ring-1 ring-inset ring-sun-200">
                <CalendarClock aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">{t.frist}: </span>
                  {en ? s.frist.en : s.frist.de}
                </span>
              </p>
            )}
            <div className="mt-3 max-w-3xl rounded-2xl bg-ink-50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-500">
                <FileText aria-hidden="true" className="h-3.5 w-3.5" /> {t.dokumente}
              </p>
              <ul className="mt-2 space-y-1.5">
                {s.dokumente.map((doc) => (
                  <li key={doc.de} className="flex gap-2 text-[13.5px] leading-snug text-ink-700">
                    <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ov-500" />
                    {en ? doc.en : doc.de}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      {/* Ablehnungsgründe und Abschluss */}
      <div className="border-t border-ink-100 p-5 sm:p-6 md:p-8">
        <section aria-labelledby="na-ablehnungen" className="rounded-3xl bg-navy-950 p-5 text-white md:p-6">
          <h3 id="na-ablehnungen" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight">
            <AlertTriangle aria-hidden="true" className="h-5 w-5 text-sun-400" /> {t.ablehnungen}
          </h3>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {r.ablehnungen.map((a) => (
              <li key={a.grund} className="rounded-2xl bg-white/5 p-4 ring-1 ring-inset ring-white/10">
                <p className="text-[14px] font-semibold leading-snug text-white">{en ? a.grundEn : a.grund}</p>
                <p className="mt-1.5 flex gap-2 text-[13.5px] leading-relaxed text-white/80">
                  <Lightbulb aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-300" />
                  <span>
                    <span className="font-semibold text-ov-300">{t.hilfe} </span>
                    {en ? a.hilfeEn : a.hilfe}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
          <span className="font-semibold">{t.quellen}</span>{" "}
          {r.quellen.map((q, i) => (
            <span key={q.name}>
              {i > 0 && " · "}
              {q.url ? (
                <a href={q.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-2 hover:text-ink-700">
                  {q.name}
                </a>
              ) : (
                q.name
              )}
            </span>
          ))}
          {" – "}
          {t.fuss}
        </p>

        {/* Lead-Kette: vorbelegte Anfrage + Bericht-Baustein (Double-Opt-in, Telefon freiwillig) */}
        <div className="mt-6 rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6 print:hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-[19px] font-bold leading-snug text-ink-900">{t.anfrageTitel}</p>
              <p className="mt-1.5 text-[13.5px] leading-snug text-ink-600">{t.anfrageText}</p>
            </div>
            <Button
              href={pfad("/flaechencheck")}
              size="lg"
              pfeil
              className="w-full shrink-0 sm:w-auto"
              data-ov-cta
              onClick={() => anfrageVorbelegen("flaeche", t.nachricht(landName, r.anzahlErledigt, r.anzahl, r.naechster ? titel(r.naechster) : null))}
            >
              {t.anfrageKnopf}
            </Button>
          </div>
        </div>
        <BerichtAnfordern rechner="netzanschluss" land={land.toUpperCase()} eingaben={{ erledigt: r.erledigt }} />
      </div>
    </section>
  );
}
