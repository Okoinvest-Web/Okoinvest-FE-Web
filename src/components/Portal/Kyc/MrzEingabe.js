"use client";

// Maschinenlesbare Zone (MRZ) abtippen – im Schritt „Ausweis“ der Verifizierung. Zwei bzw. drei Monospace-Felder mit
// Live-Prüfung (Zeichen, Länge, Prüfziffern, Abgleich mit den Angaben) und Hilfe-Grafik, wo die MRZ steht.
// Keine Bilderkennung, kein OCR. Der Server prüft beim Speichern erneut und legt die Zeilen verschlüsselt ab.

import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, CircleDashed, Info, ScanLine } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { senden } from "@/lib/plattform/client";
import { MRZ_AMPEL, MRZ_FORMATE, mrzBefund, mrzFormatFuerArt } from "@/lib/plattform/kycIdent";

const AMPEL_FARBE = { gruen: "text-ov-600", gelb: "text-sun-500", rot: "text-danger-600" };
const AMPEL_ICON = { gruen: CheckCircle2, gelb: Info, rot: CircleAlert };

/** Hilfe-Grafik: Ausweiskarte (Rückseite, 3 Zeilen) bzw. Passdatenseite (2 Zeilen) mit markierter MRZ */
export function MrzHilfe({ format = "TD1", className }) {
  const karte = format === "TD1";
  const zeilen = karte ? 3 : 2;
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={karte ? "Ausweiskarte, Rückseite: die maschinenlesbare Zone sind die drei Zeilen am unteren Rand" : "Reisepass, Datenseite: die maschinenlesbare Zone sind die zwei Zeilen am unteren Rand"} className={cn("h-auto w-full max-w-[320px]", className)}>
      <rect x="8" y="8" width="304" height="184" rx="16" fill="#f7f4ee" stroke="#d9d3c4" strokeWidth="2" />
      {karte ? (
        <>
          <rect x="24" y="26" width="120" height="10" rx="5" fill="#dfe3ea" />
          <rect x="24" y="44" width="170" height="8" rx="4" fill="#e9ecf1" />
          <rect x="24" y="58" width="150" height="8" rx="4" fill="#e9ecf1" />
          <rect x="24" y="72" width="190" height="8" rx="4" fill="#e9ecf1" />
          <circle cx="262" cy="60" r="24" fill="#e6efd9" stroke="#aed083" strokeWidth="2" />
        </>
      ) : (
        <>
          <rect x="24" y="24" width="72" height="92" rx="8" fill="#dfe3ea" />
          <circle cx="60" cy="58" r="16" fill="#c9cfd9" />
          <rect x="36" y="80" width="48" height="26" rx="10" fill="#c9cfd9" />
          <rect x="110" y="28" width="130" height="10" rx="5" fill="#dfe3ea" />
          <rect x="110" y="48" width="170" height="8" rx="4" fill="#e9ecf1" />
          <rect x="110" y="62" width="120" height="8" rx="4" fill="#e9ecf1" />
          <rect x="110" y="76" width="150" height="8" rx="4" fill="#e9ecf1" />
          <rect x="110" y="90" width="100" height="8" rx="4" fill="#e9ecf1" />
        </>
      )}
      <rect x="18" y={karte ? 110 : 128} width="284" height={karte ? 72 : 54} rx="10" fill="#e6efd9" stroke="#558227" strokeWidth="2.5" strokeDasharray="6 4" />
      {Array.from({ length: zeilen }, (_, i) => (
        <text key={i} x="30" y={(karte ? 132 : 150) + i * 20} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fontSize="12.5" fill="#03122b" letterSpacing="1.2">
          {karte ? ["IDD<<T22000129<<<<<<<<<", "6408125<2010315D<<<<<<<", "MUSTERMANN<<ERIKA<<<<<<"][i] : ["P<D<<MUSTERMANN<<ERIKA<<<<<<", "C01X00T478D<<6408125F27<<"][i]}
        </text>
      ))}
      <text x="300" y={karte ? 104 : 122} textAnchor="end" fontSize="11" fontWeight="700" fill="#558227">MRZ</text>
    </svg>
  );
}

