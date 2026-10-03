// Das Prinzip: Text links, rechts die „Lücke“ zwischen Solarerzeugung und Betriebslast im Tagesverlauf (schematisch)
import { CalendarClock, LineChart, SlidersHorizontal } from "lucide-react";
import Section from "@/components/ui/Section";
import Reveal from "@/components/ui/Reveal";
import Kopf from "@/components/Energie/Seite/Kopf";

const PUNKTE = [
  { icon: CalendarClock, title: "Prognose", text: "Wetter, Lastgänge und Börsenpreise im Viertelstundenraster" },
  { icon: SlidersHorizontal, title: "Steuerung", text: "Fahrpläne für Parks, Speicher und flexible Verbraucher" },
  { icon: LineChart, title: "Vermarktung", text: "gemeinsam statt jede Anlage für sich" },
];

function LueckeGrafik() {
  const W = 560;
  const H = 300;
  const L = 16;
  const R = 16;
  const T = 30;
  const B = 250;
  const x = (h) => L + (h / 24) * (W - L - R);
  const n = 97;
  const stunden = Array.from({ length: n }, (_, i) => (i * 24) / (n - 1));
  const solar = (h) => (h < 6 || h > 20 ? 0 : Math.pow(Math.sin(((h - 6) / 14) * Math.PI), 1.5));
  // Betriebslast: Zweischichtbetrieb, 6–22 Uhr hoch
  const last = (h) => 0.18 + (h >= 6 && h < 22 ? 0.42 + 0.06 * Math.sin(((h - 6) / 16) * Math.PI) : 0);
  const preis = (h) => 0.6 - 0.48 * solar(h) + (h > 16.5 && h < 22 ? 0.26 * Math.sin(((h - 16.5) / 5.5) * Math.PI) : 0) + (h > 5 && h < 9.5 ? 0.12 * Math.sin(((h - 5) / 4.5) * Math.PI) : 0);
  const y = (v) => B - v * (B - T - 20);
  const pfad = (f) => stunden.map((h, i) => `${i ? "L" : "M"}${x(h).toFixed(1)},${y(f(h)).toFixed(1)}`).join(" ");
  const flaeche = (f) => `${pfad(f)} L${x(24)},${B} L${x(0)},${B} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Schema: Mittags erzeugt der Solarpark mehr, als der Betrieb braucht, und der Börsenpreis fällt; abends und nachts braucht der Betrieb Strom, wenn der Park nichts liefert und der Preis steigt.">
      <defs>
        <linearGradient id="vk-solar" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffc53d" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffc53d" stopOpacity="0.05" />
        </linearGradient>
        <pattern id="vk-luecke" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#1f5aa1" strokeOpacity="0.35" strokeWidth="2" />
        </pattern>
      </defs>
      {[6, 12, 18].map((h) => (
        <line key={h} x1={x(h)} x2={x(h)} y1={T} y2={B} stroke="#e3e7ee" />
      ))}
      <path d={flaeche(last)} fill="url(#vk-luecke)" />
      <path d={flaeche(solar)} fill="url(#vk-solar)" />
      <path d={pfad(solar)} fill="none" stroke="#f5a70f" strokeWidth="2.5" />
      <path d={pfad(last)} fill="none" stroke="#1f5aa1" strokeWidth="2.5" />
      <path d={pfad(preis)} fill="none" stroke="#558227" strokeWidth="2" strokeDasharray="6 5" />
      <line x1={L} x2={W - R} y1={B} y2={B} stroke="#c9d1dc" />
      {[0, 6, 12, 18, 24].map((h) => (
        <text key={h} x={x(h)} y={B + 22} textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"} fontSize="13" fill="#6b7587">{`${h}:00`}</text>
      ))}
      <g fontSize="13" fontWeight="700">
        <rect x={x(10.2)} y={T - 6} width="118" height="24" rx="12" fill="#fff7df" stroke="#f5a70f" />
        <text x={x(10.2) + 59} y={T + 10} textAnchor="middle" fill="#8a5a00">Überschuss</text>
        <rect x={x(19.9)} y={y(0.42) - 12} width="96" height="24" rx="12" fill="#eef4fb" stroke="#1f5aa1" />
        <text x={x(19.9) + 48} y={y(0.42) + 4} textAnchor="middle" fill="#03285a">Lücke</text>
      </g>
    </svg>
  );
}

export default function Prinzip() {
  return (
    <Section tone="white" space="lg" data-abschnitt="prinzip" aria-labelledby="prinzip-titel">
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
        <div>
          <Kopf id="prinzip-titel" eyebrow="Das Prinzip" titel="Was ist ein virtuelles Kraftwerk?" />
          <Reveal className="mt-6 space-y-4 text-[16.5px] leading-relaxed text-ink-600">
            <p>
              Ein einzelner Solarpark liefert, wenn die Sonne scheint. Ein Unternehmen verbraucht, wenn es produziert. Beides passt selten genau zusammen – und genau diese Lücke kostet Geld:
              Mittags fällt der Börsenpreis, abends steigt er.
            </p>
            <p>
              Ein virtuelles Kraftwerk verbindet viele Anlagen über Software und Fernsteuerung zu einem Verbund. Es prognostiziert Erzeugung und Verbrauch, verschiebt Energie mit Speichern und
              flexiblen Lasten und tritt am Markt auf wie ein großes Kraftwerk. Physisch bleibt jede Anlage, wo sie ist.
            </p>
          </Reveal>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {PUNKTE.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 60} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
                <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ov-600 shadow-e1 ring-1 ring-ink-200/70">
                  <p.icon className="h-5 w-5" />
                </span>
                <p className="mt-3 font-display text-[16px] font-bold text-ink-900">{p.title}</p>
                <p className="mt-1 text-[14px] leading-snug text-ink-600">{p.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        <Reveal dir="scale" as="figure" className="min-w-0 rounded-[2rem] bg-white p-5 shadow-e4 ring-1 ring-ink-200/70 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <figcaption className="font-display text-[18px] font-bold text-ink-900">Ein Tag am Solarpark und im Betrieb</figcaption>
            <span className="text-[12px] text-ink-500">schematisch, keine Messdaten</span>
          </div>
          <div className="mt-5">
            <LueckeGrafik />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-600">
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-sun-500" /> Solarerzeugung
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-[3px] w-5 rounded-full bg-navy-500" /> Verbrauch im Betrieb
            </li>
            <li className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="h-0 w-5 border-t-2 border-dashed border-ov-600" /> Börsenpreis
            </li>
          </ul>
        </Reveal>
      </div>
    </Section>
  );
}
