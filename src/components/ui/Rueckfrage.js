"use client";

// Markenkonformer Ersatz für window.confirm() und window.prompt() – als Promise,
// ohne Provider (hängt sich beim ersten Aufruf selbst an <body>).
//
//   import { bestaetigen, abfragen } from "@/components/ui/Rueckfrage";
//
//   if (!(await bestaetigen({
//     titel: "Zuschlag an Bieter B erteilen?",
//     text: "Alle anderen Gebote werden abgelehnt und informiert.",
//     details: [{ label: "Gebot", wert: "4,2 Mio. €" }, { label: "Bieter", wert: "Bieter B" }],
//     bestaetigenText: "Zuschlag erteilen",
//   }))) return;
//
//   const grund = await abfragen({
//     titel: "Gebot zurückziehen?", label: "Begründung", pflicht: true, mindestlaenge: 10,
//     mehrzeilig: true, gefahr: true, bestaetigenText: "Gebot zurückziehen",
//   });
//   if (grund === null) return; // abgebrochen
//
// Barrierefrei: natives <dialog> (Fokusfalle, Esc = Abbrechen), Titel/Text per
// aria-labelledby/-describedby, Feldfehler am Feld (aria-invalid), bei gefahr
// liegt der Startfokus auf „Abbrechen“ (versehentliches Enter zerstört nichts).

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CircleHelp, PenLine } from "lucide-react";
import Dialog from "./Dialog";
import Button from "./Button";
import { signal } from "./motion";
import { cn } from "./cn";

let schlange = [];
let naechsteId = 1;
const hoerer = new Set();
let eingehaengt = false;

function melden() {
  hoerer.forEach((h) => h());
}
const abonnieren = (h) => {
  hoerer.add(h);
  return () => hoerer.delete(h);
};
const leer = [];

function einhaengen() {
  if (eingehaengt || typeof document === "undefined") return;
  eingehaengt = true;
  const host = document.createElement("div");
  host.setAttribute("data-ov-rueckfrage", "");
  document.body.appendChild(host);
  createRoot(host).render(<RueckfrageHost />);
}

function anfragen(art, optionen) {
  if (typeof document === "undefined") return Promise.resolve(art === "frage" ? null : false);
  return new Promise((resolve) => {
    schlange = [...schlange, { id: naechsteId++, art, optionen: optionen || {}, resolve }];
    einhaengen();
    melden();
  });
}

/**
 * Bestätigung (Ersatz für confirm). Ergebnis: true | false.
 *
 * titel            Frage („Projekt löschen?“) – Pflicht
 * text             Folge in einem Satz
 * details          Kontextzeilen: Liste von { label, wert } oder Strings
 * gefahr           destruktiv: roter Knopf, Warn-Icon, Startfokus auf Abbrechen
 * bestaetigenText  Verb + Objekt („Zuschlag erteilen“), Standard „Bestätigen“
 * abbrechenText    Standard „Abbrechen“
 * icon             eigenes Lucide-Icon
 */
export function bestaetigen(optionen) {
  return anfragen("bestaetigung", typeof optionen === "string" ? { titel: optionen } : optionen);
}

/**
 * Eingabe (Ersatz für prompt). Ergebnis: getrimmter String | null (abgebrochen).
 *
 * titel, text, details, gefahr, bestaetigenText (Standard „Übernehmen“), abbrechenText, icon – wie oben
 * label            sichtbares Feldlabel (Pflicht für Barrierefreiheit; Standard „Eingabe“)
 * standard         Vorbelegung
 * platzhalter, hilfe (Hilfetext unter dem Feld)
 * pflicht          leere Eingabe nicht erlaubt
 * mindestlaenge    Mindestzeichen (z. B. für Begründungen)
 * maxlaenge        Höchstzeichen (Standard 2000)
 * mehrzeilig       Textarea statt Zeile
 * typ              text | email | number | date | url (nur einzeilig)
 * pruefen          (wert) => Fehlertext | null – eigene Prüfung
 */
export function abfragen(optionen) {
  return anfragen("frage", typeof optionen === "string" ? { titel: optionen } : optionen);
}

function RueckfrageHost() {
  const liste = useSyncExternalStore(abonnieren, () => schlange, () => leer);
  const aktuell = liste[0];
  const [offen, setOffen] = useState(false);

  useEffect(() => {
    setOffen(Boolean(aktuell));
  }, [aktuell]);

  // Einmalig auflösen (Esc, Hintergrund-Klick und das close-Ereignis können
  // zusammenfallen). Erst schließen – der Browser gibt den Fokus an den
  // Auslöser zurück –, dann aus der Schlange nehmen (nächste Rückfrage folgt).
  const beenden = (ergebnis) => {
    if (!aktuell || aktuell.erledigt) return;
    const eintrag = aktuell;
    eintrag.erledigt = true;
    setOffen(false);
    eintrag.resolve(ergebnis);
    setTimeout(() => {
      schlange = schlange.filter((e) => e !== eintrag);
      melden();
    }, 180);
  };

  if (!aktuell) return null;
  return <RueckfrageDialog key={aktuell.id} eintrag={aktuell} offen={offen} beenden={beenden} />;
}

