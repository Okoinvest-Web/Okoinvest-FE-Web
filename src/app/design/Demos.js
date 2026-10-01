"use client";

// Interaktive Beispiele für den Styleguide /design (Design-System 2.0).

import { useRef, useState } from "react";
import { BatteryCharging, LayoutGrid, List, Map as KartenIcon, Sun, Trash2, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import Tabs from "@/components/ui/Tabs";
import Tooltip from "@/components/ui/Tooltip";
import ErfolgsHaken from "@/components/ui/ErfolgsHaken";
import Badge from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { abfragen, bestaetigen } from "@/components/ui/Rueckfrage";
import { mitUebergang, signal } from "@/components/ui/motion";
import { cn } from "@/components/ui/cn";

export function TabsDemo() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 shadow-e1 md:p-6">
        <p className="ov-overline text-ink-500">variante=&quot;linie&quot;</p>
        <Tabs
          className="mt-3"
          label="Anlagenbereiche"
          tabs={[
            { id: "erzeugung", label: "Erzeugung", icon: Sun, inhalt: <DemoText>Erzeugung heute, Monat, Jahr – mit Prognose als gestrichelter Linie.</DemoText> },
            { id: "speicher", label: "Speicher", icon: BatteryCharging, zaehler: 2, inhalt: <DemoText>Ladezustand, Zyklen und Verfügbarkeit beider Speicher.</DemoText> },
            { id: "netz", label: "Netz", icon: Zap, inhalt: <DemoText>Einspeisung und Netzbezug im Viertelstundenraster.</DemoText> },
          ]}
        />
      </div>
      <div className="rounded-3xl p-5 ov-verlauf-nacht text-white ring-1 ring-white/10 md:p-6 ov-dunkel">
        <p className="ov-overline text-white/70">variante=&quot;pille&quot; · dunkel</p>
        <Tabs
          className="mt-3"
          variante="pille"
          dunkel
          label="Zeitraum"
          tabs={[
            { id: "tag", label: "Tag", inhalt: <DemoText dunkel>Tagesgang mit Viertelstundenwerten.</DemoText> },
            { id: "monat", label: "Monat", inhalt: <DemoText dunkel>Tageswerte des laufenden Monats.</DemoText> },
            { id: "jahr", label: "Jahr", inhalt: <DemoText dunkel>Monatssummen im Vergleich zum Vorjahr.</DemoText> },
          ]}
        />
      </div>
    </div>
  );
}

function DemoText({ children, dunkel }) {
  return <p className={cn("text-[15px] leading-relaxed", dunkel ? "text-white/75" : "text-ink-600")}>{children}</p>;
}

export function OverlayDemo() {
  const [offen, setOffen] = useState(false);
  const [loeschen, setLoeschen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="secondary" onClick={() => setOffen(true)}>Dialog öffnen</Button>
      <Button variant="dangerLeise" icon={Trash2} onClick={() => setLoeschen(true)}>Destruktiver Dialog</Button>
      <Button variant="secondary" onClick={() => toast.erfolg("Gespeichert", "Ihre Änderungen sind übernommen.", { aktion: { label: "Rückgängig", onClick: () => toast.info("Rückgängig gemacht") } })}>
        Toast Erfolg
      </Button>
      <Button variant="secondary" onClick={() => toast.warnung("Frist in 3 Tagen", "Die Stellungnahme zum B-Plan läuft am Freitag ab.")}>Toast Warnung</Button>
      <Button variant="secondary" onClick={() => toast.fehler("Upload fehlgeschlagen", "Die Datei ist größer als 25 MB.")}>Toast Fehler</Button>
      <Tooltip text="Interner Zinsfuß über die gesamte Laufzeit, vor Steuern.">
        <button type="button" className="inline-flex h-12 items-center rounded-full px-4 text-[15px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
          Tooltip (Hover/Fokus)
        </button>
      </Tooltip>

      <Dialog
        offen={offen}
        onSchliessen={() => setOffen(false)}
        titel="Suchprofil speichern?"
        text="Wir benachrichtigen Sie, sobald ein passendes Projekt in die Börse kommt."
        aktionen={
          <>
            <Button variant="secondary" onClick={() => setOffen(false)}>Abbrechen</Button>
            <Button onClick={() => { setOffen(false); toast.erfolg("Suchprofil gespeichert"); }}>Speichern</Button>
          </>
        }
      />
      <Dialog
        offen={loeschen}
        onSchliessen={() => setLoeschen(false)}
        ton="danger"
        icon={Trash2}
        titel="Fläche „Flurstück 412“ löschen?"
        text="Unterlagen und Verlauf werden entfernt. Das kann nicht rückgängig gemacht werden."
        aktionen={
          <>
            <Button variant="secondary" onClick={() => setLoeschen(false)}>Abbrechen</Button>
            <Button variant="danger" onClick={() => { setLoeschen(false); toast.info("Fläche gelöscht"); }}>Fläche löschen</Button>
          </>
        }
      />
    </div>
  );
}

