"use client";

// src/components/Quellen/FaktenSuche.js – durchsuchbares Faktenregister (Welle 4, Paket FAKTEN)
//
// Rein clientseitige Suche ohne neue Abhängigkeit: Die Server-Seite /quellen übergibt alle
// Einträge (quellenEintraege(), src/lib/quellen/fakten.js); gefiltert wird hier mit derselben
// Funktion filtere() wie in den Tests. Keine Geschäftslogik: Werte, Status und „abgelaufen“
// sind serverseitig berechnet (schema.js/pruefen.js) und werden nur angezeigt.
//
// Jeder Fakt trägt seinen stabilen Anker (#fakt-<land>-<id>) als zitierfähige URL; der
// Link-Knopf kopiert die vollständige Adresse. Liegt beim Laden ein Anker in der URL,
// werden die Filter geleert, damit der Browser das Ziel findet.

import { Link2, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filtere, themaName } from "@/lib/quellen/filter";
import { cn } from "@/components/ui/cn";

const TEXTE = {
  de: {
    suche: "Suche in allen Fakten",
    platzhalter: "z. B. Pacht, EEG, Netzentgelt, 2027 …",
    land: "Land",
    thema: "Thema",
    klasse: "Qualitätsstufe",
    status: "Prüfstand",
    alle: "Alle",
    treffer: (n, g) => `${n} von ${g} Fakten`,
    keine: "Keine Fakten zu dieser Suche. Filter zurücksetzen oder anders formulieren.",
    zuruecksetzen: "Filter zurücksetzen",
    wert: "Wert",
    quelle: "Quelle",
    grundlage: "Grundlage",
    abgerufen: "abgerufen",
    stand: "Stand",
    gueltigAb: "gültig ab",
    gueltigBis: "gültig bis",
    unbefristet: "bis zur nächsten Änderung",
    pruefer: "Prüfer",
    notiz: "Hinweis",
    versionen: "Weitere zeitliche Versionen",
    link: "Zitierlink kopieren",
    kopiert: "Link kopiert",
    neuesFenster: "(öffnet in neuem Fenster)",
    klassen: { A: "A – Recht, Förderung, Abgaben, Fristen", B: "B – Markt-/Statistikwert mit Quelle", C: "C – eigene Einschätzung" },
    status_: { geprueft: "am Original geprüft", zu_pruefen: "Prüfung ausstehend", abgelaufen: "abgelaufen" },
    laender: { DE: "Deutschland", AT: "Österreich", CH: "Schweiz", DACH: "DACH (alle drei)" },
  },
  en: {
    suche: "Search all facts",
    platzhalter: "e.g. lease, EEG, network charge, 2027 …",
    land: "Country",
    thema: "Topic",
    klasse: "Quality level",
    status: "Review status",
    alle: "All",
    treffer: (n, g) => `${n} of ${g} facts`,
    keine: "No facts match this search. Reset the filters or rephrase.",
    zuruecksetzen: "Reset filters",
    wert: "Value",
    quelle: "Source",
    grundlage: "Basis",
    abgerufen: "retrieved",
    stand: "as of",
    gueltigAb: "valid from",
    gueltigBis: "valid until",
    unbefristet: "until the next change",
    pruefer: "Reviewer",
    notiz: "Note",
    versionen: "Other time versions",
    link: "Copy citation link",
    kopiert: "Link copied",
    neuesFenster: "(opens in a new window)",
    klassen: { A: "A – law, funding, levies, deadlines", B: "B – market/statistical value with source", C: "C – own estimate" },
    status_: { geprueft: "checked against the original", zu_pruefen: "review pending", abgelaufen: "expired" },
    laender: { DE: "Germany", AT: "Austria", CH: "Switzerland", DACH: "DACH (all three)" },
  },
};

const datumDe = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

const KLASSE_FARBE = {
  A: "bg-navy-50 text-navy-700 ring-navy-100",
  B: "bg-ov-50 text-ov-700 ring-ov-100",
  C: "bg-sun-50 text-sun-700 ring-sun-200",
};

const feld = "min-h-11 w-full rounded-xl bg-white px-3 py-2 text-[14.5px] text-ink-800 ring-1 ring-inset ring-ink-200/80 focus:outline-none focus:ring-2 focus:ring-navy-400";

