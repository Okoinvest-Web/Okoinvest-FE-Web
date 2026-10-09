// src/app/rechner/energy-sharing/page.js – Energy Sharing / Energiegemeinschaft DE, AT, CH
//
// Sprachmodell: deutsche Texte in DE, englische in EN (gleiche Struktur; Regeln:
// src/lib/sprache/woerterbuch.js). Zahlen im Format der Sprache (src/lib/sprache/zahlformat.js).

import Link from "@/components/Land/Link";
import RechnerSeite, { rechnerMetadata, rechnerMetadataEn } from "@/components/Rechner/RechnerSeite";
import EnergySharingRechner from "@/components/Rechner/EnergySharingRechner";
import { GEMEINSCHAFTEN } from "@/lib/invest/markt";
import { MIXE, SPEICHER_PLUS } from "@/lib/rechner/energySharing";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad as seitenPfad } from "@/lib/land";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { faqFuerLand, NurDEBlock } from "@/components/Land/Laenderteile";
import { uebersetze } from "@/lib/sprache/woerterbuch";
import { formate } from "@/lib/sprache/zahlformat";

const PFAD = seitenPfad("/rechner/energy-sharing");
const R = GEMEINSCHAFTEN.rechner;
const e = formate("en");
const MIX_EN = { haushalte: "households", gemischt: "mixed", gewerbe: "commercial" };

const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energy-Sharing-Rechner DE, AT, CH | ÖkoInvest",
  description:
    "Energy Sharing rechnen: geteilter Strom, Netzentgelt-Abschlag (EEG lokal/regional, LEG), Vorteil je Teilnehmer und Erlös des Erzeugers – DE, AT, CH.",
  keywords: ["Energy Sharing Rechner", "§ 42c EnWG Rechner", "LEG Schweiz Rechner", "Strom teilen Nachbarschaft", "Energy Sharing Deutschland"],
});

const metadataEn = rechnerMetadataEn({
  title: "Energy sharing calculator DE, AT, CH | ÖkoInvest",
  description:
    "Calculate energy sharing: shared power, grid fee discount (local/regional EEG, LEG), benefit per participant and producer revenue – Germany, Austria, Switzerland.",
  keywords: ["energy sharing calculator", "§ 42c EnWG calculator", "LEG Switzerland calculator", "share power with neighbours", "energy sharing Germany"],
});

const at = R.at.rabatte;
const ch = R.ch.rabatte;