export function FeedbackDemo() {
  const [zustand, setZustand] = useState("bereit");
  const [lauf, setLauf] = useState(0);
  const feld = useRef(null);
  const senden = () => {
    setZustand("laedt");
    setTimeout(() => {
      setZustand("fertig");
      setLauf((n) => n + 1);
    }, 1200);
  };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex min-h-[176px] flex-col items-center justify-center rounded-3xl bg-white p-6 text-center ring-1 ring-ink-200/70 shadow-e1">
        {zustand === "fertig" ? (
          <div key={lauf} className="flex flex-col items-center">
            <ErfolgsHaken />
            <p className="mt-3 font-display text-[17px] font-bold text-ink-900">Anfrage gesendet</p>
            <button type="button" onClick={() => setZustand("bereit")} className="mt-1 text-[13.5px] font-semibold text-ov-700 hover:underline">
              Noch einmal
            </button>
          </div>
        ) : (
          <>
            <p className="text-[14px] text-ink-600">Button mit Ladezustand → Erfolgs-Feedback</p>
            <Button className="mt-4" laedt={zustand === "laedt"} onClick={senden}>
              {zustand === "laedt" ? "Wird gesendet …" : "Anfrage senden"}
            </Button>
          </>
        )}
      </div>
      <div className="flex min-h-[176px] flex-col justify-center rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 shadow-e1">
        <label htmlFor="ds-plz" className="text-[14px] font-semibold text-ink-900">Postleitzahl der Fläche</label>
        <input
          ref={feld}
          id="ds-plz"
          inputMode="numeric"
          aria-invalid="true"
          aria-describedby="ds-plz-fehler"
          defaultValue="86"
          className="mt-2 h-12 rounded-2xl bg-white px-4 text-[16px] ring-1 ring-inset ring-danger-300 focus:outline-none focus:ring-2 focus:ring-ov-500"
        />
        <p id="ds-plz-fehler" className="mt-1.5 text-[13px] text-danger-700">Bitte eine vollständige Postleitzahl eingeben (4 oder 5 Ziffern).</p>
        <Button variant="secondary" size="sm" className="mt-3 self-start" onClick={() => { feld.current?.focus(); signal(feld.current, "schuetteln"); }}>
          Fehler signalisieren
        </Button>
      </div>
    </div>
  );
}

const PROJEKTE = [
  { name: "Freifläche Niederbayern", mwp: "24 MWp", status: "Datenraum frei", ton: "success" },
  { name: "Agri-PV Mühlviertel", mwp: "8,5 MWp", status: "NDA angefragt", ton: "info" },
  { name: "Carport Logistikzentrum", mwp: "3,2 MWp", status: "Frist läuft", ton: "warn" },
];

export function AnsichtDemo() {
  const [ansicht, setAnsicht] = useState("karten");
  const wechseln = (a) => mitUebergang(() => setAnsicht(a));
  return (
    <div>
      <div className="flex w-fit gap-1 rounded-full bg-ink-100 p-1" role="group" aria-label="Darstellung">
        {[
          { id: "karten", label: "Karten", icon: LayoutGrid },
          { id: "liste", label: "Liste", icon: List },
          { id: "karte", label: "Karte", icon: KartenIcon },
        ].map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={ansicht === o.id}
            onClick={() => wechseln(o.id)}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13.5px] font-semibold transition-colors",
              ansicht === o.id ? "bg-white text-ink-900 shadow-e2" : "text-ink-500 hover:text-ink-900"
            )}
          >
            <o.icon aria-hidden="true" className="h-4 w-4" />
            {o.label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {ansicht === "karten" && (
          <div className="grid gap-4 md:grid-cols-3">
            {PROJEKTE.map((p) => (
              <div key={p.name} className="ov-lift rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 shadow-e1">
                <Badge ton={p.ton} punkt groesse="sm">{p.status}</Badge>
                <p className="mt-3 font-display text-[17px] font-bold text-ink-900">{p.name}</p>
                <p className="ov-kpi mt-2 text-ink-900">{p.mwp.replace(" MWp", "")}<span className="ov-einheit">MWp</span></p>
              </div>
            ))}
          </div>
        )}
        {ansicht === "liste" && (
          <ul className="divide-y divide-ink-100 rounded-3xl bg-white ring-1 ring-ink-200/70 shadow-e1">
            {PROJEKTE.map((p) => (
              <li key={p.name} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span className="font-semibold text-ink-900">{p.name}</span>
                <span className="flex items-center gap-3">
                  <span className="ov-num text-[14px] text-ink-600">{p.mwp}</span>
                  <Badge ton={p.ton} punkt groesse="sm">{p.status}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        {ansicht === "karte" && (
          <div className="relative flex aspect-[16/7] items-center justify-center overflow-hidden rounded-3xl bg-sand-50 ring-1 ring-sand-200">
            <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0" />
            <p className="relative text-[14px] text-ink-600">Kartenansicht (Platzhalter) – Wechsel per View Transition</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RueckfrageDemo() {
  const [ergebnis, setErgebnis] = useState("–");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        onClick={async () => {
          const ok = await bestaetigen({
            titel: "Zuschlag an Bieter B erteilen?",
            text: "Alle anderen Gebote werden abgelehnt und automatisch informiert.",
            details: [{ label: "Gebot", wert: "4,2 Mio. €" }, { label: "Projekt", wert: "Freifläche Niederbayern" }],
            bestaetigenText: "Zuschlag erteilen",
          });
          setErgebnis(ok ? "bestätigt" : "abgebrochen");
        }}
      >
        bestaetigen()
      </Button>
      <Button
        variant="dangerLeise"
        onClick={async () => {
          const grund = await abfragen({
            titel: "Gebot zurückziehen?",
            text: "Der Anbieter sieht Ihre Begründung.",
            label: "Begründung",
            pflicht: true,
            mindestlaenge: 10,
            mehrzeilig: true,
            gefahr: true,
            bestaetigenText: "Gebot zurückziehen",
          });
          setErgebnis(grund === null ? "abgebrochen" : `„${grund}“`);
        }}
      >
        abfragen() · gefahr
      </Button>
      <p className="text-[14px] text-ink-600" aria-live="polite">
        Ergebnis: <span className="font-semibold text-ink-900">{ergebnis}</span>
      </p>
    </div>
  );
}
