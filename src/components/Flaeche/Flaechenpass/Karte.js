"use client";

// src/components/Flaeche/Flaechenpass/Karte.js – Karte zum Einzeichnen der Fläche (Welle 3, Paket B6)
//
// Datenschutz: Die Karte lädt Kacheln von einer Behörde (DE: BKG TopPlusOpen, AT: basemap.at, CH: swisstopo).
// Dabei geht die IP-Adresse an diesen Anbieter – deshalb lädt die Karte ERST nach einem Klick auf „Karte laden“
// (Zwei-Klick-Lösung, gilt nur für diesen Seitenaufruf, kein Cookie). Ohne Karte bleibt „Größe angeben“.
// Die gezeichnete Fläche bleibt im Browser, bis der Nutzer einen Bericht anfordert.
// Leaflet ist bereits Projektabhängigkeit (Akquise-Cockpit) und wird nur hier dynamisch nachgeladen.
//
// Bedienung: Ecken anklicken, auf den ersten Punkt klicken oder „Fläche schließen“; Ecken lassen sich verschieben.
// Tastatur und Screenreader: Die Karte ist eine Zusatzhilfe – gleichwertig ist die Eingabe „Größe angeben“.

import "leaflet/dist/leaflet.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Layers, MapPinned, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { flaecheKennzahlen, flaecheLesen, flaecheText } from "@/lib/rechner/flaechenpass";
import { useSprache } from "@/components/Sprache/SpracheKontext";
import { fmtZahl } from "@/lib/sprache/format";
import { schreibweiseFuer } from "@/lib/land/schreibweise";

const BASEMAP = "https://mapsneu.wien.gv.at/basemap";