const FAQ = [
  {
    q: "Was ist Energy Sharing?",
    a: "Beim Energy Sharing nutzen mehrere Haushalte, Betriebe oder Gemeinden gemeinsam den Strom einer Anlage in ihrer Nähe – über das öffentliche Netz. Gezählt wird jede Viertelstunde: Was die Anlage in dieser Zeit erzeugt und die Teilnehmenden gleichzeitig verbrauchen, ist geteilter Strom. Den Rest liefert wie bisher der eigene Stromlieferant.",
  },
  {
    q: "Wo lohnt sich eine Energiegemeinschaft am meisten?",
    a: `Nach aktuellem Stand in Österreich: Lokale Erneuerbare-Energie-Gemeinschaften erhalten ${fmt(at[0].anteil * 100)} % Abschlag auf den Arbeitspreis des Netznutzungsentgelts, regionale ${fmt(at[1].anteil * 100)} %; dazu entfallen Abgaben auf den geteilten Strom. In der Schweiz gibt es in der lokalen Elektrizitätsgemeinschaft (LEG) ${fmt(ch[0].anteil * 100)} % bzw. ${fmt(ch[1].anteil * 100)} % Abschlag auf die Netznutzung. In Deutschland entsteht der Vorteil beim Energy Sharing nach § 42c EnWG bisher nur über den Preis zwischen Erzeuger und Teilnehmenden.`,
    nurDE: "Regeln für Energiegemeinschaften",
  },
  {
    q: "Wie viel Strom kann eine Gemeinschaft wirklich teilen?",
    a: `Nur so viel, wie zeitgleich verbraucht wird. Haushalte verbrauchen viel abends, Betriebe tagsüber. Wir rechnen deshalb mit einer Gleichzeitigkeitsgrenze: ${MIXE.map((m) => `${m.label} rund ${fmt(m.a * 100)} %`).join(", ")} des Verbrauchs können höchstens aus PV gedeckt werden, mit Speicher etwa ${fmt(SPEICHER_PLUS * 100)} Prozentpunkte mehr. Große Anlagen erzeugen darüber hinaus vor allem Überschuss.`,
    nurDE: "Rechenwerte",
  },
  {
    q: "Kann Strom aus einem Solarpark geteilt werden?",
    a: "Grundsätzlich ja, wenn Park und Teilnehmende im zulässigen Gebiet liegen: in Österreich im Nahebereich des Netzes (lokal Niederspannung, regional Mittelspannung), in der Schweiz innerhalb der Gemeinde und in Deutschland im Netzgebiet des Verteilnetzbetreibers. Oft wird dazu ein Anteil des Parks einer Genossenschaft oder der Gemeinschaft zugeordnet.",
    nurDE: "Regeln für Energiegemeinschaften",
  },
  {
    q: "Was kostet die Abrechnung?",
    a: `Jede Gemeinschaft braucht Messdaten je Viertelstunde, eine Verteilung der Mengen und eine Abrechnung. Dafür rechnen wir je Teilnehmer und Jahr mit etwa ${fmt(R.de.verwaltung)} € (DE), ${fmt(R.at.verwaltung)} € (AT) und ${fmt(R.ch.verwaltung)} CHF (CH). Bei geringen geteilten Mengen können diese Kosten den Vorteil aufzehren.`,
    nurDE: "Kostenwerte",
  },
  {
    q: "Was ändert sich in Österreich mit dem ElWG?",
    a: "Mit dem Elektrizitätswirtschaftsgesetz werden die Regeln für Energiegemeinschaften ab Oktober 2026 neu geordnet; unter anderem kommt das direkte Teilen zwischen Einzelnen hinzu. Bestehende Gemeinschaften laufen weiter. Einzelne Details waren zuletzt noch offen – wir halten die Werte im Rechner aktuell.",
  },
];

const FAQ_EN = [
  {
    q: "What is energy sharing?",
    a: "With energy sharing, several households, businesses or municipalities jointly use the power from a nearby plant – via the public grid. Every quarter-hour is counted: what the plant generates during that time and the participants consume simultaneously is shared power. The rest is supplied, as before, by each participant’s own electricity supplier.",
  },
  {
    q: "Where is an energy community most worthwhile?",
    a: `As things stand, in Austria: local renewable energy communities (EEG – Erneuerbare-Energie-Gemeinschaft) receive a ${e.pct(at[0].anteil * 100)} discount on the energy charge of the grid usage fee, regional ones ${e.pct(at[1].anteil * 100)}; in addition, levies on the shared power no longer apply. In Switzerland, the local electricity community (LEG – lokale Elektrizitätsgemeinschaft) receives a ${e.pct(ch[0].anteil * 100)} or ${e.pct(ch[1].anteil * 100)} discount on grid usage. In Germany, the benefit of energy sharing under § 42c EnWG (German Energy Industry Act) has so far arisen only from the price agreed between producer and participants.`,
    nurDE: "Rules for energy communities",
  },
  {
    q: "How much power can a community really share?",
    a: `Only as much as is consumed at the same time. Households use a lot in the evening, businesses during the day. We therefore calculate with a simultaneity limit: at most ${MIXE.map((m) => `around ${e.pct(m.a * 100)} (${MIX_EN[m.id] ?? m.label})`).join(", ")} of consumption can be covered by PV, with storage about ${e.fmt(SPEICHER_PLUS * 100)} percentage points more. Beyond that, large plants mainly generate surplus.`,
    nurDE: "Figures",
  },
  {
    q: "Can power from a solar park be shared?",
    a: "In principle yes, if the park and participants are within the permitted area: in Austria within the vicinity of the grid (local: low voltage, regional: medium voltage), in Switzerland within the municipality, and in Germany within the grid area of the distribution system operator. Often a share of the park is allocated to a cooperative or the community for this purpose.",
    nurDE: "Rules for energy communities",
  },
  {
    q: "What does billing cost?",
    a: `Every community needs quarter-hourly metering data, an allocation of quantities and billing. For this we calculate with around ${e.eur(R.de.verwaltung)} (DE), ${e.eur(R.at.verwaltung)} (AT) and CHF ${e.fmt(R.ch.verwaltung)} (CH) per participant per year. With small shared quantities, these costs can eat up the benefit.`,
    nurDE: "Cost figures",
  },
  {
    q: "What changes in Austria with the ElWG?",
    a: "With the Electricity Industry Act (ElWG – Elektrizitätswirtschaftsgesetz), the rules for energy communities will be reorganised from October 2026; among other things, direct sharing between individuals will be added. Existing communities will continue. Some details were still open at the time of writing – we keep the values in the calculator up to date.",
  },
];

