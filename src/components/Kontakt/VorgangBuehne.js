// Bühne im Kopf von /kontakt: So sieht eine Anfrage als Vorgang im Portal aus.
// Beispielansicht – Statusstufen wie im Projektprozess, keine echten Daten.
import { Check, Clock, MessageSquare, UserRound } from "lucide-react";
import { KONTAKT } from "@/data/site";
import { cn } from "@/components/ui/cn";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";

/** Bürozeiten je Sprache (Tage abgekürzt) */
export const TAGE_EN = { "Mo – Do": "Mon – Thu", Fr: "Fri" };

const STUFEN = [
  { label: "Eingegangen", stand: "fertig" },
  { label: "In Prüfung", stand: "aktiv" },
  { label: "Rückmeldung", stand: "offen" },
];

const TEXTE = {
  de: {
    stufen: STUFEN,
    fenster: "Portal · Meine Vorgänge",
    beispiel: "Beispiel",
    anfrage: "Anfrage · Fläche verpachten",
    angelegt: "Ihr Vorgang ist angelegt",
    stufenAria: "Statusstufen (Beispiel)",
    ansprechpartner: "Ansprechpartner",
    fest: "Fest zugeordnet",
    antwort: "Antwort",
    persoenlich: "persönlich durch unser Team",
    nachricht: "Danke für Ihre Anfrage. Wir prüfen zuerst Netzentfernung, Schutzgebiete und Planungsrecht.",
    buerozeiten: "Bürozeiten",
    bild: "Beispielansicht eines Vorgangs im Portal",
  },
  en: {
    stufen: [{ label: "Received" }, { label: "Under review" }, { label: "Response" }],
    fenster: "Portal · My cases",
    beispiel: "Example",
    anfrage: "Enquiry · lease your land",
    angelegt: "Your case has been created",
    stufenAria: "Status stages (example)",
    ansprechpartner: "Contact person",
    fest: "Permanently assigned",
    antwort: "Response",
    persoenlich: "personally from our team",
    nachricht: "Thank you for your enquiry. We will first check the distance to the grid, protected areas and planning law.",
    buerozeiten: "Office hours",
    bild: "Example view of a case in the portal",
  },
};

export default function VorgangBuehne({ hell = false }) {
  const en = spracheDerAnfrage() === "en";
  const t = uebersetze(TEXTE, en ? "en" : "de");
  return (
    <figure className="relative mx-auto max-w-[560px] lg:ml-auto lg:mr-0">
      <div className="relative">
      <div className="relative overflow-hidden rounded-[1.75rem] bg-white text-ink-900 shadow-e5 ring-1 ring-white/20">
        {/* Fensterleiste */}
        <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/70 px-5 py-3">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
          </span>
          <span className="text-[12px] font-medium text-ink-500">{t.fenster}</span>
          <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-sun-700">{t.beispiel}</span>
        </div>

        <div className="p-5 sm:p-7">
          <p className="text-[12.5px] font-medium text-ink-500">{t.anfrage}</p>
          <p className="mt-1 font-display text-[20px] font-bold leading-tight tracking-tight">{t.angelegt}</p>

          {/* Statusstufen */}
          <ol className="mt-6 grid grid-cols-3 gap-2" aria-label={t.stufenAria}>
            {t.stufen.map((s, i) => (
              <li key={s.label} className="relative">
                <span
                  className={cn(
                    "block h-1.5 rounded-full",
                    s.stand === "fertig" ? "bg-ov-500" : s.stand === "aktiv" ? "bg-gradient-to-r from-ov-500 to-ov-200" : "bg-ink-100"
                  )}
                />
                <span className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold sm:text-[12.5px]">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "hidden h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:flex",
                      s.stand === "fertig" ? "bg-ov-500 text-white" : s.stand === "aktiv" ? "bg-white text-ov-700 ring-2 ring-ov-500" : "bg-ink-100 text-ink-500"
                    )}
                  >
                    {s.stand === "fertig" ? <Check className="h-2.5 w-2.5" strokeWidth={3.5} /> : i + 1}
                  </span>
                  <span className={s.stand === "offen" ? "text-ink-500" : "text-ink-900"}>{s.label}</span>
                </span>
              </li>
            ))}
          </ol>

          <dl className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
              <UserRound aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              <div>
                <dt className="text-[12px] text-ink-500">{t.ansprechpartner}</dt>
                <dd className="text-[13.5px] font-semibold leading-snug">{t.fest}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-sand-50 p-3.5 ring-1 ring-ink-200/60">
              <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />
              <div>
                <dt className="text-[12px] text-ink-500">{t.antwort}</dt>
                <dd className="text-[13.5px] font-semibold leading-snug">{t.persoenlich}</dd>
              </div>
            </div>
          </dl>

          {/* Nachricht */}
          <div className="mt-5 flex items-start gap-3">
            <span aria-hidden="true" className="ov-verlauf-nacht flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ov-300">
              <MessageSquare className="h-4 w-4" />
            </span>
            <p className="rounded-2xl rounded-tl-md bg-ov-50 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-ov-100">
              {t.nachricht}
            </p>
          </div>
        </div>
      </div>

      {/* Bürozeiten – ab sm schwebend */}
      <div className="relative mt-3 rounded-2xl bg-navy-950/90 p-4 text-white shadow-e4 ring-1 ring-white/15 backdrop-blur-md sm:absolute sm:-bottom-12 sm:-left-8 sm:mt-0 sm:w-60">
        <p className="ov-overline text-ov-300">{t.buerozeiten}</p>
        <dl className="mt-2 space-y-1 text-[13px]">
          {KONTAKT.oeffnungszeiten.map((o) => (
            <div key={o.tage} className="flex justify-between gap-4">
              <dt className="text-white/70">{en ? TAGE_EN[o.tage] ?? o.tage : o.tage}</dt>
              <dd className="ov-num font-semibold">{o.zeit}</dd>
            </div>
          ))}
        </dl>
      </div>
      </div>
      <figcaption className={cn("mt-4 text-center text-[12px] sm:mt-5 sm:pl-56 sm:text-right", hell ? "text-ink-500" : "text-white/60")}>{t.bild}</figcaption>
    </figure>
  );
}
