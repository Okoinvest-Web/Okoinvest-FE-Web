/** Rendert Text, in dem **fett** markierte Stellen hervorgehoben werden (sonst reiner Text). */
export default function Fett({ children }) {
  if (typeof children !== "string") return children;
  const teile = children.split(/\*\*(.+?)\*\*/g);
  return teile.map((t, i) => (i % 2 === 1 ? <strong key={i} className="font-semibold text-ink-900">{t}</strong> : t));
}

/** Entfernt **-Markierungen (für FAQ-Schema und Metadaten) */
export const ohneFett = (s) => (typeof s === "string" ? s.replace(/\*\*(.+?)\*\*/g, "$1") : s);