const DE = {
  breadcrumb: "Energy-Sharing-Rechner",
  eyebrow: "Für Bürger, Gemeinden und Betriebe · DACH",
  title: (
    <>
      Strom teilen in der Nachbarschaft – <span className="ov-text-gradient-light">was bringt es wirklich?</span>
    </>
  ),
  lead: "Land wählen, Anlage und Teilnehmende eingeben: Sie sehen, wie viel Strom geteilt werden kann, welchen Netzentgeltvorteil es gibt und was Teilnehmende und Erzeuger davon haben.",
  chips: ["Deutschland, Österreich, Schweiz", "Gleichzeitigkeit berücksichtigt", "Netzentgelt-Abschlag", "Erzeuger und Teilnehmende"],
  app: {
    name: "Energy-Sharing-Rechner DACH",
    description: "Schätzt geteilten Strom, Netzentgelt-Abschläge, Preisvorteile je Teilnehmer und Mehrerlöse für den Erzeuger in Energiegemeinschaften in Deutschland, Österreich und der Schweiz.",
    featureList: ["Energy Sharing § 42c EnWG", "EEG lokal/regional und BEG (AT)", "LEG (CH)", "Gleichzeitigkeit nach Teilnehmermix und Speicher", "Vorteil je Teilnehmer und Erlös des Erzeugers", "Größenkurve der Anlage"],
  },
  annahmen: [
    ["DE: Netzentgeltvorteil", "keiner (§ 42c EnWG)"],
    ["AT: EEG lokal / regional", `−${fmt(at[0].anteil * 100)} % / −${fmt(at[1].anteil * 100)} % Netz-AP`],
    ["AT: Elektrizitätsabgabe 2026", `${fmt(R.at.abgabenCt, 2)} ct/kWh entfällt`],
    ["CH: LEG eine / mehrere Ebenen", `−${fmt(ch[0].anteil * 100)} % / −${fmt(ch[1].anteil * 100)} %`],
    ["Netz-AP (Standard)", `DE ${fmt(R.de.netzAp)} · AT ${fmt(R.at.netzAp)} ct · CH ${fmt(R.ch.netzAp)} Rp.`],
    ["Energiepreis Lieferant", `DE ${fmt(R.de.energiepreis)} · AT ${fmt(R.at.energiepreis)} ct · CH ${fmt(R.ch.energiepreis)} Rp.`],
    ["Gleichzeitigkeit", MIXE.map((m) => `${fmt(m.a * 100)} %`).join(" / ")],
    ["Speicher", `+${fmt(SPEICHER_PLUS * 100)} Prozentpunkte`],
  ],
  quellen: [
    { name: "§ 42c EnWG", url: "https://www.gesetze-im-internet.de/enwg_2005/__42c.html" },
    { name: "Österreichische Koordinationsstelle Energiegemeinschaften", url: "https://energiegemeinschaften.gv.at/" },
    { name: "Stromliste.at – Regeln ab Oktober 2026", url: "https://stromliste.at/aktuelles/energiegemeinschaft-neue-regeln-oktober-2026" },
    { name: "BFE – Lokale Elektrizitätsgemeinschaften", url: "https://www.bfe.admin.ch/" },
  ],
  faqTitel: "Energy Sharing – gut zu wissen",
  querverweise: [
    { href: seitenPfad("/energiegemeinschaften"), titel: "Energiegemeinschaften", text: "Die Modelle in Deutschland, Österreich und der Schweiz im Vergleich." },
    { href: seitenPfad("/genossenschaft"), titel: "Genossenschaft", text: "Gemeinsam an Parks der Region beteiligen – Grundlage für viele Gemeinschaften." },
    { href: seitenPfad("/kommunen"), titel: "Für Kommunen", text: "Wie Gemeinden Energiegemeinschaften anstoßen und Solarparks mitgestalten." },
  ],
  cta: {
    eyebrow: "Energiegemeinschaften",
    title: "Eine Gemeinschaft mit Strom aus der Region gründen?",
    text: "Wir bringen Strom aus Parks im Nahebereich ein und unterstützen bei Gründung, Anmeldung beim Netzbetreiber und Organisation – in Deutschland, Österreich und der Schweiz.",
    primary: { label: "Energiegemeinschaften", href: seitenPfad("/energiegemeinschaften") },
    secondary: { label: "Kontakt aufnehmen", href: "/kontakt" },
  },
};

