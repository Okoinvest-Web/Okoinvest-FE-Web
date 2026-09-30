// Beteiligungsstruktur als Inline-SVG (Server-Komponente, ohne Hooks): Ebenen per Breitensuche ab den Gesellschaften
// ohne Mutter in der Gruppe; Kanten mit Beteiligungsquote; externe Mitgesellschafter als gestrichelte Hinweise.

import { GESELLSCHAFT_STATUS } from "@/lib/plattform/dienste/gesellschaft/rechtsformen";

const B = 212;
const H = 80;
const DX = 28;
const DY = 118;
const FARBE = { bestand: "#558227", aktiv: "#558227", eingetragen: "#003473", in_gruendung: "#003473", entwurf: "#6b7486" };

function kuerzen(s, max = 30) {
  const t = String(s || "");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export default function Organigramm({ daten }) {
  const { knoten = [], kanten = [], extern = [], gruppe } = daten || {};
  if (!knoten.length) return <p className="text-[14px] text-ink-500">Noch keine Gesellschaften.</p>;
  const kinder = new Map(knoten.map((k) => [k.id, []]));
  const hatMutter = new Set();
  for (const e of kanten) {
    kinder.get(e.von)?.push(e.nach);
    hatMutter.add(e.nach);
  }
  // Ebenen per Breitensuche
  const ebene = new Map();
  const wurzeln = knoten.filter((k) => !hatMutter.has(k.id)).map((k) => k.id);
  const schlange = wurzeln.map((id) => [id, 0]);
  while (schlange.length) {
    const [id, e] = schlange.shift();
    if (ebene.has(id) && ebene.get(id) >= e) continue;
    ebene.set(id, e);
    for (const k of kinder.get(id) || []) if (e < 8) schlange.push([k, e + 1]);
  }
  for (const k of knoten) if (!ebene.has(k.id)) ebene.set(k.id, 0);
  // Ebenen in Zeilen zu höchstens 4 Gesellschaften umbrechen (lesbar auch bei vielen SPV)
  const ebenen = [];
  for (const k of knoten) (ebenen[ebene.get(k.id)] ||= []).push(k);
  const reihen = [];
  for (const r of ebenen.filter(Boolean)) for (let i = 0; i < r.length; i += 4) reihen.push(r.slice(i, i + 4));
  const breiteMax = Math.max(...reihen.map((r) => r.length));
  const W = Math.max(breiteMax * (B + DX) + DX + 24, 520);
  const oben = 60;
  const pos = new Map();
  reihen.forEach((r, e) => {
    const gesamt = r.length * B + (r.length - 1) * DX;
    const x0 = 24 + (W - 24 - gesamt) / 2;
    r.forEach((k, i) => pos.set(k.id, { x: x0 + i * (B + DX), y: oben + e * DY }));
  });
  const Hges = oben + reihen.length * DY + 20;
  const externZu = new Map();
  for (const x of extern) (externZu.get(x.nach) || externZu.set(x.nach, []).get(x.nach)).push(x);

  // Linien zuerst, Beschriftungen danach (keine Linie läuft durch eine Beschriftung)
  const linien = kanten.map((e) => {
    const a = pos.get(e.von);
    const b = pos.get(e.nach);
    if (!a || !b) return null;
    const x1 = a.x + B / 2;
    const y1 = a.y + H;
    const x2 = b.x + B / 2;
    const y2 = b.y;
    const ym = y2 - 19;
    // Sammelschiene am linken Rand: von der Mutter nach unten, dann zu jeder Tochter (keine Kreuzung durch Kästen)
    const pfad = y2 - y1 <= DY - H + 1 ? `M${x1},${y1} V${ym} H${x2} V${y2}` : `M${x1},${y1} V${y1 + 12} H10 V${ym} H${x2} V${y2}`;
    return { key: `${e.von}-${e.nach}`, pfad, x2, ym, anteil: e.anteil };
  }).filter(Boolean);

  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label={`Beteiligungsstruktur der Gesellschaften (${knoten.length})`} viewBox={`0 0 ${W} ${Hges}`} className="h-auto w-full font-sans" style={{ minWidth: Math.min(W, 720) }}>
        <rect x="8" y="8" width={W - 16} height="30" rx="15" fill="#f5f3ea" />
        <text x={W / 2} y="28" textAnchor="middle" fontSize="12" fontWeight="700" fill="#394050">{gruppe}</text>
        {linien.map((l) => <path key={`p-${l.key}`} d={l.pfad} fill="none" stroke="#aed083" strokeWidth="2" />)}
        {linien.map((l) => (
          <g key={`l-${l.key}`}>
            <rect x={l.x2 - 26} y={l.ym - 10} width="52" height="20" rx="10" fill="#fff" stroke="#aed083" />
            <text x={l.x2} y={l.ym + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#3d5f1b">{`${String(l.anteil).replace(".", ",")} %`}</text>
          </g>
        ))}
        {knoten.map((k) => {
          const p = pos.get(k.id);
          const farbe = FARBE[k.status] || "#6b7486";
          const ext = externZu.get(k.id) || [];
          return (
            <g key={k.id}>
              <a href={`/portal/admin/gesellschaften/${k.id}`} aria-label={`${k.name} öffnen`}>
                <rect x={p.x} y={p.y} width={B} height={H} rx="16" fill="#fff" stroke={farbe} strokeWidth={k.status === "entwurf" ? 1.5 : 2} strokeDasharray={k.status === "entwurf" ? "5 4" : undefined} />
                <text x={p.x + 14} y={p.y + 24} fontSize="12.5" fontWeight="700" fill="#151a24">{kuerzen(k.name)}</text>
                <text x={p.x + 14} y={p.y + 43} fontSize="11" fill="#6b7486">{[k.land, k.registernummer || "in Gründung"].filter(Boolean).join(" · ")}</text>
                <text x={p.x + 14} y={p.y + 58} fontSize="10.5" fontWeight="600" fill={farbe}>{GESELLSCHAFT_STATUS[k.status]?.label || k.status}</text>
              </a>
              {ext.length > 0 && (
                <text x={p.x + 14} y={p.y + 73} fontSize="10" fill="#6b7486">{kuerzen(`+ ${ext.map((x) => `${x.name} ${x.anteil} %`).join(", ")}`, 34)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
