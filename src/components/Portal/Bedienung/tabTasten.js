// Tastaturmuster für ARIA-Tablisten (Paket UIUX, Plattform-Armee):
// Pfeil links/rechts wechselt den Reiter, Pos1/Ende springt an Anfang/Ende (WAI-ARIA APG „Tabs“).
// Nutzung: <div role="tablist" onKeyDown={tabTasten} …> mit <button role="tab">-Kindern.
// Die Knöpfe bleiben bewusst alle in der Tab-Reihenfolge (kein Roving-Tabindex nötig);
// der Helfer ergänzt nur die erwartete Pfeiltasten-Bedienung und aktiviert den Ziel-Reiter.

export function tabTasten(e) {
  const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')).filter((t) => !t.disabled);
  const i = tabs.indexOf(document.activeElement);
  if (i < 0 || tabs.length < 2) return;
  let ziel = null;
  if (e.key === "ArrowRight") ziel = tabs[(i + 1) % tabs.length];
  else if (e.key === "ArrowLeft") ziel = tabs[(i - 1 + tabs.length) % tabs.length];
  else if (e.key === "Home") ziel = tabs[0];
  else if (e.key === "End") ziel = tabs[tabs.length - 1];
  if (ziel) {
    e.preventDefault();
    ziel.focus();
    ziel.click();
  }
}
