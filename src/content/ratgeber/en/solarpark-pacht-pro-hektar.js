// Englische Fassung: Pacht pro Hektar für Solarparks 2026 (Volltext, gleiche Struktur wie das Original)
// Struktur, ids, hrefs und Zahlen kommen aus src/content/ratgeber/solarpark-pacht-pro-hektar.js;
// hier stehen nur die Texte. Rechenwerte über ZAHLEN aus dem Original (eine Quelle).

import { PACHT, FREIFLAECHE, ERLOESE, REGIONEN, KOMMUNE, AGRI, STAND } from "@/lib/invest/markt";
import { formate } from "@/lib/sprache/zahlformat";
import { optionEn } from "@/lib/sprache/rechnerBegriffe";
import { ZAHLEN } from "../solarpark-pacht-pro-hektar.js";

const { fmt, fmtEur, fmtPct } = formate("en");
const { HA, JAHRE, REGION, EEG_JAHRE, mwp, ertragJahr1, R, faktorAcker, DESTATIS_PACHT_LF_2023, DESTATIS_PACHT_MAX_LAND, DESTATIS_PACHT_MIN_LAND, AT_PV_PACHT_ANGEBOTE } = ZAHLEN;
const eur = (n) => fmtEur(n);
const eurHa = (n) => `€${fmt(n)}/ha`;
const spanne = (s) => `€${fmt(s.min)}–${fmt(s.max)}`;
const stand = STAND; // „September 2026“ – Monatsnamen sind im Englischen gleich
const verlaengerung = optionEn(PACHT.verlaengerung);

