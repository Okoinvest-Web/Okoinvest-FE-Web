// Produkt-Tour: drei Ansichten (Mitglied, Zustimmung, Kassier) als erzählte Kapitel mit eigenen Bühnen
import { ArrowDown } from "lucide-react";
import Button from "@/components/ui/Button";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { MockAbschluss, MockEnergieHeute, MockKassier, MockZustimmung } from "@/components/Portal/EG/Produkt/Mockups";
import { Haken } from "./teile";
import { TourBuehnenMotiv } from "./TourBuehne";

const TOUR = [
  {
    id: "mitglied",
    eyebrow: "Für Mitglieder",
    kurz: "Energie heute",
    titel: "Energie heute: Mitglieder sehen ihre Ersparnis, bevor sie fragen",
    text: "Das Dashboard zeigt den Energiefluss von den Anlagen der Region bis nach Hause, die Ersparnis aus Energiepreis, Netzentgelt und Abgabe und die grünen Stunden des Tages – mit einem Hinweis, wann sich Waschmaschine oder Wallbox lohnen.",
    punkte: ["Ersparnis getrennt nach Energie, Netz und Abgabe, als Schätzung gekennzeichnet", "Grüne Stunden aus Prognose und Messwerten – Empfehlung, keine Steuerung", "Belege, Preisblatt und eigene Daten an einem Ort"],
    bildText: "Beispielansicht Energie heute auf dem Handy, fiktive Werte: viel Gemeinschaftsstrom laut Prognose, Energiefluss von der Region über die Gemeinschaft Sonnenland nach Hause, 71,40 € Ersparnis in diesem Jahr, 38 % aus der Gemeinschaft und die grünen Stunden des Tages.",
    geraet: "Ansicht am Handy",
  },
  {
    id: "zustimmung",
    eyebrow: "Für neue Mitglieder",
    kurz: "Zustimmung",
    titel: "Damit keine Anmeldung verfällt: Countdown und Anleitung je Netzbetreiber",
    text: "Vergisst ein Mitglied die Zustimmung im Portal des Netzbetreibers, verfällt die Anmeldung nach zehn Werktagen. Unser Portal zählt die Tage herunter und erklärt jeden Klick für den jeweiligen Netzbetreiber – direkt nach dem Beitritt.",
    punkte: ["Status jeder Anmeldung Schritt für Schritt", "Fristring mit Datum, dringend ab sieben Tagen", "Anleitung je Netzbetreiber im Kontext des Zählpunkts"],
    bildText: "Beispielansicht Zustimmung beim Netzbetreiber, fiktive Werte: Fristring mit noch 6 von 10 Werktagen, als dringend markiert, Frist bis 14.10.; Anleitung in fünf Schritten, die ersten zwei erledigt (Kundenportal öffnen, Bereich Energiegemeinschaften wählen), jetzt an der Reihe: Anfrage der Gemeinschaft finden; danach Teilnahmefaktor prüfen und zustimmen.",
    geraet: "Ansicht im Mitgliederportal",
  },
  {
    id: "kassier",
    eyebrow: "Für Kassa und Vorstand",
    kurz: "Abrechnung",
    titel: "Abrechnung als geführte Routine – mit Vier-Augen-Freigabe",
    text: "Vorschau berechnen, Veränderungen zum Vormonat sehen, als Kassier und Vorstand freigeben, versenden: Jeder Schritt hat einen klaren Status, jede Zahl einen Prüfpfad bis zum Viertelstundenwert.",
    punkte: ["Status-Pipeline je Periode, Vier-Augen-Freigabe mit Bestätigung", "Vergleich zum Vorzeitraum mit auffälligen Mitgliedern", "SEPA-Lastschrift und -Überweisung, Mahnwesen, Exporte für die Steuerberatung"],
    bildText: "Beispielansicht der Abrechnung Oktober, fiktive Werte: Status-Pipeline bei Schritt 5 von 6 (Versendet), 58 Rechnungen und 14 Gutschriften, drei auffällige Veränderungen zum September, geprüft vom Kassier und freigegeben vom Vorstand; Abschlussmeldung: 72 Belege versendet, Lastschrift am 05.11.",
    geraet: "Ansicht für die Kassa",
  },
];

