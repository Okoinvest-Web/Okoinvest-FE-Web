import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";

import { cn } from "@/components/ui/cn";
import Faq from "@/components/ui/Faq";
import InlineText, { klartext } from "./InlineText";
import { Ablauf, Abschnitt, Checkliste, KartenRaster, Kennzahlband, KurzFazit, LinkKarten, Merkkasten, Prosa, Tabelle, Zwischentitel } from "./Bausteine";

/**
 * Rendert einen inhaltsgetriebenen Ratgeber-Artikel (src/content/ratgeber/*).
 * Blocktypen siehe src/content/ratgeber/README.md.
 */
export default function ArtikelInhalt({ artikel }) {
  return (
    <>
      {artikel.kurzFazit?.length > 0 && <KurzFazit punkte={artikel.kurzFazit.map((p, i) => <InlineText key={i} text={p} />)} />}

      {artikel.abschnitte.map((a) => (
        <Abschnitt key={a.id} id={a.id} titel={a.titel}>
          {a.bloecke.map((b, i) => (
            <Block key={i} block={b} />
          ))}
        </Abschnitt>
      ))}

      {artikel.faq?.length > 0 && (
        <Abschnitt id="faq" titel={artikel.faqTitel || "Häufige Fragen"}>
          <Faq items={artikel.faq.map((f) => ({ q: f.q, a: <InlineText text={f.a} />, aText: klartext(f.a) }))} />
        </Abschnitt>
      )}

      {artikel.passend?.length > 0 && (
        <Abschnitt id="passend" titel="Passend dazu">
          <LinkKarten links={artikel.passend} />
        </Abschnitt>
      )}

      {artikel.quellen?.length > 0 && (
        <Abschnitt id="quellen" titel="Quellen">
          <ol className="list-decimal space-y-2 pl-5 text-[14.5px] leading-relaxed text-ink-600 marker:text-ink-500">
            {artikel.quellen.map((q) => (
              <li key={q.url}>
                <a href={q.url} target="_blank" rel="noopener noreferrer" className="text-ink-700 underline decoration-ink-300 underline-offset-2 hover:text-ov-700">
                  {q.titel}
                </a>
                {q.stand && <span className="text-ink-500"> · abgerufen {q.stand}</span>}
              </li>
            ))}
          </ol>
        </Abschnitt>
      )}
    </>
  );
}

function Block({ block: b }) {
  switch (b.typ) {
    case "p":
      return (
        <Prosa className="mt-4 first:mt-0">
          <p>
            <InlineText text={b.text} />
          </p>
        </Prosa>
      );
    case "h3":
      return <Zwischentitel>{b.text}</Zwischentitel>;
    case "liste": {
      const Tag = b.nummeriert ? "ol" : "ul";
      return (
        <Prosa className="mt-4">
          <Tag>
            {b.punkte.map((p, i) => (
              <li key={i}>
                <InlineText text={p} />
              </li>
            ))}
          </Tag>
        </Prosa>
      );
    }
    case "checkliste":
      return <Checkliste punkte={b.punkte.map((p, i) => <InlineText key={i} text={p} />)} />;
    case "tabelle":
      return (
        <Tabelle
          caption={b.caption}
          kopf={b.kopf}
          zeilen={b.zeilen.map((z) => z.map((zelle, j) => <InlineText key={j} text={zelle} />))}
          hervorheben={b.hervorheben}
          markierteZeile={b.markierteZeile}
          fussnote={b.fussnote}
          minBreite={b.minBreite}
        />
      );
    case "kasten":
      return (
        <Merkkasten variant={b.variant} titel={b.titel}>
          <InlineText text={b.text} />
        </Merkkasten>
      );
    case "kennzahl":
      return <Kennzahlband wert={b.wert} titel={b.titel} text={klartext(b.text)} />;
    case "karten":
      return <KartenRaster cols={b.cols} items={b.items.map((it) => ({ titel: it.titel, text: <InlineText text={it.text} /> }))} />;
    case "ablauf":
      return <Ablauf schritte={b.schritte.map(([t, x]) => [t, <InlineText key={t} text={x} />])} />;
    case "tool":
      return (
        <Link
          href={b.href}
          className="group my-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-ov-500 to-ov-700 p-6 text-white shadow-[0_24px_48px_-24px_rgba(67,102,33,0.7)] sm:flex-row sm:items-center sm:justify-between md:p-7"
        >
          <span className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Calculator aria-hidden="true" className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-display text-[19px] font-extrabold leading-snug">{b.titel}</span>
              <span className="mt-1 block text-[15px] leading-relaxed text-white/85">{b.text}</span>
            </span>
          </span>
          <span className={cn("inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-white px-5 text-[14.5px] font-semibold text-ov-800 sm:self-auto")}>
            {b.label || "Jetzt berechnen"}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      );
    default:
      return null;
  }
}

/** Wörter eines Artikels zählen (für Lesezeit). */
export function woerter(artikel) {
  const texte = [];
  const sammle = (x) => {
    if (typeof x === "string") texte.push(klartext(x));
    else if (Array.isArray(x)) x.forEach(sammle);
    else if (x && typeof x === "object") Object.values(x).forEach(sammle);
  };
  sammle(artikel.kurzFazit);
  sammle(artikel.abschnitte);
  sammle(artikel.faq);
  return texte.join(" ").split(/\s+/).filter(Boolean).length;
}
