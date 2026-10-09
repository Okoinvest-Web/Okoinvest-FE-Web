// „Was wir anbieten“ – Bento-Raster nach Einstiegszeitpunkt
import Link from "@/components/Land/Link";
import { ArrowUpRight, BatteryCharging, Building2, FileSignature, Handshake, Layers, Users } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SectionHeading from "@/components/ui/SectionHeading";
import { cn } from "@/components/ui/cn";
import { PHASEN } from "@/lib/invest/markt";
import { landCode, landHinweisText, landHinweisTextEn, pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { fmtZahl } from "@/lib/sprache/format";
import { BEGRIFFE_EN } from "@/lib/sprache/begriffe";

const TEXTE = {
  de: {
    eyebrow: "Was wir anbieten",
    titel: "Vom ersten Pachtvertrag bis zur laufenden Anlage.",
    lead: "Sie entscheiden, wie viel Entwicklungsrisiko Sie tragen wollen. Je früher der Einstieg, desto günstiger der Preis je kWp\u00a0– und desto wichtiger ein Partner, der das Projekt bis zum Netz bringt.",
    rechteEtikett: "Einstieg früh · mehr Auswahl",
    rechteTitel: "Projektrechte in jeder Phase",
    rechteText: "Von gesicherter Fläche über Netzzusage und Aufstellungsbeschluss bis zum Satzungsbeschluss\u00a0– mit transparentem Stand und offenen Punkten.",
    spannen: "Marktspannen je kWp für Projektrechte, Details im Phasenmodell unten.",
    gilt: " (gilt für Deutschland)",
    frueher: "Je früher die Phase, desto niedriger der Preis je kWp.",
    thema: "Marktspannen je kWp",
    rtbEtikett: "Einstieg baureif",
    rtbTitel: "Baureife Projekte (RTB)",
    rtbText: "Baurecht, Netzanschluss, Flächen und Gutachten liegen vor. Auf Wunsch mit EPC aus der Gruppe\u00a0– eigene Rammtechnik inklusive.",
    rtbListe: ["Baurecht liegt vor", "Netzanschluss liegt vor", "Flächen liegt vor", "Gutachten liegt vor"],
    bestandEtikett: "Einstieg im Betrieb",
    bestandTitel: "Bestandsanlagen & Secondary",
    bestandText: "Laufende Solarparks mit Ertragshistorie, Förderung oder PPA\u00a0– für Investoren, die Cashflow statt Entwicklungsrisiko suchen.",
    coEtikett: "Früh, mit Vorkaufsrecht",
    coTitel: "Co-Development",
    coText: "Früh einsteigen, Entwicklung mitfinanzieren, Vorkaufsrecht bei Baureife sichern\u00a0– mit Meilensteinzahlungen und klarer Governance.",
    wege: [
      { titel: "Speicher & Co-Location", text: "Batteriespeicher am selben Netzanschluss wie der Solarpark oder als eigenständiges Projekt an Netzknoten." },
      { titel: "Beteiligung für Bürger", text: "Kleinere Beträge? Über die Genossenschaft beteiligen sich Bürger und Landwirte an Parks vor Ort." },
    ],
  },
  en: {
    eyebrow: "What we offer",
    titel: "From the first lease agreement to the operating plant.",
    lead: "You decide how much development risk you want to take on. The earlier you enter, the lower the price per kWp\u00a0– and the more important a partner who brings the project all the way to the grid.",
    rechteEtikett: "Early entry · wider choice",
    rechteTitel: "Project rights at every stage",
    rechteText: "From secured land via grid commitment and zoning resolution to the adopted development plan\u00a0– with a transparent status and open points.",
    spannen: "Market ranges per kWp for project rights, details in the stage model below.",
    gilt: " (applies to Germany)",
    frueher: "The earlier the stage, the lower the price per kWp.",
    thema: "Market ranges per kWp",
    rtbEtikett: "Ready-to-build entry",
    rtbTitel: "Ready-to-build projects (RTB)",
    rtbText: "Building rights, grid connection, land and expert reports are in place. On request with EPC from the group\u00a0– including our own pile-driving equipment.",
    rtbListe: ["Building rights in place", "Grid connection in place", "Land in place", "Expert reports in place"],
    bestandEtikett: "Entry in operation",
    bestandTitel: "Operating assets & secondary",
    bestandText: "Operating solar parks with a yield history, subsidy or PPA\u00a0– for investors who are looking for cash flow rather than development risk.",
    coEtikett: "Early, with right of first refusal",
    coTitel: "Co-development",
    coText: "Enter early, co-finance development, secure a right of first refusal at ready-to-build\u00a0– with milestone payments and clear governance.",
    wege: [
      { titel: "Storage & co-location", text: "Battery storage at the same grid connection as the solar park or as a stand-alone project at grid nodes." },
      { titel: "Participation for citizens", text: "Smaller amounts? Through the cooperative, citizens and farmers take a stake in local parks." },
    ],
  },
};

function Etikett({ children, dunkel = false }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold", dunkel ? "bg-white/10 text-white/85 ring-1 ring-inset ring-white/15" : "bg-ink-100 text-ink-600")}>
      {children}
    </span>
  );
}

function Symbol({ icon: Icon, ton = "hell" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset",
        ton === "hell" && "bg-ov-50 text-ov-700 ring-ov-200",
        ton === "gruen" && "bg-white/15 text-white ring-white/25",
        ton === "navy" && "bg-white/10 text-ov-300 ring-white/15"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={1.8} />
    </span>
  );
}

