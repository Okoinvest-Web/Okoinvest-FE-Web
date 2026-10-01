// src/components/diagramme/Vitrine.js
//
// Schaufenster aller Diagramm-Bausteine mit synthetischen, deterministischen Beispieldaten (kein Zufall → keine
// Hydration-Abweichung). Für den Styleguide /design: <DiagrammVitrine /> (Server-Komponente, eine Zeile Einbau).
// Die Beispielwerte sind Formen, keine Aussagen über ÖkoInvest.

import { ENERGIE, KATEGORIE_HELL } from "@/components/ui/datenfarben";
import BalkenDiagramm from "./BalkenDiagramm";
import DonutDiagramm from "./DonutDiagramm";
import EnergieFluss from "./EnergieFluss";
import Gauge from "./Gauge";
import HeatmapDiagramm from "./HeatmapDiagramm";
import LinienDiagramm from "./LinienDiagramm";
import WasserfallDiagramm from "./WasserfallDiagramm";

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const rund = (x, s = 1) => Math.round(x * 10 ** s) / 10 ** s;
const sonne = (m) => Math.max(0, Math.sin(((m + 0.5) / 12) * Math.PI)) ;

// Tagesgang 15 min: PV-Glocke, Verbrauch mit Morgen-/Abendspitze
const TAG = Array.from({ length: 96 }, (_, i) => {
  const h = i / 4;
  const pv = Math.max(0, Math.sin(((h - 6) / 14) * Math.PI)) * 42;
  const last = 18 + 9 * Math.exp(-((h - 7.5) ** 2) / 2) + 14 * Math.exp(-((h - 19) ** 2) / 3) + 3 * Math.sin(i / 3);
  return { h, pv: rund(pv), last: rund(last) };
});
const uhr = (h) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

