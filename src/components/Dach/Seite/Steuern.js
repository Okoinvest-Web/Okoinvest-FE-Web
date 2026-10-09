// Recht & Steuern je Land – Inhalte unverändert, als Länderkarten mit Kennung
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { landDerAnfrage, spracheDerAnfrage } from "@/lib/land/seite";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { datumText } from "@/lib/sprache/format";

const LAENDER = [
  {
    land: "Deutschland",
    kz: "DE",
    punkte: [
      ["Einkommensteuer", "Dachpacht aus dem Privatvermögen sind in der Regel Einkünfte aus Vermietung und Verpachtung (§ 21 EStG); gehört das Gebäude zum Betriebsvermögen, sind es betriebliche Einnahmen."],
      ["Gewerbliche Infizierung", "Reine Dachvermietung ist keine gewerbliche Tätigkeit. Betreibt aber eine vermögensverwaltende Personengesellschaft selbst eine PV-Anlage, können nach § 15 Abs. 3 Nr. 1 EStG alle Einkünfte gewerblich werden – kleine, nach § 3 Nr. 72 EStG steuerfreie Anlagen sind davon ausgenommen. Deshalb häufig: Verpachten statt selbst betreiben."],
      ["Gewerbesteuer-Kürzung", "Wohnungs- und Grundstücksunternehmen mit erweiterter Kürzung (§ 9 Nr. 1 GewStG) sollten eigene Stromlieferungen vorab prüfen lassen – Einnahmen daraus sind nur in engen Grenzen unschädlich. Die bloße Dachvermietung ist nach aktuellem Stand unkritisch."],
      ["Grundsteuer", "Die PV-Anlage gilt in der Regel als Betriebsvorrichtung und gehört nicht zum Grundvermögen – die Grundsteuer des Gebäudes ändert sich durch die Dachpacht im Normalfall nicht."],
      ["Umsatzsteuer", "Dachvermietung ist grundsätzlich umsatzsteuerfrei (§ 4 Nr. 12 UStG), eine Option zur Steuerpflicht ist möglich. Wird eine Dachsanierung als Gegenleistung erbracht, liegt ein tauschähnlicher Umsatz vor – Rechnungen sauber gestalten."],
    ],
  },
  {
    land: "Österreich",
    kz: "AT",
    punkte: [
      ["Einkommensteuer", "Dachpacht zählt bei Privatpersonen meist zu den Einkünften aus Vermietung und Verpachtung, im Betrieb zu den betrieblichen Einkünften."],
      ["Umsatzsteuer", "Die Vermietung von Grundstücksteilen ist grundsätzlich unecht steuerbefreit; eine Option zur Steuerpflicht ist unter Voraussetzungen möglich."],
      ["Sicherung & Genehmigung", "Absicherung über eine im Grundbuch eingetragene Dienstbarkeit. Bau- bzw. Anzeigepflichten regeln die Bauordnungen der Länder; Förderung (etwa EAG-Investitionszuschuss) beantragt der Betreiber."],
    ],
  },
  {
    land: "Schweiz",
    kz: "CH",
    punkte: [
      ["Vertrag & Sicherung", "Üblich sind Dachmietverträge oder eine Dienstbarkeit (etwa ein Baurecht bzw. Personaldienstbarkeit im Grundbuch), damit die Anlage vom Gebäude getrennt bleibt."],
      ["Steuern", "Mietentgelte sind als Einkommen steuerbar; Behandlung und Abzüge richten sich nach kantonalem Recht. Frühzeitig mit der Treuhand klären."],
      ["Bewilligung & Förderung", "Genügend angepasste Solaranlagen auf Dächern sind nach Art. 18a RPG in vielen Fällen nur meldepflichtig. Die Einmalvergütung beantragt der Betreiber; Eigenverbrauch lässt sich über ZEV bzw. vZEV organisieren."],
    ],
  },
];

