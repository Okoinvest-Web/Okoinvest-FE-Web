// Preisblatt der EG-Software Österreich (Welle 3, Paket B7) – Server-Komponente.
// Struktur aus src/lib/eg-angebot/preisblatt.js: je Paket Einrichtung (einmalig), Grundgebühr je Gemeinschaft
// und Betrag je Zählpunkt (monatlich). Ohne Freigabe des Inhabers steht überall „Preis auf Anfrage“.
// Optik wie der Pakete-Abschnitt von /energiegemeinschaften/software (Karten, mittlere hervorgehoben).
import { Building2, ClipboardList, Sparkles, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { Haken } from "@/components/Portal/EG/Produkt/Seite/teile";
import { FREIGABE, preisblatt } from "@/lib/eg-angebot/preisblatt";
import { formate } from "@/lib/sprache/zahlformat";

const ICON = { software: ClipboardList, betrieb: Users, gruendung: Building2 };

export const PREIS_TEXTE = {
  de: {
    pakete: {
      software: { titel: "Software", tag: "Selbstverwaltet", fuer: "Für Vorstände, die selbst abrechnen", punkte: ["Mitgliederportal und Beitritt online", "EDA-Prozesse und Energiedaten", "Abrechnung mit Vier-Augen-Freigabe", "Export für die Steuerberatung"] },
      betrieb: { titel: "Betriebsführung", tag: "ÖkoInvest als Organisator", fuer: "Für Gemeinschaften, deren Ehrenamt entlastet werden soll", punkte: ["Alles aus dem Paket Software", "Organisator nach § 68 Abs. 2 ElWG", "Kommunikation mit dem Netzbetreiber", "Ansprechpartner für Mitglieder"], hervorgehoben: "Größte Entlastung" },
      gruendung: { titel: "Gründung", tag: "Einmalig, von der Idee bis zum ersten Strom", fuer: "Für Gemeinden, Vereine und Initiativen am Anfang", punkte: ["Netzgebiets- und Nahebereichs-Check", "Statuten und Verträge aus Mustern", "Vertrag mit dem Netzbetreiber, EDA-Zugang", "Startkampagne für Mitglieder"] },
    },
    posten: {
      einrichtung: ["Einrichtung", "einmalig je Gemeinschaft"],
      grundgebuehr: ["Grundgebühr", "je Gemeinschaft und Monat"],
      zaehlpunkt: ["Je Zählpunkt", "je Zählpunkt und Monat"],
    },
    postenGruendung: { einrichtung: ["Gründung", "Pauschale je Vorhaben"] },
    anfrage: "Preis auf Anfrage",
    entfaellt: "entfällt",
    danach: "Laufender Betrieb danach über Software oder Betriebsführung",
    netto: "netto",
    brutto: (b) => `${b} brutto`,
    enthalten: "Enthalten",
    anfragen: (t) => `${t}: Preis anfragen`,
  },
  en: {
    pakete: {
      software: { titel: "Software", tag: "Self-managed", fuer: "For boards that do their own billing", punkte: ["Member portal and online joining", "EDA processes and energy data", "Billing with four-eyes approval", "Export for the tax adviser"] },
      betrieb: { titel: "Operational management", tag: "ÖkoInvest as organiser", fuer: "For communities whose volunteers need relief", punkte: ["Everything in the Software package", "Organiser under § 68(2) ElWG", "Communication with the grid operator", "Contact person for members"], hervorgehoben: "Greatest relief" },
      gruendung: { titel: "Founding", tag: "One-off, from the idea to the first power", fuer: "For municipalities, associations and initiatives at the start", punkte: ["Grid area and proximity area check", "Articles and contracts from templates", "Contract with the grid operator, EDA access", "Launch campaign for members"] },
    },
    posten: {
      einrichtung: ["Set-up", "one-off per community"],
      grundgebuehr: ["Base fee", "per community and month"],
      zaehlpunkt: ["Per metering point", "per metering point and month"],
    },
    postenGruendung: { einrichtung: ["Founding", "flat fee per project"] },
    anfrage: "Price on request",
    entfaellt: "not applicable",
    danach: "Ongoing operation afterwards via Software or Operational management",
    netto: "net",
    brutto: (b) => `${b} gross`,
    enthalten: "Included",
    anfragen: (t) => `${t}: request price`,
  },
};

export default function Preisblatt({ en = false }) {
  const t = PREIS_TEXTE[en ? "en" : "de"];
  const f = formate(en ? "en" : "de");
  const euro = (x) => (en ? `€${f.fmt(x, 2)}` : `${f.fmt(x, 2)} €`);
  const tabelle = preisblatt();
  return (
    <ul role="list" className="grid gap-6 lg:grid-cols-3 lg:gap-5">
      {tabelle.map(({ paket, posten }, i) => {
        const p = t.pakete[paket];
        const Icon = ICON[paket];
        const dunkel = Boolean(p.hervorgehoben);
        return (
          <Reveal as="li" key={paket} id={`preis-${paket}`} delay={i * 90} aria-labelledby={`preis-${paket}-titel`} className="scroll-mt-28">
            <article className={cn("ov-lift relative flex h-full flex-col rounded-[2rem] p-6 sm:p-8", dunkel ? "ov-verlauf-nacht text-white shadow-e3 ring-2 ring-ov-500/60" : "bg-white shadow-e1 ring-1 ring-ink-200/70")}>
              {p.hervorgehoben && (
                <span className="absolute -top-3.5 left-6 inline-flex items-center gap-1.5 rounded-full bg-sun-400 px-3 py-1 text-[12px] font-bold uppercase tracking-[0.1em] text-navy-950 shadow-e2 sm:left-8">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                  {p.hervorgehoben}
                </span>
              )}
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", dunkel ? "bg-ov-500 text-white" : "bg-ov-50 text-ov-600 ring-1 ring-ov-100")}>
                  <Icon className="h-6 w-6" />
                </span>
                <span className={cn("text-[11.5px] font-semibold uppercase leading-tight tracking-[0.14em]", dunkel ? "text-ov-300" : "text-ov-700")}>{p.tag}</span>
              </div>
              <h3 id={`preis-${paket}-titel`} className={cn("ov-h3 mt-5", dunkel ? "text-white" : "text-ink-900")}>{p.titel}</h3>
              <p className={cn("mt-1.5 text-[15px] font-medium leading-snug", dunkel ? "text-white/85" : "text-ink-700")}>{p.fuer}</p>

              {/* Preisposten */}
              <dl className={cn("mt-6 divide-y rounded-2xl px-4", dunkel ? "divide-white/10 bg-white/[0.06] ring-1 ring-white/10" : "divide-ink-100 bg-sand-50 ring-1 ring-ink-200/60")}>
                {posten.map((x) => {
                  const [name, einheit] = (paket === "gruendung" && t.postenGruendung[x.id]) || t.posten[x.id];
                  return (
                    <div key={x.id} className="flex items-baseline justify-between gap-4 py-3">
                      <dt className="min-w-0">
                        <span className={cn("block text-[14.5px] font-semibold", dunkel ? "text-white" : "text-ink-900")}>{name}</span>
                        <span className={cn("block text-[12.5px]", dunkel ? "text-white/60" : "text-ink-500")}>{einheit}</span>
                      </dt>
                      <dd className={cn("shrink-0 text-right text-[14.5px] font-semibold", x.status === "entfaellt" ? (dunkel ? "text-white/50" : "text-ink-400") : dunkel ? "text-white" : "text-ink-900")} data-preis-status={x.status}>
                        {x.status === "betrag" ? (
                          <>
                            <span className="ov-num block">{euro(x.netto)} {t.netto}</span>
                            <span className={cn("ov-num block text-[12px] font-medium", dunkel ? "text-white/60" : "text-ink-500")}>{t.brutto(euro(x.brutto))}</span>
                          </>
                        ) : x.status === "entfaellt" ? (
                          t.entfaellt
                        ) : (
                          t.anfrage
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {paket === "gruendung" && <p className={cn("mt-3 text-[13px] leading-snug", dunkel ? "text-white/65" : "text-ink-500")}>{t.danach}</p>}

              <div className={cn("mt-6 border-t pt-5", dunkel ? "border-white/10" : "border-ink-100")}>
                <p className={cn("text-[12px] font-semibold uppercase tracking-[0.14em]", dunkel ? "text-white/60" : "text-ink-500")}>{t.enthalten}</p>
                <ul role="list" className="mt-3 space-y-2.5">
                  {p.punkte.map((x) => (
                    <li key={x} className={cn("flex gap-2.5 text-[14.5px] leading-snug", dunkel ? "text-white/90" : "text-ink-800")}>
                      <Haken dunkel={dunkel} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-auto pt-6">
                <Button href="#anfrage" variant={dunkel ? "primary" : "secondary"} block pfeil>
                  {t.anfragen(p.titel)}
                </Button>
              </div>
            </article>
          </Reveal>
        );
      })}
    </ul>
  );
}

/** Vermerk zur Freigabe der Beträge (öffentlich, ehrlich). */
export function FreigabeVermerk({ en = false }) {
  if (FREIGABE.freigegeben) return null;
  return en
    ? "Amounts not yet published: the release is pending. Until then, we will tell you the price for your community on request – in writing and broken down in the same way."
    : "Beträge noch nicht veröffentlicht: Die Freigabe steht aus. Bis dahin nennen wir Ihnen den Preis für Ihre Gemeinschaft auf Anfrage – schriftlich und genauso aufgeschlüsselt.";
}