// Lastgang 24 × 365 (Stunde × Tag): Grundlast, Werktage, Jahreszeit
const JAHR = Array.from({ length: 24 }, (_, h) =>
  Array.from({ length: 365 }, (_, d) => {
    const werktag = d % 7 < 5;
    const winter = 1 + 0.35 * Math.cos((d / 365) * 2 * Math.PI);
    const tag = h >= 7 && h <= 17 ? (werktag ? 1 : 0.35) : 0.18;
    return rund((40 + 160 * tag * winter + 8 * Math.sin(h + d / 9)) / 1, 0);
  })
);
const MONATSANFANG = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export default function DiagrammVitrine() {
  const erzeugung = MONATE.map((_, m) => rund(2400 + 9800 * sonne(m), 0));
  const verbrauch = MONATE.map((_, m) => rund(14000 + 5000 * Math.cos((m / 12) * 2 * Math.PI), 0));
  const eigen = erzeugung.map((e, m) => rund(Math.min(e, verbrauch[m]) * 0.82, 0));
  return (
    <div className="grid gap-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <LinienDiagramm
          titel="Tagesgang"
          einheit="kW"
          untertitel="Linie, Fläche, Fadenkreuz – Pfeiltasten im Diagramm"
          reihen={[
            { name: "PV-Erzeugung", farbe: ENERGIE.erzeugung, flaeche: true, werte: TAG.map((t) => t.pv) },
            { name: "Verbrauch", farbe: ENERGIE.verbrauch, werte: TAG.map((t) => t.last) },
          ]}
          xBeschriftung={TAG.map((t, i) => ({ x: i, text: i % 4 === 0 ? `${Math.floor(t.h)} h` : "" }))}
          xTitel={TAG.map((t) => uhr(t.h))}
          yEinheit="kW"
          referenz={[{ y: 30, text: "Anschlussleistung 30 kW" }]}
          beschreibung="Beispiel-Tagesgang: PV-Erzeugung bis 42 kW zur Mittagszeit, Verbrauch mit Spitzen morgens und abends"
        />
        <BalkenDiagramm
          titel="Monatsbilanz"
          einheit="kWh"
          untertitel="Gruppierte Säulen, gestaffelter Einlauf"
          kategorien={MONATE}
          reihen={[
            { name: "Erzeugung", farbe: ENERGIE.erzeugung, werte: erzeugung },
            { name: "Verbrauch", farbe: ENERGIE.verbrauch, werte: verbrauch },
            { name: "Eigendeckung", farbe: ENERGIE.eigenverbrauch, werte: eigen },
          ]}
          yEinheit="kWh"
          beschreibung="Beispiel-Monatsbilanz einer Gemeinschaft: Erzeugung im Sommer am höchsten, Verbrauch im Winter"
        />
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <BalkenDiagramm
          titel="Energiekosten"
          einheit="€"
          untertitel="Gestapelt mit Summe und Plan-Linie"
          kategorien={MONATE}
          gestapelt
          reihen={[
            { name: "Netzbezug", farbe: ENERGIE.verbrauch, werte: verbrauch.map((v, m) => rund((v - eigen[m]) * 0.24, 0)) },
            { name: "Solarstrom vor Ort", farbe: ENERGIE.eigenverbrauch, werte: eigen.map((e) => rund(e * 0.12, 0)) },
          ]}
          linie={{ name: "Plan", farbe: ENERGIE.plan, werte: MONATE.map(() => 3600) }}
          yEinheit="€"
          beschreibung="Beispiel: Energiekosten je Monat aus Netzbezug und Solarstrom, Plan 3.600 € pro Monat"
        />
        <WasserfallDiagramm
          titel="Ersparnis-Brücke"
          untertitel="Start, Zu- und Abgänge, Ergebnis"
          schritte={[
            { name: "Kosten heute", wert: 48000, typ: "start" },
            { name: "Eigenstrom", wert: -11800 },
            { name: "Pool-Einkauf", wert: -4200 },
            { name: "Netzentgelt", wert: 1900 },
            { name: "Kosten neu", typ: "summe" },
          ]}
          yEinheit="€"
          beschreibung="Beispiel: Energiekosten sinken von 48.000 € auf 33.900 € pro Jahr"
        />
      </div>
      <HeatmapDiagramm
        titel="Lastgang 24 × 365"
        untertitel="Stunde × Tag – Muster aus Werktagen, Wochenenden und Jahreszeit auf einen Blick"
        matrix={JAHR}
        zeilen={Array.from({ length: 24 }, (_, h) => `${h} h`)}
        spalten={Array.from({ length: 365 }, (_, d) => String(d + 1))}
        spaltenBeschriftung={MONATSANFANG.map((d, m) => ({ index: d, text: MONATE[m] }))}
        spaltenTitel={Array.from({ length: 365 }, (_, d) => {
          const m = MONATSANFANG.filter((a) => a <= d).length - 1;
          return `${d - MONATSANFANG[m] + 1}. ${MONATE[m]}`;
        })}
        zeilenJede={6}
        einheit="kW"
        skala="navy"
        beschreibung="Beispiel-Lastgang eines Gewerbebetriebs: hohe Last werktags 7–17 Uhr, im Winter höher"
      />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <EnergieFluss
          titel="Energiefluss der Gemeinschaft"
          untertitel="Erzeugung → Gemeinschaft → Verbrauch (Jahr)"
          knoten={[
            { id: "pv1", name: "PV Turnhalle", spalte: 0, farbe: ENERGIE.erzeugung },
            { id: "pv2", name: "PV Bauhof", spalte: 0, farbe: ENERGIE.erzeugung },
            { id: "netz", name: "Netzbezug", spalte: 0, farbe: ENERGIE.netzbezug },
            { id: "eg", name: "Gemeinschaft", spalte: 1, farbe: KATEGORIE_HELL[1] },
            { id: "haus", name: "Haushalte", spalte: 2, farbe: ENERGIE.verbrauch },
            { id: "betrieb", name: "Betriebe", spalte: 2, farbe: KATEGORIE_HELL[3] },
            { id: "ueber", name: "Überschuss ins Netz", spalte: 2, farbe: ENERGIE.einspeisung },
          ]}
          fluesse={[
            { von: "pv1", nach: "eg", wert: 61000 },
            { von: "pv2", nach: "eg", wert: 38000 },
            { von: "netz", nach: "eg", wert: 74000 },
            { von: "eg", nach: "haus", wert: 92000 },
            { von: "eg", nach: "betrieb", wert: 59000 },
            { von: "eg", nach: "ueber", wert: 22000 },
          ]}
          einheit="kWh"
          beschreibung="Beispiel: 99.000 kWh Erzeugung und 74.000 kWh Netzbezug versorgen Haushalte und Betriebe, 22.000 kWh Überschuss"
        />
        <div className="grid content-start gap-8">
          <DonutDiagramm
            titel="Herkunft des Stroms"
            segmente={[
              { name: "Gemeinschaft", wert: 77000, farbe: ENERGIE.eigenverbrauch },
              { name: "Netzbezug", wert: 74000, farbe: ENERGIE.netzbezug },
              { name: "Speicher", wert: 9000, farbe: ENERGIE.speicherLaden },
            ]}
            einheit="kWh"
            mitteLabel="Verbrauch"
            groesse={176}
          />
          <div className="flex flex-wrap justify-center gap-8">
            <Gauge wert={0.48} ziel={0.6} label="Eigendeckung" groesse={200} />
            <Gauge wert={0.87} min={0.6} max={1} ziel={0.8} label="Performance Ratio" groesse={200} ton="navy" />
          </div>
        </div>
      </div>
    </div>
  );
}
