"use client";

import { useId, useState } from "react";

/**
 * FAQ-Akkordeon im Stil von src/components/Faqs/faqs.js
 * (gruenes +/- Badge, divide-y Trenner, aria-expanded/aria-controls).
 *
 * Die Fragen/Antworten muessen identisch auch im FAQPage-JSON-LD der Seite
 * stehen - Google verlangt, dass strukturierte Daten sichtbarem Text
 * entsprechen.
 *
 * @param {{items: {frage: string, antwort: string}[]}} props
 */
export default function FaqAccordion({ items }) {
  const [offen, setOffen] = useState(() => new Set([0]));
  const basis = useId();

  const toggle = (i) =>
    setOffen((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="divide-y divide-gray-200 border-t border-b border-gray-200">
      {items.map((item, i) => {
        const ist = offen.has(i);
        const panelId = `${basis}-panel-${i}`;
        const buttonId = `${basis}-button-${i}`;

        return (
          <div key={item.frage}>
            <h3>
              <button
                type="button"
                id={buttonId}
                onClick={() => toggle(i)}
                aria-expanded={ist}
                aria-controls={panelId}
                className="flex w-full items-center gap-4 py-5 text-left"
              >
                <span className="flex-1 text-[18px] font-medium text-gray-900">
                  {item.frage}
                </span>
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[18px] leading-none text-white transition-transform duration-200 ${
                    ist ? "rotate-180" : ""
                  }`}
                  style={{ backgroundColor: "#669933" }}
                >
                  {ist ? "−" : "+"}
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!ist}
              className="pb-5"
            >
              <p className="max-w-[70ch] text-[16px] leading-relaxed text-gray-600">
                {item.antwort}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
