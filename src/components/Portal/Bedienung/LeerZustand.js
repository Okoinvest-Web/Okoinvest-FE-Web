// Leere Zustände mit Mini-Illustration (Inline-SVG im Markenstil: Grün/Navy/Sand, flach)
// und klarer nächster Aktion. Ohne Hooks – in Server- und Client-Komponenten nutzbar.

import { cn } from "@/components/ui/cn";
import { Erfolg, KeineDokumente, KeineFlaechen, KeineGebote, KeineNachrichten, KeineProjekte, SucheOhneTreffer } from "@/components/illustrationen"; // T7-Motive (Isometrie, 5:4)

// Isometrische T7-Motive je Art; die alten Mini-Bilder bleiben als Rückfall für unbekannte Arten
const MOTIV = { flaeche: KeineFlaechen, projekt: KeineProjekte, anfrage: KeineNachrichten, nachricht: KeineNachrichten, dokument: KeineDokumente, suche: SucheOhneTreffer, boerse: KeineGebote, fertig: Erfolg };

const G = { gruen: "#669933", gruenHell: "#aed083", gruen50: "#f4f9ee", navy: "#041d42", navyHell: "#7fa7d6", sand: "#f5f3ea", sandDunkel: "#dfe3ea", weiss: "#ffffff", ink: "#dfe3ea" };

function Boden() {
  return <ellipse cx="80" cy="92" rx="62" ry="7" fill={G.sand} />;
}