/** Grundkarten je Land (amtliche Anbieter, Nutzungsbedingungen: Namensnennung) */
export const GRUNDKARTEN = {
  DE: {
    anbieter: "Bundesamt für Kartographie und Geodäsie (BKG, TopPlusOpen)",
    anbieterEn: "Federal Agency for Cartography and Geodesy (BKG, TopPlusOpen)",
    karte: { url: "https://sgx.geodatenzentrum.de/wmts_topplus_open/tile/1.0.0/web/default/WEBMERCATOR/{z}/{y}/{x}.png", maxZoom: 18 },
    luftbild: null,
    attribution: '© <a href="https://gdz.bkg.bund.de" target="_blank" rel="noopener">BKG</a> (2026) <a href="https://www.govdata.de/dl-de/by-2-0" target="_blank" rel="noopener">dl-de/by-2-0</a>',
  },
  AT: {
    anbieter: "basemap.at (Verwaltungsgrundkarte Österreich)",
    anbieterEn: "basemap.at (Austrian administrative base map)",
    karte: { url: `${BASEMAP}/geolandbasemap/normal/google3857/{z}/{y}/{x}.png`, maxZoom: 19 },
    luftbild: { url: `${BASEMAP}/bmaporthofoto30cm/normal/google3857/{z}/{y}/{x}.jpeg`, maxZoom: 19 },
    attribution: 'Grundkarte: <a href="https://basemap.at" target="_blank" rel="noopener">basemap.at</a> (CC BY 4.0)',
  },
  CH: {
    anbieter: "swisstopo (Bundesamt für Landestopografie)",
    anbieterEn: "swisstopo (Federal Office of Topography)",
    karte: { url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.pixelkarte-farbe/default/current/3857/{z}/{x}/{y}.jpeg", maxZoom: 18 },
    luftbild: { url: "https://wmts.geo.admin.ch/1.0.0/ch.swisstopo.swissimage/default/current/3857/{z}/{x}/{y}.jpeg", maxZoom: 19 },
    attribution: '© <a href="https://www.swisstopo.admin.ch" target="_blank" rel="noopener">swisstopo</a>',
  },
};

const TEXTE = {
  de: {
    titel: "Karte laden?",
    text: (a) => `Zum Einzeichnen laden wir Kartenkacheln direkt von ${a}. Dabei wird Ihre IP-Adresse an diesen Anbieter übertragen. Ihre Fläche bleibt in Ihrem Browser, bis Sie einen Bericht anfordern.`,
    laden: "Karte laden",
    ohne: "Ohne Karte geht es auch: Wählen Sie oben „Größe angeben“.",
    hilfe: "Zoomen Sie nah an Ihre Fläche heran und klicken Sie ihre Ecken an. Zum Schließen auf den ersten Punkt klicken.",
    hilfeFertig: "Fläche geschlossen. Ecken lassen sich mit der Maus verschieben.",
    zurueck: "Letzten Punkt entfernen",
    schliessen: "Fläche schließen",
    oeffnen: "Weiter zeichnen",
    neu: "Neu zeichnen",
    luftbild: "Luftbild",
    karte: "Karte",
    punkte: (n) => `${n} ${n === 1 ? "Punkt" : "Punkte"}`,
    fehler: {
      punkte: "Bitte mindestens 3 und höchstens 60 Ecken setzen.",
      ueberschneidung: "Die Linien überschneiden sich – bitte den letzten Punkt entfernen oder neu zeichnen.",
      ausserhalb: "Die Fläche liegt außerhalb von Deutschland, Österreich und der Schweiz.",
      klein: "Die Fläche ist kleiner als 0,1 ha.",
      gross: "Die Fläche ist größer als 2.000 ha – bitte einen Teil einzeichnen.",
      format: "Die Fläche ließ sich nicht lesen – bitte neu zeichnen.",
    },
    laedt: "Karte wird geladen …",
    kartenfehler: "Die Karte konnte nicht geladen werden. Sie können die Größe auch direkt angeben.",
    aria: "Karte zum Einzeichnen der Fläche",
  },
  en: {
    titel: "Load the map?",
    text: (a) => `To draw your land, we load map tiles directly from ${a}. This transfers your IP address to this provider. Your land stays in your browser until you request a report.`,
    laden: "Load map",
    ohne: "You can also do without the map: choose “Enter size” above.",
    hilfe: "Zoom in close to your land and click its corners. Click the first point to close it.",
    hilfeFertig: "Land closed. You can drag the corners with the mouse.",
    zurueck: "Remove last point",
    schliessen: "Close shape",
    oeffnen: "Continue drawing",
    neu: "Draw again",
    luftbild: "Aerial",
    karte: "Map",
    punkte: (n) => `${n} ${n === 1 ? "point" : "points"}`,
    fehler: {
      punkte: "Please set at least 3 and at most 60 corners.",
      ueberschneidung: "The lines cross – please remove the last point or draw again.",
      ausserhalb: "The land is outside Germany, Austria and Switzerland.",
      klein: "The land is smaller than 0.1 ha.",
      gross: "The land is larger than 2,000 ha – please draw part of it.",
      format: "The land could not be read – please draw again.",
    },
    laedt: "Loading map …",
    kartenfehler: "The map could not be loaded. You can also enter the size directly.",
    aria: "Map for drawing your land",
  },
};

const GRUEN = "#558227";

/**
 * Props: land ("DE"|"AT"|"CH"), zentrum [lat, lon, zoom], wert (Zeichenkette "lon,lat;…" oder ""),
 * onChange({ flaeche, ha, kompaktheit } | null)
 */
export default function FlaechenKarte({ land, zentrum, wert, onChange }) {
  const en = useSprache() === "en";
  const t = useMemo(() => (en ? TEXTE.en : schreibweiseFuer(TEXTE.de, land)), [en, land]); // CH: ohne „ß“ (stabile Identität)
  const gk = GRUNDKARTEN[land] || GRUNDKARTEN.DE;
  const [geladen, setGeladen] = useState(false);
  const [status, setStatus] = useState("aus"); // aus | laedt | bereit | fehler
  const [punkte, setPunkte] = useState(() => (wert ? wert.split(";").map((p) => p.split(",").map(Number)) : [])); // [lon, lat]
  const [geschlossen, setGeschlossen] = useState(Boolean(wert));
  const [fehler, setFehler] = useState("");
  const [luftbild, setLuftbild] = useState(false);
  const boxRef = useRef(null);
  const karteRef = useRef(null);
  const LRef = useRef(null);
  const ebenenRef = useRef({});
  const zeichnungRef = useRef(null);
  const zustandRef = useRef({ punkte, geschlossen });
  zustandRef.current = { punkte, geschlossen };

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fehlerTexte = t.fehler;
  const melden = useCallback(
    (liste, zu) => {
      const an = onChangeRef.current;
      if (!zu) {
        an?.(null);
        return;
      }
      const g = flaecheLesen(flaecheText(liste));
      if (g.fehler) {
        setFehler(fehlerTexte[g.fehler] || fehlerTexte.format);
        an?.(null);
        return;
      }
      setFehler("");
      const k = flaecheKennzahlen(g.geometrie);
      an?.({ flaeche: g.text, ha: k.ha, kompaktheit: k.kompaktheit });
    },
    [fehlerTexte]
  );

  // Karte erst nach dem Klick laden
  useEffect(() => {
    if (!geladen) return undefined;
    let aus = false;
    setStatus("laedt");
    (async () => {
      try {
        const mod = await import("leaflet");
        if (aus || !boxRef.current) return;
        const Lf = mod.default || mod;
        LRef.current = Lf;
        const [lat, lon, zoom] = zentrum || [50, 10, 6];
        const m = Lf.map(boxRef.current, { center: [lat, lon], zoom, minZoom: 5, maxZoom: 19, zoomControl: true, attributionControl: true });
        m.attributionControl.setPrefix(false);
        ebenenRef.current.karte = Lf.tileLayer(gk.karte.url, { maxZoom: gk.karte.maxZoom, attribution: gk.attribution }).addTo(m);
        if (gk.luftbild) ebenenRef.current.luftbild = Lf.tileLayer(gk.luftbild.url, { maxZoom: gk.luftbild.maxZoom, attribution: gk.attribution });
        zeichnungRef.current = Lf.layerGroup().addTo(m);
        m.on("click", (ev) => {
          const z = zustandRef.current;
          if (z.geschlossen || z.punkte.length >= 60) return;
          const p = [Math.round(ev.latlng.lng * 1e6) / 1e6, Math.round(ev.latlng.lat * 1e6) / 1e6];
          setPunkte([...z.punkte, p]);
        });
        karteRef.current = m;
        if (zustandRef.current.punkte.length) {
          const b = Lf.latLngBounds(zustandRef.current.punkte.map((p) => [p[1], p[0]]));
          m.fitBounds(b.pad(0.3));
        }
        setStatus("bereit");
      } catch {
        if (!aus) setStatus("fehler");
      }
    })();
    return () => {
      aus = true;
      karteRef.current?.remove();
      karteRef.current = null;
    };
    // Land/Zentrum ändern sich nur mit neuem Schlüssel der Komponente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geladen]);

  // Grundkarte/Luftbild umschalten
  useEffect(() => {
    const m = karteRef.current;
    const e = ebenenRef.current;
    if (!m || !e.karte) return;
    if (luftbild && e.luftbild) {
      m.removeLayer(e.karte);
      e.luftbild.addTo(m);
    } else {
      if (e.luftbild) m.removeLayer(e.luftbild);
      e.karte.addTo(m);
    }
  }, [luftbild, status]);

  // Zeichnung neu aufbauen
  useEffect(() => {
    const Lf = LRef.current;
    const gruppe = zeichnungRef.current;
    if (!Lf || !gruppe || status !== "bereit") return;
    gruppe.clearLayers();
    const ll = punkte.map((p) => [p[1], p[0]]);
    if (ll.length >= 2) {
      const stil = { color: GRUEN, weight: 3, fillColor: "#8cba58", fillOpacity: 0.3 };
      (geschlossen ? Lf.polygon(ll, stil) : Lf.polyline(ll, { ...stil, dashArray: "6 6" })).addTo(gruppe);
    }
    ll.forEach((p, i) => {
      const erster = i === 0 && !geschlossen && ll.length >= 3;
      const icon = Lf.divIcon({
        className: "",
        html: `<span style="display:block;width:${erster ? 18 : 14}px;height:${erster ? 18 : 14}px;border-radius:9999px;background:#fff;border:3px solid ${GRUEN};box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
        iconSize: erster ? [18, 18] : [14, 14],
        iconAnchor: erster ? [9, 9] : [7, 7],
      });
      const mk = Lf.marker(p, { icon, draggable: geschlossen, keyboard: false, title: erster ? t.schliessen : undefined }).addTo(gruppe);
      if (erster) mk.on("click", () => setGeschlossen(true));
      if (geschlossen) {
        mk.on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          setPunkte((alt) => alt.map((q, j) => (j === i ? [Math.round(pos.lng * 1e6) / 1e6, Math.round(pos.lat * 1e6) / 1e6] : q)));
        });
      }
    });
  }, [punkte, geschlossen, status, t.schliessen]);

  // Ergebnis melden
  useEffect(() => {
    melden(punkte, geschlossen);
  }, [punkte, geschlossen, melden]);

  const neu = () => {
    setPunkte([]);
    setGeschlossen(false);
    setFehler("");
  };

  if (!geladen) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-sand-50 p-6 text-center ring-1 ring-ink-200/70 md:min-h-[400px] md:p-10">
        <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ov-600 shadow-e2 ring-1 ring-ink-200/70">
          <MapPinned className="h-6 w-6" />
        </span>
        <p className="mt-4 font-display text-[19px] font-bold text-ink-900">{t.titel}</p>
        <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-ink-600">{t.text(en ? gk.anbieterEn : gk.anbieter)}</p>
        <button
          type="button"
          onClick={() => setGeladen(true)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(102,153,51,0.65)] hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2"
        >
          <MapPinned aria-hidden="true" className="h-4 w-4" />
          {t.laden}
        </button>
        <p className="mt-3 text-[13px] text-ink-500">{t.ohne}</p>
      </div>
    );
  }

  const knopf = "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-3.5 text-[13.5px] font-semibold text-ink-800 ring-1 ring-ink-200 hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500";
  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-ink-200/70">
        <div ref={boxRef} role="application" aria-label={t.aria} className="h-[340px] w-full bg-sand-100 md:h-[440px]" style={{ cursor: geschlossen ? "grab" : "crosshair" }} />
        {status !== "bereit" && (
          <div className="absolute inset-0 flex items-center justify-center bg-sand-50/90 p-6 text-center text-[14px] text-ink-600">{status === "fehler" ? t.kartenfehler : t.laedt}</div>
        )}
        {gk.luftbild && status === "bereit" && (
          <button type="button" onClick={() => setLuftbild((x) => !x)} className={cn(knopf, "absolute right-3 top-3 z-[500] shadow-e2")} aria-pressed={luftbild}>
            <Layers aria-hidden="true" className="h-4 w-4" />
            {luftbild ? t.karte : t.luftbild}
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="mr-auto min-w-0 text-[13.5px] leading-snug text-ink-600" aria-live="polite">
          {geschlossen ? t.hilfeFertig : t.hilfe} <span className="ov-num whitespace-nowrap font-semibold text-ink-800">· {t.punkte(punkte.length)}</span>
        </p>
        {!geschlossen && (
          <>
            <button type="button" className={knopf} onClick={() => setPunkte((p) => p.slice(0, -1))} disabled={!punkte.length}>
              <Undo2 aria-hidden="true" className="h-4 w-4" />
              {t.zurueck}
            </button>
            <button type="button" className={knopf} onClick={() => setGeschlossen(true)} disabled={punkte.length < 3}>
              <Check aria-hidden="true" className="h-4 w-4" />
              {t.schliessen}
            </button>
          </>
        )}
        {geschlossen && (
          <button type="button" className={knopf} onClick={() => setGeschlossen(false)}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t.oeffnen}
          </button>
        )}
        <button type="button" className={knopf} onClick={neu} disabled={!punkte.length}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          {t.neu}
        </button>
      </div>
      {fehler && (
        <p role="alert" className="mt-2 text-[13.5px] font-medium text-danger-700">
          {fehler}
        </p>
      )}
    </div>
  );
}

/** ha-Anzeige (für Kopfzeilen) */
export const haText = (ha, sprache) => `${fmtZahl(ha, ha < 10 ? 2 : 1, sprache)} ha`;