const EN = {
  breadcrumb: "Energy sharing calculator",
  eyebrow: "For citizens, municipalities and businesses · DACH",
  title: (
    <>
      Sharing power with your neighbours – <span className="ov-text-gradient-light">what does it really bring?</span>
    </>
  ),
  lead: "Choose a country, enter the plant and participants: you see how much power can be shared, what grid fee advantage there is and what participants and producers gain from it.",
  chips: ["Germany, Austria, Switzerland", "Simultaneity taken into account", "Grid fee discount", "Producers and participants"],
  app: {
    name: "Energy sharing calculator DACH",
    description: "Estimates shared power, grid fee discounts, price benefits per participant and additional revenue for the producer in energy communities in Germany, Austria and Switzerland.",
    featureList: ["Energy sharing under § 42c EnWG", "Local/regional EEG and BEG (AT)", "LEG (CH)", "Simultaneity by participant mix and storage", "Benefit per participant and producer revenue", "Plant size curve"],
  },
  annahmen: [
    ["DE: grid fee advantage", "none (§ 42c EnWG)"],
    ["AT: EEG local / regional", `−${e.pct(at[0].anteil * 100)} / −${e.pct(at[1].anteil * 100)} grid energy charge`],
    ["AT: electricity levy 2026", `${e.fmt(R.at.abgabenCt, 2)} ct/kWh waived`],
    ["CH: LEG one / several levels", `−${e.pct(ch[0].anteil * 100)} / −${e.pct(ch[1].anteil * 100)}`],
    ["Grid energy charge (default)", `DE ${e.fmt(R.de.netzAp)} · AT ${e.fmt(R.at.netzAp)} ct · CH ${e.fmt(R.ch.netzAp)} Rp.`],
    ["Supplier energy price", `DE ${e.fmt(R.de.energiepreis)} · AT ${e.fmt(R.at.energiepreis)} ct · CH ${e.fmt(R.ch.energiepreis)} Rp.`],
    ["Simultaneity", MIXE.map((m) => e.pct(m.a * 100)).join(" / ")],
    ["Storage", `+${e.fmt(SPEICHER_PLUS * 100)} percentage points`],
  ],
  quellen: [
    { name: "§ 42c EnWG (German Energy Industry Act)" },
    { name: "Austrian Coordination Office for Energy Communities" },
    { name: "Stromliste.at – rules from October 2026" },
    { name: "SFOE (Swiss Federal Office of Energy) – local electricity communities" },
  ],
  faqTitel: "Energy sharing – good to know",
  querverweise: [
    { titel: "Energy communities", text: "The models in Germany, Austria and Switzerland compared." },
    { titel: "Cooperative", text: "Jointly participate in regional parks – the basis for many communities." },
    { titel: "For municipalities", text: "How municipalities initiate energy communities and help shape solar parks." },
  ],
  cta: {
    eyebrow: "Energy communities",
    title: "Set up a community with power from your region?",
    text: "We contribute power from nearby parks and support you with formation, registration with the grid operator and organisation – in Germany, Austria and Switzerland.",
    primary: { label: "Energy communities" },
    secondary: { label: "Get in touch" },
  },
};

