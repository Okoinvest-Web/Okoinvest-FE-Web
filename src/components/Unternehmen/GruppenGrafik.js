import { Building2, Factory, Hammer, Sun, Zap } from "lucide-react";
import { GESELLSCHAFT } from "@/data/site";
import { cn } from "@/components/ui/cn";

/**
 * Struktur der Gruppe aus Sicht von ÖkoInvest – bewusst ohne
 * Beteiligungsquoten an ÖkoInvest selbst (nur belegte Angaben).
 */
export default function GruppenGrafik() {
  return (
    <figure className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-8">
      <figcaption className="sr-only">Einordnung der ÖkoInvest GmbH in die ÖKOVOLT Gruppe mit ihren Beteiligungen</figcaption>

      <Knoten dunkel icon={Building2} titel="ÖKOVOLT Gruppe" text="Familiengeführt, seit 2010 im Solargeschäft" />
      <Linie />
      <div className="grid gap-2.5">
        <Knoten icon={Factory} titel="ÖKOVOLT GmbH Solartechnik" text="Muttergesellschaft, Türkheim (DE) – PV und Speicher für Gewerbe" land="DE" />
        <Knoten icon={Factory} titel="ÖKOVOLT Solartechnik GmbH" text="Schwestergesellschaft, Ostermiething (AT)" land="AT" />
        <Knoten icon={Hammer} titel="Deutsche Solar & Rammtechnik GmbH" text="Fundamente für Freiflächenanlagen" land="DE" />
      </div>
      <Linie />
      <Knoten gruen icon={Sun} titel={GESELLSCHAFT.name} text="Projektentwicklung Freifläche, Agri-PV, Carports, Speicher · Projektbörse · virtuelles Kraftwerk" land="AT" />
      <Linie />
      <div className="grid gap-3 sm:grid-cols-2">
        {GESELLSCHAFT.beteiligungen.map((b) => (
          <Knoten key={b.name} icon={Zap} titel={b.name} text={b.text} anteil={b.anteil} />
        ))}
      </div>
    </figure>
  );
}

function Linie() {
  return <div aria-hidden="true" className="mx-auto h-6 w-0.5 bg-gradient-to-b from-ov-300 to-ov-500" />;
}

function Knoten({ icon: Icon, titel, text, land, anteil, dunkel, gruen }) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-2xl p-4",
        dunkel ? "bg-navy-950 text-white" : gruen ? "bg-ov-600 text-white shadow-[0_12px_32px_-12px_rgba(102,153,51,0.7)]" : "bg-sand-50 ring-1 ring-ink-200/70"
      )}
    >
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", dunkel ? "bg-white/10 text-ov-300" : gruen ? "bg-white/15 text-white" : "bg-white text-ov-600 ring-1 ring-ink-200")}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={cn("font-display text-[15.5px] font-bold leading-snug", dunkel || gruen ? "text-white" : "text-ink-900")}>
          {titel}
          {land && <span className={cn("ml-2 rounded px-1.5 py-0.5 align-middle text-[10.5px] font-bold", dunkel || gruen ? "bg-white/15 text-white" : "bg-ink-100 text-ink-600")}>{land}</span>}
        </p>
        <p className={cn("mt-0.5 text-[13px] leading-snug", dunkel ? "text-white/60" : gruen ? "text-white/85" : "text-ink-600")}>{text}</p>
        {anteil && <p className="mt-1.5 text-[12.5px] font-semibold text-ov-700">Anteil ÖkoInvest: {anteil}</p>}
      </div>
    </div>
  );
}
