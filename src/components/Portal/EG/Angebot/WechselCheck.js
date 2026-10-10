"use client";

// Wechsel-Check für bestehende Energiegemeinschaften in Österreich (Welle 3, Paket B7).
// Fragen-Assistent im Stil der Entscheidungshilfe Agri-PV (WegeEntscheider): eine Frage je Schritt,
// Fortschrittsbalken, Ergebnis auf dunkler Karte. Logik: src/lib/eg-angebot/wechselCheck.js (reine Funktion).
// Rechts- und Prozessaussagen kommen als Props aus dem Faktenregister (egFakten(), Server) – mit Quelle und Stand.
// Lead-Kette: Wechselplan anfordern über AnfrageMitDaten → POST /api/anfrage (typ energiegemeinschaft, Land AT,
// Einwilligungsprotokoll im Backend); die Antworten und das Ergebnis gehen strukturiert mit. Telefon nur bei Rückruf.

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, ClipboardCheck, Compass, RotateCcw } from "lucide-react";
import { cn } from "@/components/ui/cn";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { FaktKasten } from "./Teile";
import { FRAGEN as OPTIONEN, wechselCheck } from "@/lib/eg-angebot/wechselCheck";

const T = {
  de: {
    fragen: [
      { id: "modell", frage: "Welches Modell hat Ihre Gemeinschaft?", antworten: { eeg_lokal: ["EEG lokal", "Niederspannung"], eeg_regional: ["EEG regional", "Mittelspannung"], beg: ["BEG", "Bürgerenergiegemeinschaft"], gea: ["GEA", "Gemeinschaftliche Erzeugungsanlage im Haus"], unbekannt: ["Weiß ich nicht genau", "Wir klären das gemeinsam"] } },
      { id: "zaehlpunkte", frage: "Wie viele Zählpunkte hat die Gemeinschaft ungefähr?", antworten: { bis20: ["Bis 20", "Klein, oft Nachbarschaft"], bis100: ["21 bis 100", "Typische Ortsgemeinschaft"], bis500: ["101 bis 500", "Gemeinde oder Region"], ueber500: ["Mehr als 500", "Große Gemeinschaft"] } },
      { id: "verwaltung", frage: "Wie wird die Gemeinschaft heute verwaltet?", antworten: { tabellen: ["Ehrenamtlich mit Tabellen", "Eigene Listen, EDA-Portal von Hand"], software_selbst: ["Mit einer Software", "Der Vorstand rechnet selbst ab"], dienstleister: ["Ein Dienstleister führt den Betrieb", "Abrechnung und Mitglieder ausgelagert"] } },
      { id: "probleme", mehrfach: true, frage: "Was läuft heute nicht gut?", sub: "Mehrere Antworten möglich – oder keine, wenn alles passt.", antworten: { aufwand: ["Zu viel Arbeit im Ehrenamt", "Anmeldungen, Rückfragen, Abrechnung"], abrechnung: ["Fehler oder Verzug bei Rechnungen", "Gutschriften, Korrekturen, Nachfragen"], elwg: ["Verträge noch nicht ans ElWG angepasst", "Statuten und Mitgliederverträge"], zustimmungen: ["Zustimmungen der Mitglieder scheitern", "Frist im Netzbetreiber-Portal verpasst"], datenluecken: ["Fehlende oder späte Energiedaten", "Lücken in den Viertelstundenwerten"], support: ["Wenig Unterstützung", "Antworten dauern lange"], kosten: ["Die Kosten", "Gebühren im Verhältnis zur Ersparnis"] } },
      { id: "vertrag", frage: "Wie sieht der Vertrag mit Ihrem bisherigen Anbieter aus?", antworten: { kurzfristig: ["Kurzfristig kündbar", "Monatlich oder Ende in Sicht"], laufzeit: ["Feste Laufzeit", "Ende liegt noch weiter weg"], unbekannt: ["Weiß ich nicht", "Muss ich nachsehen"], keiner: ["Kein Anbieter", "Wir machen alles selbst"] } },
      { id: "eda", frage: "Wer hat die Zugangsdaten zum EDA-Anwenderportal der Gemeinschaft?", antworten: { gemeinschaft: ["Die Gemeinschaft selbst", "Vorstand oder Kassier"], anbieter: ["Nur unser Anbieter", "Wir haben keinen eigenen Zugang"], unbekannt: ["Weiß ich nicht", "Muss ich klären"] } },
      { id: "vorhaben", mehrfach: true, frage: "Was hat die Gemeinschaft vor?", sub: "Mehrere Antworten möglich – oder keine.", antworten: { netzgebiet: ["Mitglieder aus anderen Netzgebieten", "Über den eigenen Netzbetreiber hinaus"], modellwechsel: ["Modell ändern", "z. B. von lokal auf regional"], mehrfach: ["Mehrfachteilnahme nutzen", "Mitglieder in mehreren Gemeinschaften"], wachsen: ["Deutlich wachsen", "Mehr Mitglieder aufnehmen"] } },
    ],
    keine: "Nichts davon",
    weiter: "Weiter",
    auswerten: "Auswerten",
    zurueck: "Zurück",
    neu: "Neu starten",
    frageVon: (n, m) => `Frage ${n} von ${m}`,
    ergebnis: "Ihr Ergebnis",
    fortschritt: "Fortschritt",
    sinnvoll: "Lohnt sich ein Wechsel?",
    moeglich: "Ist er möglich?",
    stufeS: { hoch: "Ja, sehr wahrscheinlich", mittel: "Kann sich lohnen", gering: "Eher nicht" },
    stufeM: { jetzt: "Ja, ohne Vorarbeiten", vorbereiten: "Ja, nach kurzer Vorbereitung" },
    gruende: {
      aufwand: "Das Ehrenamt ist überlastet – mit der Betriebsführung übernehmen wir Anmeldungen, Datenqualität, Abrechnung und Mitgliederfragen.",
      abrechnung: "Fehler und Verzug bei Rechnungen sind der Kern dessen, was eine Plattform lösen muss: Abrechnung mit Vier-Augen-Freigabe.",
      elwg: "Die Verträge müssen ohnehin an das ElWG angepasst werden – ein guter Zeitpunkt, den Betrieb neu aufzustellen.",
      zustimmungen: "Gescheiterte Zustimmungen lassen sich mit einer geführten Zustimmung samt Fristanzeige verringern – zustimmen muss das Mitglied aber weiterhin selbst.",
      datenluecken: "Fehlende Energiedaten entstehen oft beim Netzbetreiber. Ein Wechsel hilft beim Erkennen und Nachfordern, beseitigt die Ursache aber nicht.",
      support: "Ein fester Ansprechpartner für Vorstand und Mitglieder fehlt Ihnen.",
      kosten: "Die Kosten sind Ihnen zu hoch.",
      tabellen_gross: "Mit Tabellen und dieser Größe wird die Selbstverwaltung zur Daueraufgabe.",
      wachstum: "Wachstum und Mehrfachteilnahme bringen mehr Verwaltung mit sich.",
      zufrieden: "Sie nennen keine Probleme. Wenn Ihre Lösung gut läuft, gibt es keinen Grund zu wechseln – prüfen Sie aber die Anpassung Ihrer Verträge an das ElWG.",
      nur_kosten: "Nur wegen des Preises zu wechseln, lohnt sich selten: Ein Wechsel kostet auch Zeit. Vergleichen Sie Leistungsumfang und Entlastung, nicht nur Gebühren.",
    },
    schritte: {
      vertrag_laufzeit: "Den Wechsel-Stichtag auf das Vertragsende legen und die Kündigungsfrist im Vertrag prüfen.",
      vertrag_pruefen: "Vertrag mit dem bisherigen Anbieter heraussuchen: Laufzeit und Kündigungsfrist.",
      eda_anbieter: "Zugangsdaten zum EDA-Anwenderportal beim bisherigen Anbieter anfordern – die Marktpartner-ID gehört der Gemeinschaft.",
      eda_klaeren: "Klären, wer den Zugang zum EDA-Anwenderportal der Gemeinschaft hat.",
      modell_klaeren: "Modell der Gemeinschaft klären (steht im Vertrag mit dem Netzbetreiber).",
    },
    keineSchritte: "Es gibt nichts, was vor dem Wechsel geklärt werden müsste.",
    vorher: "Vorher klären",
    fuerAlle: "Gilt für alle Anbieter",
    hinweisTitel: {
      ohne_neuanmeldung: "Anbieterwechsel ohne Neuanmeldung",
      modellwechsel: "Modellwechsel heißt Neuanmeldung",
      netzgebiet: "Netzbetreiber-Einschränkung",
      elwg_vertraege: "Verträge an das ElWG anpassen",
    },
    hinweisText: {
      datenluecken_netzbetreiber: "Datenlücken beim Netzbetreiber bleiben auch nach einem Wechsel bestehen; eine Plattform kann sie nur sichtbar machen und nachfordern.",
      gea: "Für gemeinschaftliche Erzeugungsanlagen im Haus (GEA) prüfen wir den passenden Umfang gesondert.",
      netzgebiet: "Das betrifft Ihr Vorhaben, Mitglieder aus anderen Netzgebieten aufzunehmen – unabhängig davon, welche Software Sie nutzen.",
      modellwechsel: "Planen Sie den Modellwechsel darum getrennt vom Anbieterwechsel – erst wechseln, dann umstellen.",
    },
    ablaufTitel: "So läuft der Wechsel",
    ablauf: {
      mandat: "Mandat: Vorstandsbeschluss, Dienstleistungs- und Auftragsverarbeitungsvertrag",
      eda_zugang: "EDA-Zugang übertragen, bisherigen Anbieter austragen",
      daten: "Mitglieder, Zählpunkte und Tarife übernehmen, mit dem Netzbetreiber abgleichen",
      parallellauf: "Einen Monat parallel rechnen und mit den Werten des Netzbetreibers vergleichen",
      stichtag: "Abrechnung ab einem festen Monat",
      modellwechsel_danach: "Erst danach: Modellwechsel mit dem Netzbetreiber",
    },
    planTitel: "Wechselplan anfordern",
    planText: "Wir schicken Ihnen einen Wechselplan mit Stichtag, Parallellauf und Angebot für Ihre Gemeinschaft. Ihre Antworten gehen mit, Sie müssen nichts doppelt eingeben.",
    planLegende: "Ihre Gemeinschaft",
    planButton: "Wechselplan anfordern",
    gemeinde: "Gemeinschaft / Ort",
    gemeindePlatz: "z. B. Ostermiething",
    orientierung: "Eine Orientierung, keine Rechtsberatung. Grundlage sind Ihre Angaben und die genannten Quellen.",
  },
  en: {
    fragen: [
      { id: "modell", frage: "Which model does your community have?", antworten: { eeg_lokal: ["Local EEG", "Low voltage"], eeg_regional: ["Regional EEG", "Medium voltage"], beg: ["BEG", "Citizens’ energy community"], gea: ["GEA", "Joint generation installation in a building"], unbekannt: ["Not sure", "We will clarify it together"] } },
      { id: "zaehlpunkte", frage: "Roughly how many metering points does the community have?", antworten: { bis20: ["Up to 20", "Small, often a neighbourhood"], bis100: ["21 to 100", "Typical local community"], bis500: ["101 to 500", "Municipality or region"], ueber500: ["More than 500", "Large community"] } },
      { id: "verwaltung", frage: "How is the community managed today?", antworten: { tabellen: ["By volunteers with spreadsheets", "Own lists, EDA portal by hand"], software_selbst: ["With software", "The board does the billing"], dienstleister: ["A service provider runs operations", "Billing and members outsourced"] } },
      { id: "probleme", mehrfach: true, frage: "What is not working well today?", sub: "Several answers possible – or none if everything is fine.", antworten: { aufwand: ["Too much volunteer work", "Registrations, questions, billing"], abrechnung: ["Errors or delays in invoices", "Credit notes, corrections, queries"], elwg: ["Contracts not yet adapted to the ElWG", "Articles and member contracts"], zustimmungen: ["Member consents fail", "Deadline in the grid operator portal missed"], datenluecken: ["Missing or late energy data", "Gaps in the quarter-hourly values"], support: ["Little support", "Answers take a long time"], kosten: ["The costs", "Fees relative to the savings"] } },
      { id: "vertrag", frage: "What does the contract with your current provider look like?", antworten: { kurzfristig: ["Can be cancelled at short notice", "Monthly or ending soon"], laufzeit: ["Fixed term", "End is still some way off"], unbekannt: ["Not sure", "I need to check"], keiner: ["No provider", "We do everything ourselves"] } },
      { id: "eda", frage: "Who holds the login for the community’s EDA user portal?", antworten: { gemeinschaft: ["The community itself", "Board or treasurer"], anbieter: ["Only our provider", "We have no access of our own"], unbekannt: ["Not sure", "I need to find out"] } },
      { id: "vorhaben", mehrfach: true, frage: "What does the community plan to do?", sub: "Several answers possible – or none.", antworten: { netzgebiet: ["Members from other grid areas", "Beyond your own grid operator"], modellwechsel: ["Change the model", "e.g. from local to regional"], mehrfach: ["Use multiple participation", "Members in several communities"], wachsen: ["Grow significantly", "Admit more members"] } },
    ],
    keine: "None of these",
    weiter: "Next",
    auswerten: "Show result",
    zurueck: "Back",
    neu: "Start again",
    frageVon: (n, m) => `Question ${n} of ${m}`,
    ergebnis: "Your result",
    fortschritt: "Progress",
    sinnvoll: "Is switching worthwhile?",
    moeglich: "Is it possible?",
    stufeS: { hoch: "Yes, very likely", mittel: "It may be worthwhile", gering: "Probably not" },
    stufeM: { jetzt: "Yes, without preparation", vorbereiten: "Yes, after brief preparation" },
    gruende: {
      aufwand: "Your volunteers are overloaded – with operational management we take over registrations, data quality, billing and member questions.",
      abrechnung: "Errors and delays in invoices are the core of what a platform must solve: billing with four-eyes approval.",
      elwg: "The contracts have to be adapted to the ElWG anyway – a good moment to reorganise operations.",
      zustimmungen: "Failed consents can be reduced with guided consent and a deadline display – but members still have to consent themselves.",
      datenluecken: "Missing energy data often originates at the grid operator. Switching helps to detect and request it, but does not remove the cause.",
      support: "You lack a fixed contact person for the board and members.",
      kosten: "The costs are too high for you.",
      tabellen_gross: "With spreadsheets at this size, self-management becomes a permanent task.",
      wachstum: "Growth and multiple participation bring more administration.",
      zufrieden: "You do not mention any problems. If your solution works well, there is no reason to switch – but do check that your contracts are adapted to the ElWG.",
      nur_kosten: "Switching for price alone is rarely worthwhile: a switch also takes time. Compare scope of services and relief, not just fees.",
    },
    schritte: {
      vertrag_laufzeit: "Set the switch date to the end of the contract and check the notice period in the contract.",
      vertrag_pruefen: "Find the contract with your current provider: term and notice period.",
      eda_anbieter: "Request the EDA user portal login from your current provider – the market partner ID belongs to the community.",
      eda_klaeren: "Find out who holds access to the community’s EDA user portal.",
      modell_klaeren: "Clarify the community’s model (it is stated in the contract with the grid operator).",
    },
    keineSchritte: "There is nothing that needs to be clarified before switching.",
    vorher: "Clarify beforehand",
    fuerAlle: "Applies to all providers",
    hinweisTitel: {
      ohne_neuanmeldung: "Switching provider without re-registration",
      modellwechsel: "Changing the model means re-registration",
      netzgebiet: "Grid operator restriction",
      elwg_vertraege: "Adapt contracts to the ElWG",
    },
    hinweisText: {
      datenluecken_netzbetreiber: "Data gaps at the grid operator remain after a switch; a platform can only make them visible and request the data.",
      gea: "For joint generation installations in a building (GEA), we check the appropriate scope separately.",
      netzgebiet: "This affects your plan to admit members from other grid areas – regardless of which software you use.",
      modellwechsel: "So plan the model change separately from the provider switch – switch first, then convert.",
    },
    ablaufTitel: "How the switch works",
    ablauf: {
      mandat: "Mandate: board resolution, service and data processing agreement",
      eda_zugang: "Transfer EDA access, remove the previous provider",
      daten: "Take over members, metering points and tariffs, reconcile with the grid operator",
      parallellauf: "Calculate in parallel for one month and compare with the grid operator’s values",
      stichtag: "Billing from a fixed month",
      modellwechsel_danach: "Only then: model change with the grid operator",
    },
    planTitel: "Request a switching plan",
    planText: "We will send you a switching plan with cut-over date, parallel run and an offer for your community. Your answers are included, you do not have to enter anything twice.",
    planLegende: "Your community",
    planButton: "Request switching plan",
    gemeinde: "Community / place",
    gemeindePlatz: "e.g. Ostermiething",
    orientierung: "For guidance only, not legal advice. Based on your answers and the sources named.",
  },
};