const artikel = {
  kurzFazit: [
    `**In 2026, ground-mounted solar parks usually pay €${fmt(PACHT.freiflaecheProHa.min)} to €${fmt(PACHT.freiflaecheProHa.max)} per hectare and year**; a typical average is around ${eurHa(PACHT.freiflaecheProHa.mittel)}.`,
    `That is around **${fmt(faktorAcker, 0)} times the usual farm rent** of about ${eurHa(PACHT.ackerProHa)} – in return, the land is tied up for around ${JAHRE} years.`,
    `Over ${JAHRE} years, the lease for 10 ha in our example adds up to around **€${fmt(Math.round(R.festMittel / 1000) * 1000)}** (average, ${fmtPct(PACHT.indexierung)} indexation).`,
    "The biggest influences on the lease are the **grid connection** (distance to the substation, free capacity), the **support framework** and the **size of the land** – not soil quality alone.",
    "Conspicuously high offers are often tied to long, unpaid reservation periods or one-sided termination rights. What matters is the overall package, not the figure per hectare.",
  ],

  abschnitte: [
    {
      titel: "How much lease does a solar park pay per hectare?",
      tocLabel: "Short answer",
      bloecke: [
        {
          text: `**For well-suited land, solar park operators in the DACH region currently (${stand}) usually pay between €${fmt(PACHT.freiflaecheProHa.min)} and €${fmt(PACHT.freiflaecheProHa.max)} per hectare and year.** Most contracts are in the middle range around ${eurHa(PACHT.freiflaecheProHa.mittel)}. The lease is usually paid from the start of construction or commissioning, over a term of ${JAHRE} years with extension options (often ${verlaengerung}), and adjusted for inflation every year.`,
        },
        {
          text: "There is no single “right” figure. The lease is the result of a project calculation: what an operator can pay depends on how expensive the grid connection will be, which electricity price it achieves through a tender or a power purchase agreement, and how many megawatts fit on the land. That is why two fields in the same district can receive very different offers – one is 800 m from the [substation](/wissen/lexikon#umspannwerk), the other 6 km.",
        },
        {
          titel: "typical solar park lease per year",
          text: `Range €${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)}/ha. For comparison: farm rent averages about ${eurHa(PACHT.ackerProHa)}, agri-PV €${fmt(PACHT.agriProHa.min)}–${fmt(PACHT.agriProHa.max)}/ha.`,
          wert: eurHa(PACHT.freiflaecheProHa.mittel),
        },
        {
          titel: "Estimate the lease for your land",
          text: "Enter area, region and lease model – the lease calculator shows the annual and total lease over the term.",
          label: "To the lease calculator",
        },
      ],
    },
    {
      titel: "Lease ranges in Germany, Austria and Switzerland",
      tocLabel: "Ranges DE/AT/CH",
      bloecke: [
        {
          text: "**Germany is the largest and most transparent market for ground-mounted PV in the DACH region, Austria is catching up, and in Switzerland conventional solar parks on arable land play hardly any role.** The following overview summarises the orders of magnitude:",
        },
        {
          caption: `Lease for photovoltaic land compared, as of ${stand}`,
          kopf: ["Use", "Typical lease per ha and year", "Context"],
          zeilen: [
            ["Ground-mounted PV Germany", `**${spanne(PACHT.freiflaecheProHa)}**`, `average around ${eurHa(PACHT.freiflaecheProHa.mittel)}; peaks at very good grid points`],
            ["Ground-mounted PV Austria", `often ${spanne(AT_PV_PACHT_ANGEBOTE)} (offers)`, "according to the Styrian Chamber of Agriculture; a “Grünland-Photovoltaik” zoning designation (Widmung) is required, set per federal state"],
            ["Ground-mounted PV Switzerland", "no reliable market value", "ground-mounted plants outside the building zone only by way of exception; focus on roofs and alpine plants"],
            ["Agri-PV (DACH)", spanne(PACHT.agriProHa), "lower, because the agricultural use stays with the owner or farmer"],
            ["Farm rent Germany (average)", `around €${fmt(PACHT.ackerProHa)}`, `Destatis 2023: ${eurHa(DESTATIS_PACHT_LF_2023)} on average across all farmland, new leases considerably higher`],
          ],
          fussnote: "Indicative values excluding VAT, not offers. The Austrian values refer to leases offered by energy companies (Styrian Chamber of Agriculture 2022) and are not the same as concluded contracts.",
        },
        {
          text: "In **Austria**, besides the grid connection, the zoning designation is the bottleneck: depending on the federal state, a ground-mounted plant needs a zoning designation as Grünland-Photovoltaik or must lie in a designated priority zone. More on this in the guide [Ground-mounted PV in Austria](/ratgeber/freiflaechen-pv-oesterreich). In **Switzerland**, solar plants outside building zones are heavily restricted by spatial planning law; a lease market for arable land as in Germany practically does not exist. Background in the guide [Ground-mounted PV in Switzerland](/ratgeber/freiflaechen-pv-schweiz).",
        },
      ],
    },
    {
      titel: "Solar park lease compared with farm rent",
      tocLabel: "Comparison with farm rent",
      bloecke: [
        {
          text: `**On average, the solar lease is ${fmt(faktorAcker, 0)} times the agricultural rent.** According to the Federal Statistical Office (Destatis), the average rent for agricultural land in Germany in 2023 was ${eurHa(DESTATIS_PACHT_LF_2023)} – with large differences between ${eurHa(DESTATIS_PACHT_MIN_LAND)} in Saarland and ${eurHa(DESTATIS_PACHT_MAX_LAND)} in North Rhine-Westphalia. Pure arable land is somewhat higher; we assume around ${eurHa(PACHT.ackerProHa)}.`,
        },
        {
          text: `If you have farmed the land yourself so far, do not compare with farm rent but with the **gross margin**: in arable farming it is roughly between €${fmt(PACHT.deckungsbeitragAcker.min)} and €${fmt(PACHT.deckungsbeitragAcker.max)} per hectare and year, depending heavily on crop, location and prices. On top of that come CAP direct payments of roughly ${eurHa(AGRI.direktzahlungProHa)}, which are usually lost for land under a conventional ground-mounted plant – unlike with [agri-PV](/agri-pv), where according to the current status ${fmtPct(AGRI.gapFoerderfaehig, 0)} of the area remains eligible.`,
        },
        {
          titel: "What the Thünen Institute says about the effect on the land market",
          text: "In 2022, the Thünen Institute estimated the future land requirement of ground-mounted PV and found that lease offers of over €2,500 per hectare are far above agricultural rents. Nationwide, only a small share of farmland is involved, but regionally high PV leases can noticeably affect the land market. For lessors this means: the neighbours are watching closely – being open about the project pays off.",
        },
      ],
    },
    {
      titel: "The most important factors influencing the lease",
      tocLabel: "Influencing factors",
      bloecke: [
        {
          text: "**What an operator can pay per hectare depends above all on the grid connection and the legal framework of the land.** Unlike in agricultural leasing, soil quality plays a rather indirect role, because high-quality soils are harder to push through in planning.",
        },
        {
          caption: "Factors that increase or reduce the solar park lease",
          kopf: ["Factor", "Increases the lease", "Reduces the lease"],
          zeilen: [
            ["Grid connection", "substation or medium-voltage line with free capacity nearby", `long cable route (on average around €${fmt(FREIFLAECHE.kabelProMeter)} per metre), lack of capacity, high construction cost contribution`],
            ["EEG eligible area", "[corridor strips](/wissen/lexikon#randstreifen) up to 500 m along motorways and double-track railways, conversion sites", "land outside the eligible area – can only be financed with a power purchase agreement (PPA) without market premium"],
            ["Less-favoured areas", "arable land/grassland in [less-favoured areas](/wissen/lexikon#benachteiligte-gebiete), unless the federal state excludes it by opt-out", "the federal state has restricted the opening under Section 37c EEG"],
            ["Building rights", "privileged 200 m corridor under Section 35 BauGB, municipality supports a development plan", "protected areas, landscape, agricultural priority areas"],
            ["Size and shape of the land", "from about 10–20 ha, compact, flat or gently south-facing", `below about ${fmt(FREIFLAECHE.mindestHa)} ha, fragmented, north slope, shading`],
            ["Irradiation", `southern Germany and Austria with around ${fmt(REGION.ertrag)} kWh/kWp`, `northern Germany with around ${fmt(REGIONEN.find((r) => r.id === "de-nord").ertrag)} kWh/kWp`],
          ],
          fussnote: "Qualitative assessment. The grid connection is the most common reason why land fails to win an award despite a good location.",
        },
        {
          text: "The grid question can be estimated roughly: if connecting a 10 MW park costs several hundred thousand euros more because of a 5 km cable route than for land right next to the [grid connection point](/wissen/lexikon#netzverknuepfungspunkt), this money is missing from the project calculation over the term – and so also from the lease. How the tender price comes about is explained in the guide [EEG tenders for ground-mounted PV](/ratgeber/eeg-ausschreibung-freiflaeche).",
        },
      ],
    },
    {
      titel: "Fixed lease, revenue-based lease, indexation and reservation premium",
      tocLabel: "Lease models",
      bloecke: [
        { text: "Fixed lease" },
        {
          text: `The fixed lease is a fixed amount per hectare and year, regardless of the electricity yield. For the owner it is predictable; the operator bears the yield and electricity price risk. An **annual value protection clause** linked to the consumer price index is common; we simplify with ${fmtPct(PACHT.indexierung)} per year. In the example, ${eur(R.festJahr1)} in the first year becomes around ${eur(R.festJahr30)} by year ${JAHRE}.`,
        },
        { text: "Revenue-based lease" },
        {
          text: `With a revenue-based lease, the owner receives a share of the electricity revenues, usually about ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} to ${fmtPct(PACHT.umsatzbeteiligung.max, 0)}. If electricity prices rise, the owner benefits; if they fall, the lease falls too. A **minimum lease** is therefore often agreed that is paid in any case, plus a revenue share above a threshold. It is important to define exactly which revenues count (market premium, direct marketing, power purchase agreement, guarantees of origin) and how the owner can check them.`,
        },
        { text: "Reservation premium until construction starts" },
        {
          text: `Two to four years often pass between signing the contract and the start of construction – for the development plan, grid connection commitment and tender. During this time, the land is tied up but usually continues to be farmed. Fair contracts provide a **provision or reservation fee** for this, typically €${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} per hectare, depending on the contract once or annually until construction starts. If it is missing altogether, the owner alone bears the risk that the project fails.`,
        },
      ],
    },
    {
      titel: `Worked example: 10 hectares over ${JAHRE} years`,
      tocLabel: "Worked example",
      bloecke: [
        {
          text: `**With fixed south-facing mounting, around ${fmt(mwp, 1)} MWp fit on 10 hectares; in southern Germany the plant generates about ${fmt(ertragJahr1 / 1e6, 1)} million kWh in the first year.** We assume an award value of ${fmt(ERLOESE.eegFreiflaecheCt, 1)} ct/kWh for ${EEG_JAHRE} years and a cautious market value of ${fmt(ERLOESE.merchantCt, 1)} ct/kWh thereafter, with module degradation of ${fmtPct(FREIFLAECHE.degradation)} per year.`,
        },
        {
          caption: `Lease income for 10 ha over ${JAHRE} years compared, as of ${stand}`,
          kopf: ["Model", "First year", `Total over ${JAHRE} years`],
          zeilen: [
            [`Fixed lease minimum (${eurHa(PACHT.freiflaecheProHa.min)})`, eur(PACHT.freiflaecheProHa.min * HA), eur(R.festMin)],
            [`**Fixed lease average (${eurHa(PACHT.freiflaecheProHa.mittel)})**`, `**${eur(R.festJahr1)}**`, `**${eur(R.festMittel)}**`],
            [`Fixed lease maximum (${eurHa(PACHT.freiflaecheProHa.max)})`, eur(PACHT.freiflaecheProHa.max * HA), eur(R.festMax)],
            [`Revenue-based lease ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} of revenues`, eur(R.umsatzJahr1Min), eur(R.umsatzMin)],
            [`Revenue-based lease ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} of revenues`, eur(R.umsatzJahr1Max), eur(R.umsatzMax)],
            [`For comparison: farm rent (${eurHa(PACHT.ackerProHa)})`, eur(PACHT.ackerProHa * HA), eur(R.acker)],
          ],
          fussnote: `Fixed lease and farm rent with ${fmtPct(PACHT.indexierung)} annual indexation, revenue-based lease without a minimum lease. Nominal totals without discounting and without taxes. Reservation fees before the start of construction are not included.`,
        },
        {
          text: `The calculation shows two things: a revenue-based lease of ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} to ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} ends up in the same order of magnitude as the fixed lease – so it is not a gift but a different allocation of risk. And after support ends, the revenue share falls if market prices are lower. Anyone choosing the revenue-based option should therefore insist on a minimum lease. You can calculate with your own figures in the [lease calculator](/rechner/pacht).`,
        },
        {
          titel: "Do not forget taxes",
          text: "The lease is taxable income. In Germany, the more important question is often whether the land loses its status as agricultural and forestry assets – with consequences for inheritance, gift and property tax. The details are explained in the guide [Inheritance and property tax on PV leases](/ratgeber/pv-pacht-erbschaftsteuer-grundsteuer). Have this reviewed by a tax adviser before signing the contract.",
        },
      ],
    },
    {
      titel: "Section 6 EEG: municipal participation is not a lease",
      tocLabel: "Section 6 EEG vs. lease",
      bloecke: [
        {
          text: `**The payment under Section 6 EEG goes to the municipality, not to the landowner.** Operators of ground-mounted plants may offer the municipalities in whose area the plant stands up to ${fmt(KOMMUNE.beteiligungCt, 1)} ct per kilowatt-hour actually fed into the grid; for subsidised plants, they can have the amount reimbursed by the network operator. In the example, that would be around ${eur(R.kommuneJahr)} a year for the municipal budget.`,
        },
        {
          titel: "Legal position in Germany (EEG 2023, as of September 2026)",
          text: "Section 6 EEG permits voluntary payments to affected municipalities, Section 37(1) no. 2 EEG sets out on which land ground-mounted plants may take part in the tenders, and Section 37c EEG allows the federal states to exclude arable land and grassland in less-favoured areas above certain thresholds. The current version on gesetze-im-internet.de is authoritative in each case.",
        },
        {
          text: "For owners, municipal participation is still relevant: it increases acceptance in the municipal council and the neighbourhood, and without the municipal council there is no development plan. How municipalities benefit and what they receive in trade tax on top is shown on the page for [municipalities](/kommunen).",
        },
      ],
    },
    {
      titel: "Warning signs with conspicuously high lease offers",
      tocLabel: "Warning signs",
      bloecke: [
        {
          text: `**An offer well above ${eurHa(PACHT.freiflaecheProHa.max)} is not automatically dubious – but it should prompt you to check particularly carefully.** A high figure often hides a contract that leaves the risks with the owner:`,
        },
        {
          punkte: [
            "**Long reservation without a fee:** the land is tied up for five years or longer, and payment only starts on commissioning.",
            "**One-sided termination rights:** the developer can withdraw at any time without compensation, but you cannot.",
            "**Lease only from feed-in**, with no rule for the case that construction is delayed.",
            "**No decommissioning security** (guarantee or reserve) for the end of the contract.",
            "**Unclear revenue basis** for a revenue-based lease, without audit and inspection rights.",
            "**Free transferability** to any company without creditworthiness requirements.",
            "**Fees or advance payments** from the owner – in reputable contracts, the developer pays for expert reports and planning.",
          ],
        },
        {
          text: "What matters in the individual clauses is explained in the guide [Solar park lease agreements](/ratgeber/pachtvertrag-solarpark). Background on the process from the owner's perspective can be found under [Lease your land](/flaeche-verpachten) and for farms under [Farmers](/landwirte).",
        },
      ],
    },
    {
      titel: "How to get a fair lease",
      tocLabel: "Approach",
      bloecke: [
        {
          schritte: [
            ["Classify the land", "Note the size, shape, position relative to motorways or railways, distance to the nearest substation and protected areas. The [land check](/flaechencheck) helps with the first assessment."],
            ["Calculate the order of magnitude", "Compare fixed and revenue-based lease over the term with the [lease calculator](/rechner/pacht)."],
            ["Obtain several offers", "Do not just compare the figure per hectare, but also the reservation fee, termination rights, decommissioning security and indexation."],
            ["Have tax and legal aspects checked", "Have the contract reviewed by a lawyer or notary and the tax consequences by a tax adviser – before you sign."],
            ["Involve the municipality early", "No development plan, no solar park. An early conversation with the mayor and the municipal council saves time."],
          ],
        },
      ],
    },
  ],

  faqTitel: "Frequently asked questions",
  faq: [
    {
      q: "How much lease do I get for 1 hectare of solar park?",
      a: `According to the current status, usually between €${fmt(PACHT.freiflaecheProHa.min)} and €${fmt(PACHT.freiflaecheProHa.max)} per year, on average around ${eurHa(PACHT.freiflaecheProHa.mittel)}. The level depends above all on the grid connection, the support framework and the size of the land. The [lease calculator](/rechner/pacht) provides a first estimate.`,
    },
    {
      q: "Is a revenue-based lease better than a fixed lease?",
      a: `Not in principle. At ${fmtPct(PACHT.umsatzbeteiligung.min, 0)} to ${fmtPct(PACHT.umsatzbeteiligung.max, 0)} of revenues it is in the same order of magnitude, but fluctuates with yield and electricity price. A combination of minimum lease and revenue share often makes sense.`,
    },
    {
      q: "When does the lease start to be paid?",
      a: "The full lease usually starts with the start of construction or commissioning. For the planning phase before that, you should agree a provision or reservation fee so that tying up the land is remunerated.",
    },
    {
      q: "How small can land for a solar park be?",
      a: `Below about ${fmt(FREIFLAECHE.mindestHa)} hectares it is rarely economical, because the grid connection and planning cause fixed costs. Smaller plots can be interesting if they adjoin a larger planned area or lie directly at the grid connection point.`,
    },
    {
      q: "As the owner, do I also receive the 0.2 ct under Section 6 EEG?",
      a: "No. The payment under Section 6 EEG is aimed at the host municipality, not at lessors. It does, however, improve the project's acceptance in the municipality.",
    },
    {
      q: "Do solar parks in Austria pay more lease than in Germany?",
      a: `According to the Styrian Chamber of Agriculture, the leases offered by energy companies averaged €${fmt(AT_PV_PACHT_ANGEBOTE.min)} to €${fmt(AT_PV_PACHT_ANGEBOTE.max)} per hectare – in the upper part of the German range. In Austria, the bottleneck is often the zoning designation (Widmung). More under [Ground-mounted PV in Austria](/ratgeber/freiflaechen-pv-oesterreich).`,
    },
  ],

  passend: [
    { titel: "Solar park lease agreements", text: "The key clauses and a checklist for owners." },
    { titel: "Inheritance and property tax on PV leases", text: "What leasing can trigger for tax purposes." },
    { titel: "Lease calculator", text: "Calculate fixed and revenue-based lease over the term." },
    { titel: "Lease your land", text: "Process and requirements for landowners." },
  ],

  quellen: [
    { titel: "Federal Statistical Office (Destatis) – rents for agricultural land rose by 9% between 2020 and 2023 (press release 153/2024, in German)" },
    { titel: "Thünen Institute – Working Paper 204: estimating the future land requirement of ground-mounted PV plants (in German)" },
    { titel: "Styrian Chamber of Agriculture – ground-mounted photovoltaics: all that glitters is not gold (in German)" },
    { titel: "EEG 2023, Section 6 – financial participation of municipalities (in German)" },
    { titel: "EEG 2023, Section 37 – bids for solar installations of the first segment (in German)" },
    { titel: "EEG 2023, Section 37c – less-favoured areas, state opening clause (in German)" },
    { titel: "Bundesnetzagentur – tenders for solar installations, first segment (in German)" },
  ],

  seitenCta: {
    titel: "What is your land worth?",
    text: "Calculate the annual and total lease with your own figures.",
    label: "To the lease calculator",
  },
  cta: {
    title: "Have your land assessed free of charge.",
    text: "In the land check, we review the location, grid connection and planning law of your land. The ÖkoInvest platform is free of charge for landowners.",
    primary: { label: "To the land check" },
    secondary: { label: "Calculate the lease yourself" },
  },
};

export default artikel;
