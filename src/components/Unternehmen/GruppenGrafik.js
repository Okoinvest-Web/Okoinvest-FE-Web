import { Building2, Factory, Hammer, Sun, Zap } from "lucide-react";
import { GESELLSCHAFT } from "@/data/site";
import { cn } from "@/components/ui/cn";
import st from "./vertrauen.module.css";

/**
 * Struktur der Gruppe aus Sicht von ÖkoInvest – bewusst ohne
 * Beteiligungsquoten an ÖkoInvest selbst (nur belegte Angaben).
 * Ab lg ein Organigramm (Gruppe → vier Gesellschaften → Beteiligungen
 * unter ÖkoInvest), darunter eine eingerückte Baumliste.
 * Bewegung (ab lg, ausgelöst vom Eltern-Reveal): Die Gruppe steht zuerst, dann
 * zeichnen sich die Verbindungen nach unten, die Gesellschaften folgen, zuletzt
 * wächst der Ast zu den Beteiligungen von ÖkoInvest – die Struktur wird
 * nachvollziehbar statt auf einmal hingestellt. Reduziert/ohne JS: statisch.
 */
const T = { stamm: 120, quer: 320, fall: 540, knoten: 680, astStamm: 1060, astQuer: 1220, astFall: 1380, ast: 1500 };
const t = (ms) => ({ "--t": `${ms}ms` });
const SCHWESTERN = [
  { icon: Factory, titel: "ÖKOVOLT GmbH Solartechnik", text: "Muttergesellschaft in Türkheim – PV und Speicher für Gewerbe", land: "DE" },
  { icon: Factory, titel: "ÖKOVOLT Solartechnik GmbH", text: "Schwestergesellschaft in Ostermiething", land: "AT" },
  { icon: Hammer, titel: "Deutsche Solar & Rammtechnik GmbH", text: "Fundamente für Freiflächenanlagen", land: "DE" },
];
const OI = { icon: Sun, titel: GESELLSCHAFT.name, text: "Projektentwicklung, Projektbörse, virtuelles Kraftwerk", land: "AT" };