/** Englisch (Sprachmodell): gleiche Reihenfolge wie LAENDER, nur Texte. Rechtsbegriffe im Original mit Erklärung. */
const LAENDER_EN = [
  {
    land: "Germany",
    punkte: [
      ["Income tax", "Roof lease income from private assets is generally income from letting and leasing (§ 21 EStG, German Income Tax Act); if the building belongs to business assets, it is business income."],
      ["Commercial ‘infection’", "Purely renting out a roof is not a commercial activity. However, if an asset-managing partnership operates a PV installation itself, all of its income can become commercial under § 15 (3) no. 1 EStG – small installations that are tax-exempt under § 3 no. 72 EStG are excluded. That is why leasing rather than operating yourself is common."],
      ["Trade tax reduction", "Housing and property companies with the extended reduction (§ 9 no. 1 GewStG, Trade Tax Act) should have their own power supplies checked in advance – income from them is only harmless within narrow limits. Merely renting out the roof is unproblematic according to the current position."],
      ["Property tax", "The PV installation is generally regarded as operating equipment and is not part of the real property – the building’s property tax does not normally change as a result of the roof lease."],
      ["VAT", "Renting out a roof is in principle exempt from VAT (§ 4 no. 12 UStG, VAT Act), although opting for VAT is possible. If a roof renovation is provided in return, this is a barter-like transaction – structure invoices carefully."],
    ],
  },
  {
    land: "Austria",
    punkte: [
      ["Income tax", "For private individuals, roof lease income usually counts as income from letting and leasing, and as business income within a business."],
      ["VAT", "Renting out parts of a property is in principle exempt from VAT without input tax deduction (unecht steuerbefreit); opting for VAT is possible under certain conditions."],
      ["Security & permits", "Secured by an easement (Dienstbarkeit) entered in the land register. Building and notification requirements are set by the building codes of the federal states; funding (such as the EAG investment grant) is applied for by the operator."],
    ],
  },
  {
    land: "Switzerland",
    punkte: [
      ["Contract & security", "Roof rental agreements or an easement (such as a building right or personal servitude in the land register) are common, so that the installation remains separate from the building."],
      ["Tax", "Rental income is taxable as income; treatment and deductions depend on cantonal law. Clarify this early with your fiduciary."],
      ["Permit & funding", "Under Art. 18a RPG (Swiss Spatial Planning Act), sufficiently adapted solar installations on roofs often only need to be notified. The one-off remuneration is applied for by the operator; self-consumption can be organised via a ZEV or vZEV (self-consumption groups)."],
    ],
  },
];

const W = {
  de: {
    eyebrow: "Recht & Steuern",
    titel: "Vor der Unterschrift zur Steuerberatung.",
    lead: "Die Dachpacht ist einfach – steuerlich kommt es darauf an, wem das Gebäude gehört und ob Sie selbst Strom erzeugen oder liefern. Die Punkte sind eine Orientierung nach aktuellem Stand, keine Rechts- oder Steuerberatung.",
    punkte: (n) => `${n} Punkte`,
    fuss: (stand) => `Stand ${stand}. Steuerrecht und Förderbedingungen ändern sich; einzelne Punkte hängen stark von Rechtsform, Gebäudenutzung und Größe der Anlage ab. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung bzw. Treuhand prüfen.`,
  },
  en: {
    eyebrow: "Law & tax",
    titel: "See your tax adviser before you sign.",
    lead: "The roof lease is simple – for tax purposes, what matters is who owns the building and whether you generate or supply power yourself. The points are for guidance based on the current position and do not constitute legal or tax advice.",
    punkte: (n) => `${n} points`,
    fuss: (stand) => `As of ${datumText(stand, "en")}. Tax law and funding conditions change; individual points depend heavily on the legal form, use of the building and size of the installation. Please have your case reviewed by your tax adviser or fiduciary before signing.`,
  },
};

export default function Steuern({ stand }) {
  // Länderinhalt: Land der Seite zuerst (Reihenfolge), Inhalte unverändert
  const land = landDerAnfrage();
  const sprache = spracheDerAnfrage();
  const w = uebersetze(W, sprache);
  const basis = sprache === "en" ? LAENDER.map((l, i) => ({ ...l, ...LAENDER_EN[i] })) : LAENDER;
  const laender = land ? [...basis].sort((a, b) => (a.kz === land ? -1 : b.kz === land ? 1 : 0)) : basis;
  return (
    <section data-abschnitt="steuern" aria-labelledby="steuern-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={<span id="steuern-titel">{w.titel}</span>}
          lead={w.lead}
        />
        <div className="mt-10 grid items-start gap-4 md:mt-12 lg:grid-cols-[1.2fr_1fr_1fr]">
          {laender.map((l, i) => (
            <Reveal key={l.kz} delay={i * 80} className="overflow-hidden rounded-3xl bg-white ring-1 ring-ink-200/70">
              <div className={cn("flex items-center gap-3 border-b border-ink-100 px-6 py-4 md:px-7", i === 0 ? "bg-ov-50/70" : "bg-sand-50")}>
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy-950 font-display text-[12.5px] font-extrabold tracking-[0.04em] text-white">{l.kz}</span>
                <h3 className="font-display text-[19px] font-bold text-ink-900">{l.land}</h3>
                <span className="ml-auto text-[12.5px] text-ink-500">{w.punkte(l.punkte.length)}</span>
              </div>
              <dl className="divide-y divide-ink-100 px-6 md:px-7">
                {l.punkte.map(([k, v]) => (
                  <div key={k} className="py-4">
                    <dt className="text-[14.5px] font-semibold text-ink-900">{k}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-ink-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          {w.fuss(stand)}
        </p>
      </div>
    </section>
  );
}