const FAKT_ZU_HINWEIS = { ohne_neuanmeldung: "ohneNeuanmeldung", modellwechsel: "modellwechsel", netzgebiet: "netzgebiet", elwg_vertraege: "elwg" };

/**
 * @param {{ fakten: Record<string, object> }} p  Anzeigedaten aus egFakten() (Server), je Sprache
 */
export default function WechselCheck({ fakten = {} }) {
  const sprache = useSprache();
  const en = sprache === "en";
  const t = en ? T.en : T.de;
  const fragen = t.fragen;
  const [antworten, setAntworten] = useState({ probleme: [], vorhaben: [] });
  const [schritt, setSchritt] = useState(0);
  const [richtung, setRichtung] = useState("vor");
  const fertig = schritt >= fragen.length;
  const ergebnis = useMemo(() => (fertig ? wechselCheck(antworten) : null), [fertig, antworten]);
  const f = fragen[schritt];

  const weiter = () => {
    setRichtung("vor");
    setSchritt((s) => Math.min(s + 1, fragen.length));
  };
  function waehle(fid, aid) {
    setAntworten((a) => ({ ...a, [fid]: aid }));
    setRichtung("vor");
    setTimeout(() => setSchritt((s) => Math.min(s + 1, fragen.length)), 180);
  }
  function umschalten(fid, aid) {
    setAntworten((a) => {
      const liste = a[fid] || [];
      return { ...a, [fid]: liste.includes(aid) ? liste.filter((x) => x !== aid) : [...liste, aid] };
    });
  }
  const zurueck = () => {
    setRichtung("zurueck");
    setSchritt((s) => Math.max(0, s - 1));
  };
  const neu = () => {
    setAntworten({ probleme: [], vorhaben: [] });
    setRichtung("zurueck");
    setSchritt(0);
  };

  return (
    <div className="overflow-hidden rounded-[2rem] bg-white shadow-[0_40px_90px_-50px_rgba(3,18,43,0.55)] ring-1 ring-ink-200/70">
      <div className="flex items-center justify-between gap-4 border-b border-ink-100 bg-sand-50/70 px-5 py-4 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">{fertig ? t.ergebnis : t.frageVon(schritt + 1, fragen.length)}</p>
        <div className="flex h-2 w-28 overflow-hidden rounded-full bg-ink-100 sm:w-48" role="progressbar" aria-valuemin={0} aria-valuemax={fragen.length} aria-valuenow={Math.min(schritt, fragen.length)} aria-label={t.fortschritt}>
          <div className="ov-fortschritt h-full w-full rounded-full bg-ov-500" style={{ transform: `scaleX(${Math.min(schritt, fragen.length) / fragen.length})` }} />
        </div>
      </div>

      <div className="p-5 sm:p-8 md:p-10">
        <div key={schritt} className={richtung === "vor" ? "ov-step-vor" : "ov-step-zurueck"}>
          {!fertig && (
            <fieldset>
              <legend className="font-display text-[clamp(1.3rem,1.05rem+0.9vw,1.75rem)] font-extrabold leading-snug tracking-tight text-ink-900">{f.frage}</legend>
              {f.sub && <p className="mt-2 text-[14.5px] text-ink-500">{f.sub}</p>}
              <div className={cn("mt-6 grid gap-3", OPTIONEN[f.id].length % 2 === 0 || OPTIONEN[f.id].length > 4 ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
                {OPTIONEN[f.id].map((id) => {
                  const [label, sub] = f.antworten[id];
                  const an = f.mehrfach ? (antworten[f.id] || []).includes(id) : antworten[f.id] === id;
                  return (
                    <label
                      key={id}
                      className={cn(
                        "ov-press relative flex cursor-pointer flex-col rounded-3xl p-5 pr-12 transition-[background-color,box-shadow,transform] focus-within:ring-2 focus-within:ring-ov-500",
                        an ? "bg-ov-50 ring-2 ring-ov-500" : "bg-sand-50 ring-1 ring-ink-200 hover:bg-white hover:ring-ink-300"
                      )}
                    >
                      {f.mehrfach ? (
                        <input type="checkbox" name={f.id} value={id} checked={an} onChange={() => umschalten(f.id, id)} className="sr-only" />
                      ) : (
                        <input type="radio" name={f.id} value={id} checked={an} onChange={() => waehle(f.id, id)} className="sr-only" />
                      )}
                      <span className="font-display text-[17px] font-bold text-ink-900">{label}</span>
                      <span className="mt-1 text-[14px] leading-snug text-ink-500">{sub}</span>
                      <span aria-hidden="true" className={cn("absolute right-4 top-5 flex h-6 w-6 items-center justify-center", f.mehrfach ? "rounded-lg" : "rounded-full", an ? "ov-erfolg bg-ov-500 text-white" : "bg-white ring-1 ring-ink-300")}>
                        {an && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {schritt > 0 && (
                  <button type="button" onClick={zurueck} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 hover:bg-ink-100">
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {t.zurueck}
                  </button>
                )}
                {/* Einfachauswahl: nach „Zurück“ ist die Antwort schon gewählt – ein erneuter Klick löst kein onChange aus */}
                {!f.mehrfach && antworten[f.id] && (
                  <button type="button" onClick={weiter} className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
                    {t.weiter}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
                {f.mehrfach && (
                  <button type="button" onClick={weiter} className="ml-auto inline-flex h-11 items-center gap-2 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
                    {(antworten[f.id] || []).length ? (schritt === fragen.length - 1 ? t.auswerten : t.weiter) : t.keine}
                    <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
                )}
              </div>
            </fieldset>
          )}

          {fertig && ergebnis && <Ergebnis e={ergebnis} t={t} en={en} fakten={fakten} onZurueck={zurueck} onNeu={neu} />}
        </div>
      </div>
    </div>
  );
}

const TON_S = { hoch: "bg-ov-500 text-white", mittel: "bg-sun-400 text-navy-950", gering: "bg-white/15 text-white" };
const TON_M = { jetzt: "bg-ov-500 text-white", vorbereiten: "bg-sun-400 text-navy-950" };

function Ergebnis({ e, t, en, fakten, onZurueck, onNeu }) {
  const hinweiseMitFakt = e.hinweise.filter((h) => FAKT_ZU_HINWEIS[h] && fakten[FAKT_ZU_HINWEIS[h]]);
  const hinweiseText = e.hinweise.filter((h) => !FAKT_ZU_HINWEIS[h] && t.hinweisText[h]);
  return (
    <div aria-live="polite">
      <div className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
        <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
        <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-ov-500/30 blur-[90px]" />
        <div className="relative grid gap-6 md:grid-cols-2 md:gap-8">
          <div>
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">
              <Compass aria-hidden="true" className="h-4 w-4" /> {t.sinnvoll}
            </p>
            <p className={cn("mt-3 inline-flex rounded-full px-3.5 py-1.5 font-display text-[18px] font-extrabold", TON_S[e.sinnvoll.stufe])}>{t.stufeS[e.sinnvoll.stufe]}</p>
            <ul className="mt-5 space-y-2.5">
              {e.sinnvoll.gruende.map((g) => (
                <li key={g} className="flex gap-2.5 text-[14.5px] leading-relaxed text-white/85">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-300" strokeWidth={3} />
                  {t.gruende[g]}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" /> {t.moeglich}
            </p>
            <p className={cn("mt-3 inline-flex rounded-full px-3.5 py-1.5 font-display text-[18px] font-extrabold", TON_M[e.moeglich.stufe])}>{t.stufeM[e.moeglich.stufe]}</p>
            <p className="mt-5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white/60">{t.vorher}</p>
            {e.moeglich.schritte.length ? (
              <ol className="mt-2.5 space-y-2.5">
                {e.moeglich.schritte.map((s, i) => (
                  <li key={s} className="flex gap-2.5 text-[14.5px] leading-relaxed text-white/85">
                    <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-400 text-[11px] font-bold text-navy-950">{i + 1}</span>
                    {t.schritte[s]}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/85">{t.keineSchritte}</p>
            )}
          </div>
        </div>
      </div>

      {/* Hinweise, die für alle Anbieter gelten – Wortlaut aus dem Faktenregister */}
      <div className="mt-6">
        <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">
          <CircleAlert aria-hidden="true" className="h-4 w-4 text-navy-500" /> {t.fuerAlle}
        </p>
        <div className="mt-3 grid gap-3">
          {hinweiseMitFakt.map((h) => (
            <div key={h}>
              <FaktKasten fakt={fakten[FAKT_ZU_HINWEIS[h]]} titel={t.hinweisTitel[h]} en={en} />
              {t.hinweisText[h] && <p className="mt-2 px-1 text-[14px] leading-relaxed text-ink-600">{t.hinweisText[h]}</p>}
            </div>
          ))}
          {hinweiseText.map((h) => (
            <p key={h} className="rounded-2xl bg-white px-5 py-4 text-[14.5px] leading-relaxed text-ink-700 ring-1 ring-ink-200/70">{t.hinweisText[h]}</p>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-500">{t.ablaufTitel}</p>
        <ol className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {e.ablauf.map((a, i) => (
            <li key={a} className="flex gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-[14.5px] leading-snug text-ink-800 ring-1 ring-ink-200/60">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-950 text-[11.5px] font-bold tabular-nums text-white">{i + 1}</span>
              {t.ablauf[a]}
            </li>
          ))}
        </ol>
      </div>

      {/* Lead-Kette: Wechselplan anfordern */}
      <div id="wechselplan" className="mt-8 scroll-mt-24 rounded-[1.75rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-7">
        <p className="font-display text-[19px] font-bold text-ink-900">{t.planTitel}</p>
        <p className="mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-600">{t.planText}</p>
        <div className="mt-5">
          <AnfrageMitDaten
            legende={t.planLegende}
            festeDaten={{
              quelle: "eg-wechsel-check",
              land: "AT",
              anliegen: e.anliegen,
              modell: e.eingaben.modell,
              wechselCheck: { eingaben: e.eingaben, sinnvoll: e.sinnvoll.stufe, moeglich: e.moeglich.stufe, schritte: e.moeglich.schritte, hinweise: e.hinweise },
            }}
            zusatz={[{ name: "gemeindeOrt", label: t.gemeinde, art: "text", platzhalter: t.gemeindePlatz, breit: true }]}
            formular={{ typ: "energiegemeinschaft", felder: ["firma", "telefon", "plz", "nachricht"], button: t.planButton }}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5">
        <p className="max-w-xl text-[13px] leading-relaxed text-ink-500">{t.orientierung}</p>
        <div className="flex gap-2">
          <button type="button" onClick={onZurueck} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 hover:bg-ink-100">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> {t.zurueck}
          </button>
          <button type="button" onClick={onNeu} className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50">
            <RotateCcw aria-hidden="true" className="h-4 w-4" /> {t.neu}
          </button>
        </div>
      </div>
    </div>
  );
}
