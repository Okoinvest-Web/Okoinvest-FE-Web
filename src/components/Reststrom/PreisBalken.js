import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";
import s from "./reststrom.module.css";

/**
 * Gestapelte Preisbalken (ct/kWh) – beeinflussbare vs. feste Bestandteile.
 * Ohne Hooks: nutzbar in Server- und Client-Komponenten.
 *
 * zeilen: [{ titel, teile: [{ id, label, ct, beeinflussbar }], hervorheben? }]
 * max:    Skalenende in ct/kWh (Standard: größte Zeilensumme)
 * ersparnis: true → Lücke bis zum Skalenende als schraffierte „Ersparnis“ mit Wert zeigen
 */
export const FARBEN = {
  beschaffung: "bg-ov-500",
  netz: "bg-navy-700",
  umlagen: "bg-navy-400",
  konzession: "bg-navy-200",
  stromsteuer: "bg-ink-400",
};

export default function PreisBalken({ zeilen = [], max, legende = true, dunkel = false, ersparnis = false, className }) {
  // Einlauf: Balken wird beim Eintritt von links freigelegt (nur auf hellem Grund, siehe reststrom.module.css)
  const summe = (z) => z.teile.reduce((s, t) => s + t.ct, 0);
  const skala = max || Math.max(...zeilen.map(summe), 1);
  const alleTeile = zeilen[0]?.teile || [];

  return (
    <div className={cn("space-y-5", className)}>
      {zeilen.map((z) => {
        const gesamt = summe(z);
        return (
          <figure key={z.titel} className="min-w-0">
            <figcaption className="mb-2 flex items-baseline justify-between gap-3 text-[14px]">
              <span className={cn("font-semibold", dunkel ? "text-white" : "text-ink-800")}>{z.titel}</span>
              <span className={cn("ov-num shrink-0 font-display text-[18px] font-extrabold", dunkel ? "text-white" : "text-ink-900")}>
                {fmt(gesamt, 2)} <span className={cn("text-[13px] font-semibold", dunkel ? "text-white/60" : "text-ink-500")}>ct/kWh</span>
              </span>
            </figcaption>
            <div
              className={cn("flex h-12 w-full overflow-hidden rounded-xl", dunkel ? "bg-white/10" : cn("bg-ink-100", s.vorhang))}
              role="img"
              aria-label={`${z.titel}: ${z.teile.map((t) => `${t.label} ${fmt(t.ct, 2)} ct`).join(", ")}; gesamt ${fmt(gesamt, 2)} ct/kWh`}
            >
              {z.teile.map((t) => {
                const breite = (t.ct / skala) * 100;
                if (breite <= 0) return null;
                return (
                  <div
                    key={t.id}
                    className={cn(
                      "relative flex h-full items-center justify-center overflow-hidden border-r-2 transition-[width] duration-500 last:border-r-0",
                      dunkel ? "border-navy-950" : "border-white",
                      FARBEN[t.id] || "bg-ink-300"
                    )}
                    style={{ width: `${breite}%` }}
                    title={`${t.label}: ${fmt(t.ct, 2)} ct/kWh`}
                  >
                    {breite > 9 && (
                      <span className={cn("ov-num whitespace-nowrap px-1 text-[12.5px] font-semibold", t.id === "konzession" ? "text-navy-900" : "text-white")}>
                        {fmt(t.ct, 1)}
                      </span>
                    )}
                  </div>
                );
              })}
              {ersparnis && skala - gesamt > 0.05 && (
                <div
                  className="flex h-full items-center justify-center overflow-hidden bg-[repeating-linear-gradient(135deg,#fff3d1_0_6px,#ffe8a8_6px_12px)] ring-1 ring-inset ring-sun-300"
                  style={{ width: `${((skala - gesamt) / skala) * 100}%` }}
                >
                  {(skala - gesamt) / skala > 0.07 && (
                    <span className="ov-num whitespace-nowrap px-1 text-[12.5px] font-bold text-sun-700">−{fmt(skala - gesamt, 1)}</span>
                  )}
                </div>
              )}
            </div>
          </figure>
        );
      })}

      {legende && (
        <ul className={cn("flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[13px]", dunkel ? "text-white/70" : "text-ink-600")}>
          {alleTeile.map((t) => (
            <li key={t.id} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={cn("h-3 w-3 rounded-[4px]", FARBEN[t.id] || "bg-ink-300")} />
              {t.label.replace(" (Pool)", "")}
              {t.beeinflussbar ? (
                <span className="rounded-full bg-ov-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ov-800">beeinflussbar</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