/** Farbwelt je Kapitel: Bühne, Nummer, Knoten auf der Zeitleiste */
const WELT = {
  mitglied: {
    buehne: "bg-[radial-gradient(120%_90%_at_50%_0%,var(--color-ov-100),var(--color-sand-50)_62%)] ring-ov-200/70",
    knoten: "bg-ov-600 text-white shadow-gruen",
    nummer: "text-ov-600",
  },
  zustimmung: {
    buehne: "bg-[radial-gradient(120%_90%_at_50%_0%,var(--color-sun-100),var(--color-sand-50)_62%)] ring-sun-200/80",
    knoten: "bg-sun-400 text-navy-950 shadow-[0_8px_24px_-8px_rgba(245,167,15,0.6)]",
    nummer: "text-sun-600",
  },
  kassier: {
    buehne: "bg-[radial-gradient(120%_90%_at_50%_0%,var(--color-navy-100),var(--color-sand-50)_62%)] ring-navy-200/70",
    knoten: "bg-navy-700 text-white shadow-navy",
    nummer: "text-navy-600",
  },
};

const nr = (i) => String(i + 1).padStart(2, "0");

/** Tour-Mockup je Ansicht – als Abbildung mit sichtbarer Kennzeichnung „fiktive Werte“ */
function TourBild({ t }) {
  if (t.id === "mitglied") {
    return <MockEnergieHeute beschreibung={t.bildText} className="relative mx-auto w-full max-w-[290px]" />;
  }
  if (t.id === "zustimmung") {
    return <MockZustimmung beschreibung={t.bildText} className="relative mx-auto w-full max-w-[460px]" />;
  }
  return (
    <div role="img" aria-label={t.bildText} className="relative mx-auto w-full max-w-[540px] sm:pb-12">
      <div aria-hidden="true">
        <MockKassier />
        {/* Mobil im Fluss; ab sm unter dem Fenster schwebend, ohne dessen Versand-Knopf zu verdecken */}
        <Reveal dir="up" delay={450} className="relative z-10 -mt-2 ml-auto w-[88%] max-w-[290px] sm:absolute sm:-bottom-3 sm:-right-5 sm:mt-0 sm:w-[62%]">
          <MockAbschluss />
        </Reveal>
      </div>
    </div>
  );
}