/** Kompakte Befundliste (auch in der Compliance-Ansicht) */
export function MrzBefundListe({ befund, nurAuffaellig = false, className }) {
  if (!befund) return null;
  const liste = nurAuffaellig ? befund.befunde.filter((b) => b.ampel !== "gruen") : befund.befunde;
  return (
    <ul className={cn("space-y-1.5", className)}>
      {liste.map((b) => {
        const Icon = AMPEL_ICON[b.ampel];
        return (
          <li key={b.id} className="flex gap-2 text-[13.5px] leading-snug text-ink-800">
            <Icon aria-hidden="true" className={cn("mt-0.5 h-4 w-4 shrink-0", AMPEL_FARBE[b.ampel])} />
            <span><span className="sr-only">{MRZ_AMPEL[b.ampel].label}: </span>{b.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function MrzAmpel({ ampel, className }) {
  if (!ampel) return <Badge className={className}>MRZ fehlt</Badge>;
  return <Badge ton={MRZ_AMPEL[ampel].ton} className={className}>MRZ {MRZ_AMPEL[ampel].label}</Badge>;
}

export default function MrzEingabe({ person = {}, gespeichert = null, bearbeitbar = true, pflicht = false, onGespeichert }) {
  const [format, setFormat] = useState(() => gespeichert?.format || mrzFormatFuerArt(person?.ausweis?.art));
  const def = MRZ_FORMATE[format];
  const [zeilen, setZeilen] = useState(() => Array.from({ length: def.zeilen }, () => ""));
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [hilfe, setHilfe] = useState(false);

  const vollstaendig = zeilen.length === def.zeilen && zeilen.every((z) => z.length === def.laenge);
  const befund = useMemo(() => (vollstaendig ? mrzBefund(zeilen, person) : null), [vollstaendig, zeilen, person]);

  function formatWechseln(f) {
    setFormat(f);
    setZeilen(Array.from({ length: MRZ_FORMATE[f].zeilen }, () => ""));
    setErfolg("");
  }

  function setze(i, wert) {
    const sauber = wert.toUpperCase().replace(/[«‹]/g, "<").replace(/[^A-Z0-9<]/g, "").slice(0, def.laenge);
    setZeilen(zeilen.map((z, j) => (j === i ? sauber : z)));
    setErfolg("");
  }

  // Einfügen mehrerer Zeilen auf einmal (z. B. aus einer Notiz) auf die Felder verteilen
  function einfuegen(i, ev) {
    const text = ev.clipboardData?.getData("text") || "";
    const teile = text.toUpperCase().split(/\r?\n/).map((z) => z.replace(/\s+/g, "")).filter(Boolean);
    if (teile.length < 2) return;
    ev.preventDefault();
    setZeilen(zeilen.map((z, j) => (j >= i && teile[j - i] !== undefined ? teile[j - i].replace(/[^A-Z0-9<]/g, "").slice(0, def.laenge) : z)));
  }

  async function speichern() {
    setFehler("");
    setErfolg("");
    setLaeuft(true);
    try {
      const r = await senden("/api/portal/kyc", { method: "PATCH", body: { abschnitt: "mrz", daten: { zeilen } } });
      setErfolg(r.fall?.mrz?.ampel === "rot" ? "Gespeichert – die Prüfung ist auffällig. Bitte Eingabe und Angaben prüfen." : "Gespeichert und verschlüsselt abgelegt.");
      await onGespeichert?.(r);
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <div className="rounded-2xl p-4 ring-1 ring-inset ring-ink-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink-900">
            <ScanLine aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-navy-700" />
            Maschinenlesbare Zone abtippen
            {!pflicht && <span className="text-[12px] font-normal text-ink-500">empfohlen</span>}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-ink-600">Die Zeilen mit den „&lt;“-Zeichen unten auf der Rückseite der Ausweiskarte bzw. der Passdatenseite. Wir prüfen sofort die Prüfziffern und den Abgleich mit Ihren Angaben.</p>
        </div>
        {gespeichert && <MrzAmpel ampel={gespeichert.ampel} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Dokumentformat">
        {Object.entries(MRZ_FORMATE).map(([id, f]) => (
          <button key={id} type="button" role="radio" aria-checked={format === id} disabled={!bearbeitbar} onClick={() => formatWechseln(id)}
            className={cn("rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset transition-colors", format === id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ink-300")}>
            {f.label}
          </button>
        ))}
        <button type="button" onClick={() => setHilfe(!hilfe)} aria-expanded={hilfe} className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-ov-700 hover:bg-ov-50">
          {hilfe ? "Hilfe ausblenden" : "Wo steht die MRZ?"}
        </button>
      </div>
      {hilfe && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl bg-sand-50 p-3 sm:flex-row sm:items-center">
          <MrzHilfe format={format} />
          <p className="text-[13px] leading-relaxed text-ink-700">
            Die maschinenlesbare Zone besteht aus {def.zeilen} Zeilen mit je {def.laenge} Zeichen. Übernehmen Sie jedes „&lt;“ genau (z. B. „&lt;&lt;&lt;“), die Null ist eine Zahl, das „O“ ein Buchstabe. Die Grafik zeigt Musterdaten.
          </p>
        </div>
      )}

      {gespeichert && !zeilen.some(Boolean) && (
        <div className="mt-3">
          <p className="text-[13px] text-ink-600">Bereits gespeichert ({gespeichert.formatLabel}) – aus Datenschutzgründen zeigen wir die Zeilen nicht erneut an. Zum Ändern neu eingeben.</p>
          {gespeichert.ampel !== "gruen" && <MrzBefundListe befund={gespeichert} nurAuffaellig className="mt-2" />}
        </div>
      )}

      <fieldset disabled={!bearbeitbar} className="mt-3 space-y-2">
        <legend className="sr-only">MRZ-Zeilen</legend>
        {zeilen.map((z, i) => {
          const ok = z.length === def.laenge;
          return (
            <label key={`${format}-${i}`} className="block">
              <span className="mb-1 flex justify-between text-[12px] font-semibold text-ink-600">
                <span>Zeile {i + 1}</span>
                <span className={ok ? "text-ov-700" : "text-ink-500"}>{z.length}/{def.laenge}</span>
              </span>
              <input
                value={z}
                onChange={(e) => setze(i, e.target.value)}
                onPaste={(e) => einfuegen(i, e)}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="characters"
                inputMode="text"
                maxLength={def.laenge + 10}
                aria-label={`MRZ Zeile ${i + 1} von ${def.zeilen}, ${def.laenge} Zeichen`}
                className={cn("block h-11 w-full min-w-0 rounded-xl bg-white px-3 font-mono text-[13px] tracking-[0.08em] text-ink-900 ring-1 ring-inset outline-none transition focus:ring-2 focus:ring-ov-500 sm:text-[14.5px] sm:tracking-[0.14em]", ok ? "ring-ov-400" : "ring-ink-400")}
              />
            </label>
          );
        })}
      </fieldset>
      {/* Ansage nur beim Vervollständigen einer Zeile, nicht je Tastendruck */}
      <p className="sr-only" aria-live="polite">{zeilen.some(Boolean) ? `${zeilen.filter((z) => z.length === def.laenge).length} von ${def.zeilen} Zeilen vollständig` : ""}</p>

      {!vollstaendig && zeilen.some(Boolean) && (
        <p className="mt-2 flex items-center gap-2 text-[12.5px] text-ink-500"><CircleDashed aria-hidden="true" className="h-4 w-4" />Prüfung startet, sobald alle Zeilen vollständig sind.</p>
      )}
      {befund && (
        <div className="mt-3 rounded-2xl bg-ink-50 p-3" aria-live="polite">
          <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink-900">
            Prüfung: <MrzAmpel ampel={befund.ampel} /> <span className="font-normal text-ink-600">{befund.zusammenfassung}</span>
          </p>
          <MrzBefundListe befund={befund} className="mt-2" />
          <p className="mt-2 text-[12px] text-ink-500">Prüfziffern (7-3-1): {befund.pruefziffern.map((p) => `${p.label} ${p.ok ? "korrekt" : "falsch"}`).join(" · ")}</p>
        </div>
      )}
      {fehler && <p role="alert" className="mt-2 text-[13px] font-medium text-danger-700">{fehler}</p>}
      {erfolg && <p role="status" className="mt-2 text-[13px] font-medium text-ov-800">{erfolg}</p>}
      {bearbeitbar && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={speichern} disabled={!vollstaendig || laeuft}>{laeuft ? "Wird geprüft …" : "MRZ speichern"}</Button>
          <span className="text-[12px] text-ink-500">Die Zeilen werden verschlüsselt gespeichert und nur von unserer Compliance eingesehen.</span>
        </div>
      )}
    </div>
  );
}

