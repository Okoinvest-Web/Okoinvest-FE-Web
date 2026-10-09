// src/components/Angebot/Buehne.js – Darstellung der Code-Eingabe (/angebot) und der Hinweisseiten von /angebot/[code].
// Server-Komponenten ohne Daten: zeigen nur, wo der Code im Anschreiben steht. Keine Eigentümer- oder Kampagnendaten.
import Link from "@/components/Land/Link";
import { FileText, KeyRound, MapPin, Calculator, Sun, Leaf, ShieldCheck, EyeOff } from "lucide-react";
import { cn } from "@/components/ui/cn";
import Aufbau, { aufbau } from "@/components/Flaeche/Seite/Aufbau";
import { pfad } from "@/lib/land";

/** Stilisiertes Anschreiben: Code-Feld rechts oben und QR-Code sind hervorgehoben (rein dekorativ) */
export function Briefbild({ className }) {
  const qr = [
    "1111111001011", "1000001010001", "1011101001101", "1011101110101", "1011101000101", "1000001011001", "1111111010101",
    "0000000011000", "1101011100111", "0110100101010", "1011011010011", "0010100111001", "1101011001101",
  ];
  return (
    // Blickführung: erst liegt der Brief da, dann zeigen Markierung und Hinweis, wo der Code steht – danach der QR-Code
    <Aufbau sofort aria-hidden="true" className={cn("relative", className)} style={{ "--pop-start": "650ms", "--pop-schritt": "520ms" }}>
      {/* zweites Blatt dahinter */}
      <div className="absolute inset-0 translate-x-4 translate-y-3 rotate-[3deg] rounded-2xl bg-white/70 shadow-e3" />
      <div className="relative rotate-[-2deg] rounded-2xl bg-white p-6 shadow-e5 ring-1 ring-ink-200/60 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[17px] font-extrabold tracking-tight"><span className="text-ov-600">ÖKO</span><span className="text-navy-700">INVEST</span></p>
            <div className="mt-4 space-y-1.5">
              <span className="block h-1.5 w-28 rounded-full bg-ink-200" />
              <span className="block h-1.5 w-24 rounded-full bg-ink-200" />
              <span className="block h-1.5 w-20 rounded-full bg-ink-200" />
            </div>
          </div>
          {/* Code-Feld */}
          <div className="relative">
            <span className={cn("absolute -inset-2 rounded-xl ring-2 ring-sun-400 ring-offset-2 ring-offset-white", aufbau.pop)} />
            <div className="rounded-lg bg-ink-50 px-3 py-2 text-right ring-1 ring-ink-200">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-500">Ihr Code</p>
              <p className="font-mono text-[14px] font-bold tracking-wider text-navy-950">ABCDE-23456</p>
            </div>
            <span className={cn("absolute -right-3 -top-8 whitespace-nowrap rounded-full bg-sun-400 px-2.5 py-1 text-[11px] font-bold text-navy-950 shadow-e2", aufbau.pop)} style={{ "--pop-start": "800ms" }}>hier steht er</span>
          </div>
        </div>
        <div className="mt-8 space-y-2">
          <span className="block h-2.5 w-2/3 rounded-full bg-ink-300" />
          {[100, 94, 97, 88, 92, 60].map((w, i) => (
            <span key={i} className="block h-1.5 rounded-full bg-ink-100" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="mt-7 flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            {[84, 70, 76].map((w, i) => (
              <span key={i} className="block h-1.5 rounded-full bg-ink-100" style={{ width: `${w * 1.6}px` }} />
            ))}
          </div>
          <div className="relative">
            <span className={cn("absolute -inset-2 rounded-xl ring-2 ring-ov-400/80 ring-offset-2 ring-offset-white", aufbau.pop)} style={{ "--i": 1 }} />
            <svg viewBox="0 0 13 13" className="h-16 w-16 sm:h-20 sm:w-20" shapeRendering="crispEdges">
              {qr.flatMap((zeile, y) => zeile.split("").map((c, x) => (c === "1" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#03122b" /> : null)))}
            </svg>
            <span className={cn("absolute -bottom-8 right-0 whitespace-nowrap rounded-full bg-ov-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-e2", aufbau.pop)} style={{ "--i": 1, "--pop-start": "800ms" }}>oder scannen</span>
          </div>
        </div>
      </div>
    </Aufbau>
  );
}

export const STECKBRIEF_INHALT = [
  { icon: MapPin, t: "Lage & Umriss", x: "Gemeinde und Flächenbereich – schematisch, ohne Hintergrundkarte" },
  { icon: Sun, t: "Mögliche Leistung", x: "erste Einschätzung in MWp aus öffentlichen Geodaten" },
  { icon: Leaf, t: "Unverbindliche Pachtspanne", x: "je Hektar und Jahr, dazu die Summe pro Jahr" },
  { icon: Calculator, t: "Pachtrechner", x: "vorbelegt mit Ihrer Fläche – Modell und Laufzeit selbst wählen" },
];

export const ZUSAGEN = [
  { icon: EyeOff, t: "Keine Angaben zu Ihrer Person", x: "Die Seite zeigt nur den Flächen-Steckbrief." },
  { icon: KeyRound, t: "Nur mit Ihrem Code", x: "Nicht von Suchmaschinen erfasst." },
  { icon: ShieldCheck, t: "Widerspruch mit einem Klick", x: "Kein Interesse? Wir schreiben Sie dann nicht mehr an." },
];

/** Hinweisseite (Code ungültig, gesperrt, zu viele Aufrufe) auf dunkler Bühne */
export function AngebotHinweis({ titel, text, erneut = true }) {
  return (
    <section className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div className="ov-container py-20 md:py-28">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-8 text-center text-ink-900 shadow-e5 ring-1 ring-white/20 md:p-10">
          <span aria-hidden="true" className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-200">
            <FileText className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-[26px] font-extrabold tracking-tight text-ink-900 md:text-[30px]">{titel}</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{text}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {erneut && <Link href="/angebot" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-[15px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">Code erneut eingeben</Link>}
            <Link href={pfad("/flaeche-verpachten")} className="inline-flex h-12 items-center justify-center rounded-full bg-ov-600 px-6 text-[15px] font-semibold text-white hover:bg-ov-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">Mehr zur Flächenverpachtung</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