/** Inhaltsverzeichnis der Tour: drei Sprungmarken, gleichzeitig Vorschau auf die Erzählung */
function Kapitelwahl() {
  return (
    <Reveal as="nav" aria-label="Kapitel der Produkt-Tour" className="mb-16 md:mb-24">
      <ol className="grid gap-2 sm:grid-cols-3 sm:gap-3">
        {TOUR.map((t, i) => (
          <li key={t.id}>
            <a
              href={`#produkt-${t.id}`}
              className="ov-press group flex h-full items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-ink-200 transition-colors hover:bg-sand-50 hover:ring-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-600 focus-visible:ring-offset-2"
            >
              <span aria-hidden="true" className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[13px] font-extrabold", WELT[t.id].knoten)}>{nr(i)}</span>
              <span className="min-w-0 flex-1">
                <span className="hidden text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-500 max-sm:block lg:block">{t.eyebrow}</span>
                <span className="block font-display text-[16px] font-bold text-ink-900">{t.kurz}</span>
              </span>
              <ArrowDown aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-y-0.5 group-hover:text-ink-700" />
              <span className="sr-only">, Kapitel {i + 1} von {TOUR.length}</span>
            </a>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}

function Kapitel({ t, i }) {
  const rechts = i % 2 === 1; // Text rechts, Bild links
  const welt = WELT[t.id];
  return (
    <article id={`produkt-${t.id}`} aria-labelledby={`produkt-${t.id}-titel`} className="relative grid scroll-mt-28 items-center gap-8 md:gap-10 lg:grid-cols-2 lg:gap-24">
      {/* Knoten auf der Zeitleiste (nur ab lg, dekorativ) */}
      <span aria-hidden="true" className={cn("absolute left-1/2 top-1/2 z-10 hidden h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[6px] ring-white lg:block", welt.knoten)} />

      <Reveal dir={rechts ? "left" : "right"} className={cn("max-w-xl", rechts && "lg:order-2 lg:justify-self-end")}>
        <div className="flex items-end gap-4">
          <span aria-hidden="true" className={cn("ov-kpi-xl select-none leading-[0.8]", welt.nummer)}>{nr(i)}</span>
          <p className="pb-1 text-[12.5px] font-semibold uppercase leading-snug tracking-[0.14em] text-ink-500">
            <span className="sr-only">Kapitel {i + 1} von {TOUR.length}: </span>
            <span aria-hidden="true" className="block text-ink-400">Kapitel {i + 1} / {TOUR.length}</span>
            <span className="block text-ink-800">{t.eyebrow}</span>
          </p>
        </div>
        <h3 id={`produkt-${t.id}-titel`} className="ov-h3 mt-6 text-balance text-ink-900 md:text-[1.75rem] md:leading-[1.2]">{t.titel}</h3>
        <p className="ov-text mt-4 text-ink-600">{t.text}</p>
        <ul className="mt-7 divide-y divide-ink-100 border-y border-ink-100">
          {t.punkte.map((x) => (
            <li key={x} className="ov-klein flex gap-3 py-3 text-ink-700"><Haken />{x}</li>
          ))}
        </ul>
      </Reveal>

      <Reveal dir="scale" className={cn("min-w-0", rechts && "lg:order-1")}>
        <figure>
          <div
            className={cn(
              "relative isolate -mx-5 flex min-h-[400px] items-center justify-center overflow-hidden px-3 py-10 ring-1 sm:mx-0 sm:rounded-[2rem] sm:px-8 md:min-h-[520px] md:p-12",
              welt.buehne
            )}
          >
            <TourBuehnenMotiv art={t.id} />
            <TourBild t={t} />
          </div>
          <figcaption className="mt-3 flex flex-col items-center justify-center gap-x-2 gap-y-0.5 text-center text-[12.5px] text-ink-500 sm:flex-row">
            <span className="font-semibold text-ink-700">{t.geraet}</span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span>Beispielansicht mit fiktiven Werten</span>
          </figcaption>
        </figure>
      </Reveal>
    </article>
  );
}

export default function Tour() {
  return (
    <Section data-abschnitt="tour" tone="white" space="lg" id="produkt" className="scroll-mt-24 overflow-hidden">
      <SectionHeading eyebrow="Das Produkt" title="Drei Ansichten, ein Gedanke: niemand muss nachfragen" lead="So sieht die Plattform für Mitglieder, für die Zustimmung beim Netzbetreiber und für die Kassa aus. Alle Werte in den Ansichten sind Beispiele." className="mb-10 md:mb-12" />
      <Kapitelwahl />

      <div className="relative space-y-16 md:space-y-24 lg:space-y-24">
        {/* Zeitleiste zwischen den Kapiteln (dekorativ, ab lg) */}
        <span aria-hidden="true" className="absolute inset-y-[12%] left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-ov-200 via-sun-200 to-navy-200 lg:block" />
        {TOUR.map((t, i) => <Kapitel key={t.id} t={t} i={i} />)}
      </div>

      <Reveal className="mt-16 md:mt-24">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-sand-50 px-6 py-8 ring-1 ring-sand-200 md:px-12 md:py-10">
          <div aria-hidden="true" className="ov-grid-bg-light absolute inset-0 -z-10 opacity-70" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="font-display text-[1.25rem] font-bold leading-snug text-ink-900 md:text-[1.4rem]">Möchten Sie die Ansichten mit Ihren eigenen Zahlen sehen?</p>
              <p className="ov-klein mt-2 text-ink-600">Mitglied, Zustimmung und Abrechnung – in einer Vorführung für Ihre Gemeinschaft.</p>
            </div>
            {/* Kein Verweis auf „Kassa & Vorstand“: Der Abschnitt folgt unmittelbar. */}
            <Button href="#anfrage" pfeil className="self-start lg:self-auto">Vorführung anfragen</Button>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