function RueckfrageDialog({ eintrag, offen, beenden }) {
  const { art, optionen: o } = eintrag;
  const frage = art === "frage";
  const gefahr = Boolean(o.gefahr);
  const feldId = useId();
  const fehlerId = useId();
  const hilfeId = useId();
  const [wert, setWert] = useState(o.standard != null ? String(o.standard) : "");
  const [fehler, setFehler] = useState(null);
  const feld = useRef(null);
  const abbrechenKnopf = useRef(null);
  const okKnopf = useRef(null);
  const abbruch = frage ? null : false;

  // Startfokus nach showModal (läuft im Dialog-Effekt, also nach diesem): ein Frame später.
  useEffect(() => {
    if (!offen) return;
    const raf = requestAnimationFrame(() => {
      const ziel = frage ? feld.current : gefahr ? abbrechenKnopf.current : okKnopf.current;
      ziel?.focus();
      if (frage && feld.current?.select && o.standard) feld.current.select();
    });
    return () => cancelAnimationFrame(raf);
  }, [offen, frage, gefahr, o.standard]);

  const pruefen = () => {
    const v = wert.trim();
    if (o.pflicht && !v) return `Bitte ${o.label ? `„${o.label}“` : "einen Wert"} angeben.`;
    if (o.mindestlaenge && v.length < o.mindestlaenge && (v || o.pflicht)) return `Bitte mindestens ${o.mindestlaenge} Zeichen eingeben (bisher ${v.length}).`;
    if (typeof o.pruefen === "function") return o.pruefen(v) || null;
    return null;
  };

  const absenden = (e) => {
    e?.preventDefault();
    if (!frage) return beenden(true);
    const f = pruefen();
    if (f) {
      setFehler(f);
      feld.current?.focus();
      signal(feld.current, "schuetteln");
      return;
    }
    beenden(wert.trim());
  };

  const Icon = o.icon || (gefahr ? AlertTriangle : frage ? PenLine : CircleHelp);
  const details = Array.isArray(o.details) ? o.details.filter(Boolean) : o.details ? [o.details] : [];
  const max = o.maxlaenge || 2000;
  const feldKlassen = cn(
    "w-full rounded-2xl bg-white px-4 text-[16px] text-ink-900 ring-1 ring-inset placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ov-500",
    fehler ? "ring-danger-500" : "ring-ink-350"
  );
  const beschreibung = cn(o.hilfe && hilfeId, fehler && fehlerId) || undefined;

  return (
    <Dialog
      offen={offen}
      onSchliessen={() => beenden(abbruch)}
      titel={o.titel || (frage ? "Eingabe" : "Sind Sie sicher?")}
      text={o.text}
      icon={Icon}
      ton={gefahr ? "danger" : "neutral"}
      groesse={o.groesse || "sm"}
    >
      <form onSubmit={absenden} noValidate>
        {details.length > 0 && (
          <dl className="space-y-1.5 rounded-2xl bg-ink-50 px-4 py-3 text-[14px] ring-1 ring-inset ring-ink-100">
            {details.map((d, i) =>
              typeof d === "object" && d && "label" in d ? (
                <div key={i} className="flex flex-wrap justify-between gap-x-4">
                  <dt className="text-ink-500">{d.label}</dt>
                  <dd className="ov-num font-semibold text-ink-900">{d.wert}</dd>
                </div>
              ) : (
                <div key={i}>
                  <dd className="text-ink-700">{d}</dd>
                </div>
              )
            )}
          </dl>
        )}

        {frage && (
          <div className={details.length ? "mt-4" : ""}>
            <label htmlFor={feldId} className="text-[14px] font-semibold text-ink-900">
              {o.label || "Eingabe"}
              {o.pflicht && <span className="ml-1 font-normal text-ink-500">(Pflicht)</span>}
            </label>
            {o.mehrzeilig ? (
              <textarea
                ref={feld}
                id={feldId}
                rows={4}
                value={wert}
                maxLength={max}
                placeholder={o.platzhalter}
                aria-invalid={fehler ? true : undefined}
                aria-describedby={beschreibung}
                aria-required={o.pflicht || undefined}
                onChange={(e) => {
                  setWert(e.target.value);
                  if (fehler) setFehler(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) absenden(e);
                }}
                className={cn(feldKlassen, "mt-2 min-h-[112px] resize-y py-3 leading-relaxed")}
              />
            ) : (
              <input
                ref={feld}
                id={feldId}
                type={o.typ || "text"}
                value={wert}
                maxLength={max}
                placeholder={o.platzhalter}
                aria-invalid={fehler ? true : undefined}
                aria-describedby={beschreibung}
                aria-required={o.pflicht || undefined}
                onChange={(e) => {
                  setWert(e.target.value);
                  if (fehler) setFehler(null);
                }}
                className={cn(feldKlassen, "mt-2 h-12")}
              />
            )}
            {o.hilfe && !fehler && (
              <p id={hilfeId} className="mt-1.5 text-[13px] text-ink-500">
                {o.hilfe}
              </p>
            )}
            {fehler && (
              <p id={fehlerId} className="mt-1.5 flex items-start gap-1.5 text-[13px] text-danger-700">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fehler}
              </p>
            )}
            {o.mindestlaenge > 0 && (
              <p className="ov-num mt-1 text-right text-[12px] text-ink-500" aria-hidden="true">
                {wert.trim().length} / mind. {o.mindestlaenge}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button ref={abbrechenKnopf} variant="secondary" onClick={() => beenden(abbruch)}>
            {o.abbrechenText || "Abbrechen"}
          </Button>
          <Button ref={okKnopf} type="submit" variant={gefahr ? "danger" : "primary"}>
            {o.bestaetigenText || (frage ? "Übernehmen" : "Bestätigen")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