export default function Angebot({ land = null }) {
  // Marktspannen je kWp sind Werte für Deutschland (PHASEN): in AT/CH ohne Eurowerte, mit LandHinweis
  const l = landCode(land);
  const werte = !l || l === "DE";
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze(TEXTE, sprache);
  const f = (n) => fmtZahl(n, 0, sprache);
  const entwicklung = PHASEN.filter((p) => p.id !== "cod");
  const max = Math.max(...entwicklung.map((p) => p.preisProKwp.max));
  return (
    <section data-abschnitt="angebot" aria-labelledby="angebot-titel" className="bg-white pb-20 pt-20 md:pb-24 md:pt-28">
      <div className="ov-container">
        <div className="mb-10 grid gap-6 md:mb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)] lg:items-end lg:gap-16">
          <div>
            <SectionHeading eyebrow={t.eyebrow} title={<span id="angebot-titel">{t.titel}</span>} />
          </div>
          <Reveal>
            <p className="ov-lead text-ink-600">{t.lead}</p>
          </Reveal>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {/* Projektrechte – mit Mini-Preistreppe */}
          <Reveal className="relative overflow-hidden rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/70 md:col-span-2 md:p-8 lg:col-span-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Layers} />
              <Etikett>{t.rechteEtikett}</Etikett>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">{t.rechteTitel}</h3>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-600">{t.rechteText}</p>
            <div className="mt-7 grid grid-cols-5 items-end gap-2 sm:gap-3" aria-hidden="true">
              {entwicklung.map((p) => (
                <div key={p.id} className="min-w-0">
                  <div className="relative h-24 rounded-xl bg-gradient-to-t from-white to-white/40 ring-1 ring-inset ring-ink-200/60 sm:h-28">
                    <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-ink-200/80" />
                    <div
                      className="absolute inset-x-2 rounded-md bg-gradient-to-t from-ov-600 to-ov-400 shadow-[0_6px_14px_-6px_rgba(102,153,51,0.7)]"
                      style={{ bottom: `${(p.preisProKwp.min / max) * 100}%`, top: `${100 - (p.preisProKwp.max / max) * 100}%`, minHeight: 6 }}
                    />
                  </div>
                  <p className="mt-2 truncate text-[11.5px] font-semibold text-ink-700 sm:text-[12.5px]">{en ? BEGRIFFE_EN.phaseKurz[p.id] ?? p.kurz : p.kurz}</p>
                  {werte && <p className="ov-num text-[11px] text-ink-500 sm:text-[12px]">{en ? `€${f(p.preisProKwp.min)}–${f(p.preisProKwp.max)}` : `${f(p.preisProKwp.min)}–${f(p.preisProKwp.max)} €`}</p>}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-ink-500">
              {werte
                ? `${t.spannen}${l ? "" : t.gilt}`
                : `${t.frueher} ${en ? landHinweisTextEn(l, t.thema) : landHinweisText(l, t.thema)}.`}
            </p>
          </Reveal>

          {/* RTB – hervorgehoben */}
          <Reveal delay={80} className="relative flex flex-col overflow-hidden rounded-3xl bg-ov-700 p-6 text-white md:p-8 lg:col-span-2">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-ov-400/40 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={FileSignature} ton="gruen" />
              <Etikett dunkel>{t.rtbEtikett}</Etikett>
            </div>
            <h3 className="ov-h3 relative mt-6">{t.rtbTitel}</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-white/85">{t.rtbText}</p>
            <ul className="relative mt-auto space-y-2 border-t border-white/15 pt-5 text-[13.5px] text-white/85 max-lg:mt-6">
              {t.rtbListe.map((x) => (
                <li key={x} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sun-300" />{x}</li>
              ))}
            </ul>
          </Reveal>

          {/* Bestand */}
          <Reveal delay={60} className="relative overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8 lg:col-span-2">
            <div aria-hidden="true" className="ov-grid-bg pointer-events-none absolute inset-0 opacity-60" />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Building2} ton="navy" />
              <Etikett dunkel>{t.bestandEtikett}</Etikett>
            </div>
            <h3 className="ov-h3 relative mt-6">{t.bestandTitel}</h3>
            <p className="relative mt-2 text-[15px] leading-relaxed text-white/75">{t.bestandText}</p>
          </Reveal>

          {/* Co-Development */}
          <Reveal delay={120} className="relative overflow-hidden rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8 lg:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <Symbol icon={Handshake} />
              <Etikett>{t.coEtikett}</Etikett>
            </div>
            <h3 className="ov-h3 mt-6 text-ink-900">{t.coTitel}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{t.coText}</p>
          </Reveal>

          {/* Weitere Wege */}
          <div className="grid gap-4 md:col-span-2 md:grid-cols-2 lg:col-span-2 lg:grid-cols-1 lg:gap-5">
            {[
              { icon: BatteryCharging, ...t.wege[0], href: pfad("/grossspeicher") },
              { icon: Users, ...t.wege[1], href: pfad("/genossenschaft") },
            ].map((w, i) => (
              <Reveal key={w.href} delay={160 + i * 60} className="flex">
                <Link
                  href={w.href}
                  className="group relative flex w-full items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-[box-shadow,transform] duration-300 hover:shadow-e3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 motion-safe:hover:-translate-y-0.5"
                >
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ov-50 text-ov-700 ring-1 ring-inset ring-ov-200 transition-colors group-hover:bg-ov-600 group-hover:text-white">
                    <w.icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-display text-[16px] font-bold text-ink-900">
                      {w.titel}
                      <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-colors group-hover:text-ov-700" />
                    </span>
                    <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-600">{w.text}</span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