const BILDER = {
  flaeche: (
    <>
      <Boden />
      <path d="M22 88 L50 58 H122 L140 88 Z" fill={G.gruenHell} />
      <path d="M36 88 L58 62 M58 88 L74 62 M82 88 L92 62 M106 88 L110 62 M128 88 L126 62" stroke={G.gruen} strokeWidth="2" opacity=".55" />
      <g transform="translate(86 26)">
        <path d="M0 24 L10 6 H44 L34 24 Z" fill={G.navy} />
        <path d="M12 10 H40 M8 16 H37 M4 21 H35 M22 6 L14 24 M32 6 L25 24" stroke={G.navyHell} strokeWidth="1.2" opacity=".8" />
        <rect x="19" y="24" width="3" height="10" fill="#6b7486" />
      </g>
      <circle cx="44" cy="34" r="10" fill="#ffc53d" opacity=".85" />
      <g transform="translate(40 60)"><circle r="9" fill={G.gruen} /><path d="M-4 0 H4 M0 -4 V4" stroke={G.weiss} strokeWidth="2.4" strokeLinecap="round" /></g>
    </>
  ),
  projekt: (
    <>
      <Boden />
      <rect x="38" y="20" width="84" height="66" rx="10" fill={G.weiss} stroke={G.ink} strokeWidth="2" />
      <rect x="38" y="20" width="84" height="16" rx="8" fill={G.navy} />
      <rect x="50" y="46" width="36" height="6" rx="3" fill={G.ink} />
      <rect x="50" y="58" width="56" height="6" rx="3" fill={G.ink} />
      <path d="M52 78 L66 70 L78 74 L96 60" stroke={G.gruen} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(118 70)"><circle r="10" fill={G.gruen} /><path d="M-4.5 0 H4.5 M0 -4.5 V4.5" stroke={G.weiss} strokeWidth="2.6" strokeLinecap="round" /></g>
    </>
  ),
  anfrage: (
    <>
      <Boden />
      <rect x="40" y="30" width="80" height="56" rx="10" fill={G.weiss} stroke={G.ink} strokeWidth="2" />
      <path d="M40 40 L80 64 L120 40" stroke={G.navyHell} strokeWidth="2.4" fill="none" />
      <rect x="54" y="18" width="52" height="30" rx="6" fill={G.gruen50} stroke={G.gruenHell} strokeWidth="2" />
      <path d="M64 30 H96 M64 38 H86" stroke={G.gruen} strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  nachricht: (
    <>
      <Boden />
      <path d="M30 26 h66 a10 10 0 0 1 10 10 v26 a10 10 0 0 1 -10 10 h-40 l-16 12 v-12 h-10 a10 10 0 0 1 -10 -10 v-26 a10 10 0 0 1 10 -10 z" fill={G.navy} />
      <path d="M40 42 H88 M40 54 H74" stroke={G.navyHell} strokeWidth="3" strokeLinecap="round" />
      <path d="M78 50 h44 a8 8 0 0 1 8 8 v18 a8 8 0 0 1 -8 8 h-6 v10 l-12 -10 h-26 a8 8 0 0 1 -8 -8 v-18 a8 8 0 0 1 8 -8 z" fill={G.gruenHell} />
      <circle cx="92" cy="67" r="2.6" fill={G.gruen} /><circle cx="102" cy="67" r="2.6" fill={G.gruen} /><circle cx="112" cy="67" r="2.6" fill={G.gruen} />
    </>
  ),
  dokument: (
    <>
      <Boden />
      <path d="M50 16 h42 l18 18 v52 a6 6 0 0 1 -6 6 h-54 a6 6 0 0 1 -6 -6 v-64 a6 6 0 0 1 6 -6 z" fill={G.weiss} stroke={G.ink} strokeWidth="2" />
      <path d="M92 16 v18 h18" fill={G.gruen50} stroke={G.ink} strokeWidth="2" />
      <path d="M58 48 H98 M58 58 H98 M58 68 H84" stroke={G.ink} strokeWidth="3" strokeLinecap="round" />
      <g transform="translate(112 72)"><circle r="11" fill={G.gruen} /><path d="M0 5 V-5 M-4.5 -0.5 L0 -5 L4.5 -0.5" stroke={G.weiss} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
    </>
  ),
  suche: (
    <>
      <Boden />
      <circle cx="72" cy="48" r="26" fill={G.gruen50} stroke={G.navy} strokeWidth="6" />
      <path d="M92 68 L114 88" stroke={G.navy} strokeWidth="9" strokeLinecap="round" />
      <path d="M62 42 L82 54 M82 42 L62 54" stroke={G.gruen} strokeWidth="3.4" strokeLinecap="round" />
    </>
  ),
  boerse: (
    <>
      <Boden />
      <rect x="28" y="30" width="46" height="56" rx="8" fill={G.weiss} stroke={G.ink} strokeWidth="2" />
      <rect x="86" y="22" width="46" height="64" rx="8" fill={G.navy} />
      <path d="M36 70 L46 62 L54 66 L66 52" stroke={G.gruen} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M94 70 L104 60 L112 64 L124 46" stroke={G.gruenHell} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M96 36 H122" stroke={G.navyHell} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  fertig: (
    <>
      <Boden />
      <circle cx="80" cy="50" r="32" fill={G.gruen50} />
      <circle cx="80" cy="50" r="22" fill={G.gruen} />
      <path d="M70 50 L77 57 L91 43" stroke={G.weiss} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function LeerIllustration({ art = "suche", className }) {
  const Motiv = MOTIV[art];
  if (Motiv) return <Motiv className={cn("h-[112px] w-[140px]", className)} />;
  return (
    <svg viewBox="0 0 160 104" aria-hidden="true" focusable="false" className={cn("h-[88px] w-[136px]", className)}>
      {BILDER[art] || BILDER.suche}
    </svg>
  );
}

/** Leerer Zustand: Illustration, Titel, Text, nächste Aktion (+ optional zweite) */
export default function LeerZustand({ art, titel, text, aktion, zweite, className, kompakt = false }) {
  return (
    <div className={cn("flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 text-center", kompakt ? "px-5 py-8" : "px-6 py-12", className)}>
      <LeerIllustration art={art} />
      <p className="mt-3 font-display text-[18px] font-bold text-ink-900">{titel}</p>
      {text && <p className="mt-1.5 max-w-md text-[14.5px] leading-relaxed text-ink-600">{text}</p>}
      {(aktion || zweite) && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{aktion}{zweite}</div>}
    </div>
  );
}