export default function GruppenGrafik({ className }) {
  return (
    <figure className={cn("relative rounded-[1.75rem] bg-white p-5 shadow-e3 ring-1 ring-ink-200/70 sm:p-7 md:rounded-[2rem] lg:p-10", className)}>
      <figcaption className="sr-only">Einordnung der ÖkoInvest GmbH in die ÖKOVOLT Gruppe mit ihren Beteiligungen</figcaption>
      <div aria-hidden="true" className="ov-grid-bg-light pointer-events-none absolute inset-0 rounded-[inherit] opacity-70" />

      {/* Organigramm ab lg */}
      <div className="relative hidden lg:block">
        <div className="mx-auto max-w-sm">
          <Knoten dunkel icon={Building2} titel="ÖKOVOLT Gruppe" text="Familiengeführt, seit 2010 im Solargeschäft" />
        </div>
        <Verteiler spalten={4} />
        <div className="grid grid-cols-4 gap-4">
          {SCHWESTERN.map((k, i) => (
            <div key={k.titel} className={st.folgt} style={t(T.knoten + i * 80)}>
              <Knoten {...k} />
            </div>
          ))}
          <div className={st.folgt} style={t(T.knoten + 3 * 80)}>
            <Knoten gruen {...OI} />
          </div>
        </div>
        {/* Beteiligungen unter ÖkoInvest: Linie aus Spalte 4 in die Spalten 3–4 */}
        <div className="grid grid-cols-4 gap-4">
          <p className={cn(st.folgt, "col-span-2 self-end pb-1 pr-8 text-[13px] leading-relaxed text-ink-500")} style={t(T.ast + 160)}>
            Länderkürzel: Sitz der Gesellschaft. Anteile nennen wir nur dort, wo sie im Firmenbuch eingetragen sind.
          </p>
          <div className="col-span-2">
            <div aria-hidden="true" className="relative h-10">
              <span className={cn(st.linieY, "absolute right-[calc(25%-1px)] top-0 h-5 w-0.5 bg-ov-500")} style={t(T.astStamm)} />
              <span className={cn(st.linieX, "absolute left-[25%] right-[25%] top-5 h-0.5 bg-ov-500")} style={t(T.astQuer)} />
              <span className={cn(st.linieY, "absolute left-[calc(25%-1px)] top-5 h-5 w-0.5 bg-ov-500")} style={t(T.astFall)} />
              <span className={cn(st.linieY, "absolute right-[calc(25%-1px)] top-5 h-5 w-0.5 bg-ov-500")} style={t(T.astFall)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {GESELLSCHAFT.beteiligungen.map((b, i) => (
                <div key={b.name} className={st.folgt} style={t(T.ast + i * 80)}>
                  <Knoten icon={Zap} titel={b.name} text={b.text} anteil={b.anteil} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Baumliste bis lg */}
      <div className="relative lg:hidden">
        <Knoten dunkel icon={Building2} titel="ÖKOVOLT Gruppe" text="Familiengeführt, seit 2010 im Solargeschäft" />
        <ul className="ml-5 border-l-2 border-ov-200 pl-4 pt-3">
          {SCHWESTERN.map((k) => (
            <li key={k.titel} className="relative pb-3">
              <Ast />
              <Knoten {...k} />
            </li>
          ))}
          <li className="relative">
            <Ast gruen />
            <Knoten gruen {...OI} />
            <ul className="ml-5 border-l-2 border-ov-400 pl-4 pt-3">
              {GESELLSCHAFT.beteiligungen.map((b) => (
                <li key={b.name} className="relative pb-3 last:pb-0">
                  <Ast gruen />
                  <Knoten icon={Zap} titel={b.name} text={b.text} anteil={b.anteil} />
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </div>
    </figure>
  );
}

/** Verbindung von einem Knoten auf n Spalten (Linie in die Spaltenmitten) */
function Verteiler({ spalten }) {
  const halb = 100 / spalten / 2;
  return (
    <div aria-hidden="true" className="relative h-12">
      {/* Stamm ohne -translate-x (transform gehört der Animation) – Versatz über margin */}
      <span className={cn(st.linieY, "absolute left-1/2 top-0 -ml-px h-6 w-0.5 bg-ov-300")} style={t(T.stamm)} />
      <span className={cn(st.linieX, "absolute top-6 h-0.5 bg-ov-300")} style={{ left: `${halb}%`, right: `${halb}%`, ...t(T.quer) }} />
      {Array.from({ length: spalten }, (_, i) => (
        <span key={i} className={cn(st.linieY, "absolute top-6 -ml-px h-6 w-0.5", i === spalten - 1 ? "bg-ov-500" : "bg-ov-300")} style={{ left: `${halb + (i * 100) / spalten}%`, ...t(T.fall) }} />
      ))}
    </div>
  );
}

function Ast({ gruen }) {
  return <span aria-hidden="true" className={cn("absolute -left-4 top-7 h-0.5 w-4", gruen ? "bg-ov-400" : "bg-ov-200")} />;
}

function Knoten({ icon: Icon, titel, text, land, anteil, dunkel, gruen }) {
  return (
    <div
      className={cn(
        "relative flex h-full items-start gap-3 rounded-2xl p-4",
        dunkel ? "bg-navy-950 text-white shadow-e3" : gruen ? "ov-verlauf-gruen text-white shadow-[0_16px_36px_-14px_rgba(102,153,51,0.75)]" : "bg-white shadow-e1 ring-1 ring-ink-200/80"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", dunkel ? "bg-white/10 text-ov-300" : gruen ? "bg-white/15 text-white" : "bg-ov-50 text-ov-600 ring-1 ring-ov-100")}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={cn("font-display text-[15px] font-bold leading-snug", dunkel || gruen ? "text-white" : "text-ink-900")}>
          {titel}
          {land && <span className={cn("ml-1.5 inline-block rounded px-1.5 py-0.5 align-[2px] text-[10.5px] font-bold leading-none", dunkel || gruen ? "bg-white/15 text-white" : "bg-ink-100 text-ink-600")}>{land}</span>}
        </p>
        <p className={cn("mt-1 text-[13px] leading-snug", dunkel ? "text-white/65" : gruen ? "text-white/90" : "text-ink-600")}>{text}</p>
        {anteil && <p className="mt-2 inline-flex rounded-full bg-ov-50 px-2 py-0.5 text-[12px] font-semibold text-ov-700 ring-1 ring-ov-200">Anteil ÖkoInvest: {anteil}</p>}
      </div>
    </div>
  );
}
