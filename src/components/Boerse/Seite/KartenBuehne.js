// Hero-Bühne der Kartenansicht: leuchtende DACH-Karte auf Nacht-Hintergrund mit den echten
// Projekt-Clustern je Bundesland/Kanton (nie genaue Lage). Rein dekorativ – die bedienbare Karte folgt darunter.
import { KARTE, LAENDER_PFADE, regionPunkt } from "@/components/Boerse/KarteGeo";
import { LAENDER } from "@/lib/plattform/konstanten";
import { fmt } from "@/lib/rechner/annahmen";
import s from "@/components/Boerse/boerse.module.css";

function cluster(projekte) {
  const m = new Map();
  for (const p of projekte) {
    const key = `${p.land}|${p.bundesland || ""}`;
    const c = m.get(key) || { key, land: p.land, bundesland: p.bundesland || LAENDER[p.land] || p.land, anzahl: 0, mwp: 0 };
    c.anzahl++;
    c.mwp += Number(p.mwp) || 0;
    m.set(key, c);
  }
  return [...m.values()].map((c) => ({ ...c, punkt: regionPunkt(c.land, c.bundesland) })).filter((c) => c.punkt).sort((a, b) => a.anzahl - b.anzahl);
}

export default function KartenBuehne({ projekte = [] }) {
  const liste = cluster(projekte);
  const max = Math.max(1, ...liste.map((c) => c.anzahl));
  const top = [...liste].sort((a, b) => b.anzahl - a.anzahl || b.mwp - a.mwp).slice(0, 3);

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="mx-auto max-w-[340px] sm:max-w-[420px] lg:max-w-[460px]">
      {/* Beim Laden erscheinen die Projekt-Cluster nacheinander auf der Karte (reines CSS, ohne JS sofort sichtbar) */}
      <svg viewBox={`-20 -20 ${KARTE.breite + 40} ${KARTE.hoehe + 40}`} className={`${s.laden} block h-auto w-full`} style={{ "--ov-delay": "520ms" }} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="kb-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#b2d68a" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#b2d68a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="kb-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {LAENDER_PFADE.map((l) => (
          <path key={l.id} d={l.pfad} fill="url(#kb-land)" stroke="rgba(178,214,138,0.45)" strokeWidth="1.2" strokeLinejoin="round" />
        ))}
        {liste.map((c, i) => {
          const [x, y] = c.punkt;
          const r = 9 + (c.anzahl / max) * 13;
          return (
            <g key={c.key} className={s.blase} style={{ "--i": Math.min(i, 10) }}>
              <circle cx={x} cy={y} r={r * 2.6} fill="url(#kb-glow)" />
              <circle cx={x} cy={y} r={r} fill="#669933" stroke="#03122b" strokeWidth="3" />
              <text x={x} y={y + 5} textAnchor="middle" className="fill-white font-display text-[14px] font-extrabold">{c.anzahl}</text>
            </g>
          );
        })}
      </svg>
      </div>
      {top.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white/[0.04] p-3 max-sm:hidden ring-1 ring-inset ring-white/10 sm:p-4">
          <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ov-300">Meiste Projekte</p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {top.map((c) => (
              <li key={c.key} className="min-w-0 rounded-xl bg-white/[0.05] px-3 py-2">
                <span className="block truncate text-[12.5px] font-semibold text-white">{c.bundesland}</span>
                <span className="ov-num block text-[12px] text-white/60">{c.anzahl} {c.anzahl === 1 ? "Projekt" : "Projekte"} · {fmt(c.mwp, c.mwp < 10 ? 1 : 0)} MWp</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
