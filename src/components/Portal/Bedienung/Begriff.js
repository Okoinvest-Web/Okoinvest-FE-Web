// Kontexthilfe an Fachbegriffen: <Begriff id="nda">NDA</Begriff>
// Server-Komponente – liest den Eintrag aus src/data/lexikon.js (einzige Quelle) und gibt
// nur Begriff, Kurzdefinition und Link an das kleine „?“-Popover im Browser weiter.

import { BEGRIFFE } from "@/data/lexikon";
import BegriffPopover from "./BegriffPopover";

const INDEX = new Map(BEGRIFFE.map((b) => [b.id, b]));

export function lexikonEintrag(id) {
  const b = INDEX.get(id);
  return b ? { id: b.id, begriff: b.begriff, kurz: b.kurz, href: `/wissen/lexikon#${b.id}` } : null;
}

export default function Begriff({ id, children, nurIcon = false }) {
  const e = lexikonEintrag(id);
  if (!e) return children ?? null; // unbekannte ID: nie die Seite brechen
  return (
    <span className="inline-flex items-baseline gap-1">
      {!nurIcon && (children ?? e.begriff)}
      <BegriffPopover eintrag={e} />
    </span>
  );
}