function Auswahl({ id, label, wert, setzen, kinder }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[12.5px] font-semibold text-ink-600">{label}</span>
      <select id={id} value={wert} onChange={(e) => setzen(e.target.value)} className={feld}>
        {kinder}
      </select>
    </label>
  );
}

function ZitierLink({ anker, t }) {
  const [ok, setOk] = useState(false);
  const zeit = useRef(null);
  useEffect(() => () => clearTimeout(zeit.current), []);
  const kopieren = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}#${anker}`;
      await navigator.clipboard.writeText(url);
      setOk(true);
      clearTimeout(zeit.current);
      zeit.current = setTimeout(() => setOk(false), 2000);
    } catch {
      // Zwischenablage nicht verfügbar → der Anker-Link unten bleibt nutzbar
    }
  };
  return (
    <button
      type="button"
      onClick={kopieren}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[12.5px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200/80 transition-colors hover:text-navy-700 hover:ring-navy-200"
    >
      <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
      {ok ? t.kopiert : t.link}
      <span aria-live="polite" className="sr-only">
        {ok ? t.kopiert : ""}
      </span>
    </button>
  );
}

function FaktKarte({ e, t }) {
  return (
    <article id={e.anker} className="scroll-mt-28 rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 sm:p-6" aria-labelledby={`${e.anker}-id`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-100">{e.land}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset", KLASSE_FARBE[e.klasse] || KLASSE_FARBE.C)} title={t.klassen[e.klasse]}>
          {t.klassen[e.klasse] || e.klasse}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset",
            e.abgelaufen ? "bg-danger-50 text-danger-700 ring-danger-200" : e.status === "geprueft" ? "bg-ov-50 text-ov-700 ring-ov-100" : "bg-sun-50 text-sun-700 ring-sun-200"
          )}
        >
          {t.status_[e.status] || e.status}
        </span>
        <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600 ring-1 ring-inset ring-ink-200/70">{themaName(e.thema, t === TEXTE.en ? "en" : "de")}</span>
      </div>

      {e.abgelaufen ? (
        <p className="mt-3 rounded-xl bg-danger-50 px-3 py-2 text-[13px] font-semibold text-danger-700 ring-1 ring-inset ring-danger-200">{e.hinweis}</p>
      ) : null}

      <h3 id={`${e.anker}-id`} className="mt-3 break-all font-mono text-[13.5px] font-semibold text-ink-500">
        <a href={`#${e.anker}`} className="hover:text-navy-700 hover:underline">
          {e.id} · {e.land}
        </a>
      </h3>
      <p className="mt-1 text-pretty font-display text-[19px] font-bold text-ink-900">
        {e.wertText}
        {e.einheit && e.einheit !== "Text" ? <span className="ml-1.5 text-[14px] font-semibold text-ink-500">{e.einheit}</span> : null}
      </p>

      <dl className="mt-3 space-y-1 text-[13px] leading-relaxed text-ink-600">
        <div>
          <dt className="inline font-semibold text-ink-700">{e.quelleArt === "eigen" ? t.grundlage : t.quelle}: </dt>
          <dd className="inline">
            {e.quelleUrl ? (
              <a href={e.quelleUrl} target="_blank" rel="noopener noreferrer" className="text-ink-700 underline decoration-ink-300 underline-offset-2 transition-colors hover:text-navy-700 hover:decoration-navy-400">
                {e.quelleTitel}
                <span className="sr-only"> {t.neuesFenster}</span>
              </a>
            ) : (
              e.quelleTitel
            )}{" "}
            · {e.quelleArt === "eigen" ? t.stand : t.abgerufen} {datumDe(e.abruf)}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink-700">{t.gueltigAb}: </dt>
          <dd className="inline">
            {e.gueltigAb ? datumDe(e.gueltigAb) : "–"} · {t.gueltigBis}: {e.gueltigBis ? datumDe(e.gueltigBis) : t.unbefristet}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink-700">{t.pruefer}: </dt>
          <dd className="inline">{e.pruefer}</dd>
        </div>
        {e.notiz ? (
          <div>
            <dt className="inline font-semibold text-ink-700">{t.notiz}: </dt>
            <dd className="inline">{e.notiz}</dd>
          </div>
        ) : null}
      </dl>

      {e.weitereVersionen.length ? (
        <div className="mt-3 rounded-xl bg-ink-50/70 px-3 py-2 text-[12.5px] text-ink-600 ring-1 ring-inset ring-ink-200/60">
          <p className="font-semibold text-ink-700">{t.versionen}:</p>
          <ul className="mt-1 space-y-0.5">
            {e.weitereVersionen.map((v, i) => (
              <li key={i}>
                {v.gueltigAb ? `${t.gueltigAb} ${datumDe(v.gueltigAb)}: ` : ""}
                {v.wertText}
                {v.gueltigBis ? ` (${t.gueltigBis} ${datumDe(v.gueltigBis)})` : ""} · {t.status_[v.status] || v.status}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4">
        <ZitierLink anker={e.anker} t={t} />
      </div>
    </article>
  );
}

/**
 * @param {{ eintraege: object[], sprache?: "de"|"en" }} props eintraege = quellenEintraege() der Server-Seite
 */
export default function FaktenSuche({ eintraege, sprache = "de" }) {
  const t = TEXTE[sprache] || TEXTE.de;
  const [text, setText] = useState("");
  const [land, setLand] = useState("");
  const [thema, setThema] = useState("");
  const [klasse, setKlasse] = useState("");
  const [status, setStatus] = useState("");

  // Anker in der URL (#fakt-…): alles bleibt ungefiltert gerendert, der Browser springt selbst.
  const themen = useMemo(() => [...new Set(eintraege.map((e) => e.thema))].sort((a, b) => themaName(a, sprache).localeCompare(themaName(b, sprache), "de")), [eintraege, sprache]);
  const laender = useMemo(() => ["DE", "AT", "CH", "DACH"].filter((l) => eintraege.some((e) => e.land === l)), [eintraege]);
  const treffer = useMemo(() => filtere(eintraege, { text, land, thema, klasse, status }), [eintraege, text, land, thema, klasse, status]);
  const gefiltert = text || land || thema || klasse || status;

  const zuruecksetzen = () => {
    setText("");
    setLand("");
    setThema("");
    setKlasse("");
    setStatus("");
  };

  return (
    <div>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 sm:p-5">
        <label className="block">
          <span className="mb-1 block text-[12.5px] font-semibold text-ink-600">{t.suche}</span>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t.platzhalter} className={cn(feld, "pl-9")} />
          </div>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Auswahl
            id="quellen-land"
            label={t.land}
            wert={land}
            setzen={setLand}
            kinder={
              <>
                <option value="">{t.alle}</option>
                {laender.map((l) => (
                  <option key={l} value={l}>
                    {t.laender[l] || l}
                  </option>
                ))}
              </>
            }
          />
          <Auswahl
            id="quellen-thema"
            label={t.thema}
            wert={thema}
            setzen={setThema}
            kinder={
              <>
                <option value="">{t.alle}</option>
                {themen.map((th) => (
                  <option key={th} value={th}>
                    {themaName(th, sprache)}
                  </option>
                ))}
              </>
            }
          />
          <Auswahl
            id="quellen-klasse"
            label={t.klasse}
            wert={klasse}
            setzen={setKlasse}
            kinder={
              <>
                <option value="">{t.alle}</option>
                {["A", "B", "C"].map((k) => (
                  <option key={k} value={k}>
                    {t.klassen[k]}
                  </option>
                ))}
              </>
            }
          />
          <Auswahl
            id="quellen-status"
            label={t.status}
            wert={status}
            setzen={setStatus}
            kinder={
              <>
                <option value="">{t.alle}</option>
                {["geprueft", "zu_pruefen", "abgelaufen"].map((s) => (
                  <option key={s} value={s}>
                    {t.status_[s]}
                  </option>
                ))}
              </>
            }
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-[13px] font-semibold text-ink-600">
            {t.treffer(treffer.length, eintraege.length)}
          </p>
          {gefiltert ? (
            <button type="button" onClick={zuruecksetzen} className="min-h-9 rounded-xl px-2.5 py-1 text-[12.5px] font-semibold text-navy-700 ring-1 ring-inset ring-navy-200 transition-colors hover:bg-navy-50">
              {t.zuruecksetzen}
            </button>
          ) : null}
        </div>
      </div>

      {treffer.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {treffer.map((e) => (
            <FaktKarte key={e.anker} e={e} t={t} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl bg-white p-6 text-[14.5px] text-ink-600 ring-1 ring-ink-200/70">{t.keine}</p>
      )}
    </div>
  );
}