export default async function Page({ params }) {
  const land = await seitenLand(params);
  const sprache = spracheDerAnfrage();
  const en = sprache === "en";
  const t = uebersetze({ de: DE, en: EN }, sprache);
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="energy-sharing"
      breadcrumb={t.breadcrumb}
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      chips={t.chips}
      app={t.app}
      rechner={<EnergySharingRechner />}
      erklaerung={
        <NurDEBlock land={land} thema="Rechenwerte und Annahmen" themaEn="Figures and assumptions">
          {en ? (
            <div className="ov-prose max-w-none">
              <h2>How the energy sharing calculator works</h2>
              <p>
                Depending on the region, the plant generates a certain amount of power per year. Of this, only what the participants consume <strong>in the same quarter-hour</strong> can be shared. Small plants are therefore used almost entirely, while large ones hit a limit that depends on the participant mix. We model this with a saturation curve – an approximation that does not replace real load profiles.
              </p>
              <p>
                The <strong>benefit per shared kilowatt hour</strong> is made up of the difference between your supplier’s energy price and the price within the community, the discount on the grid fee (Austria, Switzerland) and – in Austria – levies that no longer apply. From this we deduct the costs of metering and billing. The producer receives the community price instead of the usually lower feed-in remuneration.
              </p>
              <p>
                You will find the rules compared by country under <Link href={seitenPfad("/energiegemeinschaften")}>Energy communities</Link>, and background in the guide <Link href="/ratgeber/energy-sharing-energiegemeinschaften">Energy sharing</Link>.
              </p>
            </div>
          ) : (
            <div className="ov-prose max-w-none">
              <h2>So rechnet der Energy-Sharing-Rechner</h2>
              <p>
                Die Anlage erzeugt je nach Region eine bestimmte Menge Strom im Jahr. Geteilt werden kann davon nur, was die Teilnehmenden <strong>in derselben Viertelstunde</strong> verbrauchen.
                Kleine Anlagen werden deshalb fast vollständig genutzt, große stoßen an eine Grenze, die vom Teilnehmermix abhängt. Wir bilden das mit einer Sättigungskurve ab – eine Näherung,
                die echte Lastgänge nicht ersetzt.
              </p>
              <p>
                Der <strong>Vorteil je geteilter Kilowattstunde</strong> setzt sich zusammen aus der Differenz zwischen dem Energiepreis Ihres Lieferanten und dem Preis in der Gemeinschaft, dem
                Abschlag auf das Netzentgelt (Österreich, Schweiz) und – in Österreich – entfallenden Abgaben. Davon ziehen wir die Kosten für Messung und Abrechnung ab. Der Erzeuger erhält den
                Gemeinschaftspreis statt der meist niedrigeren Einspeisevergütung.
              </p>
              <p>
                Die Regeln im Ländervergleich finden Sie unter <Link href={seitenPfad("/energiegemeinschaften")}>Energiegemeinschaften</Link>, Hintergründe im Ratgeber{" "}
                <Link href="/ratgeber/energy-sharing-energiegemeinschaften">Energy Sharing</Link>.
              </p>
            </div>
          )}
        </NurDEBlock>
      }
      annahmen={t.annahmen}
      quellen={t.quellen}
      faq={faqFuerLand(uebersetze({ de: FAQ, en: FAQ_EN }, sprache), land, { sprache })}
      faqTitel={t.faqTitel}
      querverweise={t.querverweise}
      cta={t.cta}
    />
  );
}

export const generateMetadata = seitenMetadata("/rechner/energy-sharing", metadata, { en: metadataEn });
