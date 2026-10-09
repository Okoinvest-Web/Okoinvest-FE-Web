// src/data/faq-en.js – englische Fassung von src/data/faq.js (Sprachmodell)
//
// Gleiche Listen, gleiche Reihenfolge, gleiche Einträge – nur Texte. Nutzung über das Wörterbuch:
//   uebersetze({ de: FAQ_RESTSTROM, en: FAQ_RESTSTROM_EN }, sprache)
// nurDE trägt hier das englische Thema für den Länderhinweis (faqFuerLand(…, { sprache: "en" })).
// AT/CH: englische Fassung der geprüften Ländertexte aus faq.js (gleicher Inhalt).
// Zahlen kommen wie in faq.js aus src/lib/invest/markt.js, im englischen Format.

import { PACHT, AGRI, FREIFLAECHE, PROVISION, PHASEN, STROM, KOMMUNE } from "@/lib/invest/markt";
import { fmtZahl } from "@/lib/sprache/format";
import { provisionTextEn, optionEn } from "@/lib/sprache/rechnerBegriffe";

const z = (n, d = 0) => fmtZahl(n, d, "en");
const eur = (n) => `€${z(n)}`;
const ct = (n) => z(n, n < 1 ? 2 : 1);
const hebelMin = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
const hebelMax = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);
const beschaffung = STROM.bestandteile.find((b) => b.id === "beschaffung")?.ct;
const fixCt = STROM.bestandteile.filter((b) => !b.beeinflussbar).reduce((s, b) => s + b.ct, 0);
const gross = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

/* Virtuelles Kraftwerk */
export const FAQ_VPP_EN = [
  {
    q: "What is a virtual power plant?",
    a: "A virtual power plant (VPP) connects many decentralised assets – solar parks, storage systems, controllable consumers – via a shared control centre. To the outside world, the network acts like one large power plant: it can market electricity, offer flexibility and keep to schedules that a single plant could not achieve on its own.",
  },
  {
    q: "What does direct marketing mean?",
    a: "In Germany, newer plants from 100 kW generally have to sell their power directly on the exchange or via a direct marketer. In addition to the market revenue, the operator receives a market premium under the EEG (German Renewable Energy Sources Act) if the plant is subsidised. The direct marketer forecasts generation, trades the volumes and controls the plant remotely – for example when prices are negative.",
    nurDE: "Rules on direct marketing",
  },
  {
    q: "What role does storage play in the virtual power plant?",
    a: "Storage shifts solar power from the midday peak into the expensive evening hours, smooths forecast errors and can offer balancing capacity. In the network, quarter-hours with low or negative prices can thus be used in a targeted way – benefiting both the parks’ revenues and procurement for the residual power pool.",
  },
  {
    q: "What does Redispatch 2.0 have to do with the virtual power plant?",
    a: "Since October 2021, generation plants from 100 kW have also been included in grid operators’ congestion management in Germany. Operators must report master data, planning data and unavailability, and implement curtailment. In a well-organised network these processes are bundled, usually together with the direct marketer acting as the party responsible for dispatch.",
    nurDE: "Rules on grid congestion management",
  },
  {
    q: "Can I bring my own plant into the virtual power plant?",
    a: "In principle yes, if the plant can be controlled remotely and has quarter-hourly metering. We check case by case whether integration is economically worthwhile – for small plants, the costs of metering and control can exceed the benefit. Contact us via the form.",
  },
  {
    q: "Is ÖkoInvest an energy supplier?",
    a: "No. ÖkoInvest develops solar power plants and organises the network and joint procurement. Electricity is supplied by a licensed energy supplier or balance responsible party with whom we work. You receive a regular supply contract for this.",
  },
];

/* Reststrom-Pool */
export const FAQ_RESTSTROM_EN = [
  {
    q: "What is residual power?",
    a: "Residual power is the electricity a business still has to draw from the grid despite its own photovoltaics and storage – at night, in winter, in bad weather or during shifts outside sunshine hours. For most businesses, this remains the larger part of consumption.",
  },
  {
    q: "How much can I save with the pool?",
    a: `The pool acts on the procurement component of your electricity price (in our estimate around ${ct(beschaffung)} ct/kWh net for new contracts in 2026). From pooling, solar PPAs and flexibility, we consider a combined saving of about ${ct(hebelMin)} to ${ct(hebelMax)} ct/kWh achievable – depending on load profile, volume and market situation. Grid fees, levies and taxes (together around ${ct(fixCt)} ct/kWh) are not negotiable. The residual power calculator shows your personal range.`,
    nurDE: "Savings figures",
  },
  {
    q: "Do I need a plant from ÖKOVOLT to take part?",
    a: "No. The pool grew out of the customers for whom ÖKOVOLT builds photovoltaics and storage – but it is also open to businesses without their own plant. With your own PV and storage, however, your profile becomes more attractive for the pool, because you already cover load peaks and midday consumption yourself.",
  },
  {
    q: "From what consumption level is the pool worthwhile?",
    a: "As a guide, from about 100 MWh annual consumption. In Germany, from 100,000 kWh a recording load meter (RLM) with quarter-hourly values is usually installed – this makes structured procurement easier. We are also happy to review smaller businesses with a standard load profile (SLP), but the lever there is usually smaller.",
  },
  {
    q: "How does switching to the pool work?",
    a: "You send us your load profile or annual consumption and your current contract. We analyse the profile and price components, prepare an offer and, if you wish, handle the termination. The notice periods of your existing contract are decisive – many commercial contracts run to the calendar year and have to be terminated months in advance.",
  },
  {
    q: "Who supplies the power and who is liable for it?",
    a: "Supply is handled by a licensed energy supplier that manages the balancing group. ÖkoInvest pools demand, contributes solar power from the group’s parks and steers the procurement strategy. Your supply contract regulates prices, term and security of supply like any other electricity supply contract.",
  },
  {
    q: "What does the electricity tax relief from 2026 mean?",
    a: `Since 2026, manufacturing businesses and agriculture and forestry in Germany only pay the EU minimum rate of ${ct(STROM.stromsteuerProduzierend)} ct/kWh instead of ${ct(STROM.bestandteile.find((b) => b.id === "stromsteuer")?.ct)} ct/kWh for electricity used in their operations. The relief is not automatic; it is applied for at the main customs office (Hauptzollamt). It is not a service of the pool, but belongs in any honest price calculation.`,
    nurDE: "Electricity tax rules",
  },
  {
    q: "Does the pool protect me against rising electricity prices?",
    a: "It reduces the risk but does not eliminate it. Instead of buying the entire annual requirement on a single date, the pool procures in several tranches over a longer period. This smooths out price peaks. If wholesale prices rise permanently, the pool price also rises – just less abruptly.",
  },
  {
    q: "Is the pool also available in Austria and Switzerland?",
    a: "We are starting with Germany, because that is where most of the group’s pool customers are based. In Austria, renewable energy communities offer additional options. In Switzerland, end consumers only have free access to the electricity market from 100 MWh annual consumption – below that, they remain in the regulated basic supply. Feel free to contact us about AT and CH; we will look at the options case by case.",
  },
];

/* Energiegemeinschaften */
export const FAQ_GEMEINSCHAFT_EN = [
  {
    q: "What is energy sharing under § 42c EnWG?",
    a: "Since 1 June 2026, final consumers in Germany have been able to share power from jointly operated renewable energy plants via the public grid (§ 42c EnWG, German Energy Industry Act) – initially within the balancing area of a distribution system operator, and from 1 June 2028 also in adjacent areas of the same control area. Shared power is not self-consumption: as things stand, grid fees and levies still apply. Some grid operators have announced that they will only be able to implement the processing technically at a later date.",
    nurDE: "Rules on energy sharing",
  },
  {
    q: "In Austria, what is the difference between an EEG and a BEG?",
    a: "Renewable energy communities (EEG – Erneuerbare-Energie-Gemeinschaft) are limited to a nearby grid area and in return receive reduced grid fees on the shared power – until the end of 2026, 57% locally and 28% regionally (grid levels 6/7) on the energy charge of the grid usage fee. Citizens’ energy communities (BEG – Bürgerenergiegemeinschaft) may operate throughout Austria but have so far received no grid fee reduction. Since 1 October 2026, the Electricity Industry Act (ElWG) has governed the joint use of energy; existing communities continue. New models receive no reduced grid fees until the end of 2026; from 2027 the reductions are also to apply to local and regional BEGs under the new system usage fees ordinance – the rates have not yet been published.",
  },
  {
    q: "What is an LEG in Switzerland?",
    a: "Since 1 January 2026, end consumers, producers and storage operators within the same municipality can join together in a local electricity community (LEG – lokale Elektrizitätsgemeinschaft) and share locally generated power via the distribution grid. There is a discount on the grid usage fee for the shared power – 40% on the same grid level, 20% across several grid levels. In addition, the self-consumption association (ZEV) and the virtual ZEV (vZEV) without use of the public grid continue to exist.",
  },
  {
    q: "Can a solar park supply an energy community?",
    a: "In Austria and Switzerland, in principle yes, provided the park and participants are within the permitted vicinity. In Germany, energy sharing requires the plant to be allocated to the participating consumers – for example because they own it jointly or operate it. Participation via a cooperative can be the key here. We check this for each site.",
  },
  {
    q: "What role does ÖkoInvest play in an energy community?",
    a: "We contribute power from the group’s parks, support formation, articles of association and registration with the grid operator and – as planned – can take over ongoing billing and allocation of quantities as a service provider. The community itself belongs to its members.",
  },
  {
    q: "Do I need a smart meter?",
    a: "Yes – in all three countries, shared quantities are allocated per quarter-hour. This requires a smart meter or intelligent metering system with quarter-hourly values, which the grid operator installs.",
  },
];

/* Genossenschaft */
export const FAQ_GENOSSENSCHAFT_EN = [
  {
    q: "Does the energy cooperative already exist?",
    a: "The cooperative is being set up. You can register your interest without obligation – we will inform you as soon as the articles of association, participation documents and the first project are in place. Subscribing to shares via the website is not possible and is not planned without you having received all documents beforehand.",
  },
  {
    q: "Who can become a member?",
    a: "The plan is a cooperative for citizens from the host regions, farmers and landowners, municipalities and businesses. Farmers who make land available for a park should be able to become members on a preferential basis.",
  },
  {
    q: "How does co-determination work?",
    a: "In a cooperative, each member basically has one vote – regardless of how many shares they hold (§ 43 GenG, German Cooperatives Act). The general meeting elects the supervisory board and decides on the annual financial statements and the use of any surplus.",
  },
  {
    q: "What risks does a participation involve?",
    a: "A cooperative participation is entrepreneurial capital. In the worst case, the contribution can be lost entirely. Shares are not listed on an exchange and are only transferable to a limited extent; termination is subject to notice periods set out in the articles of association. There is no statutory deposit protection. Distributions are not guaranteed and depend on the results and on resolutions of the general meeting.",
  },
  {
    q: "What return can I expect?",
    a: "We deliberately make no commitments on this. How high any surplus turns out to be depends on the yields, electricity prices, financing and costs of the parks in which the cooperative participates. This page is neither investment advice nor an offer to acquire shares.",
  },
  {
    q: "Does the cooperative need a prospectus?",
    a: "In Germany, shares in registered cooperatives are exempt from the prospectus requirement under the Capital Investment Act (Vermögensanlagengesetz) under certain conditions – among others, if no success-related remuneration is paid for their distribution. Members must nevertheless receive the key information in advance. Separate rules apply in Austria and Switzerland. We will have the specific structure legally reviewed before the launch.",
  },
  {
    q: "Who audits the cooperative?",
    a: "In Germany, registered cooperatives must be members of a cooperative auditing association, which regularly audits management and financial circumstances. In Austria, an auditing association (Revisionsverband) performs this task. This is considered one of the reasons why cooperatives are among the legal forms with the fewest insolvencies – but it is not a guarantee.",
  },
];

/* Prozess */
export const FAQ_PROZESS_EN = [
  {
    q: "How long does it take from the land to the finished solar park?",
    a: "Realistically two to four years. The biggest blocks of time are the planning law process (development plan – B-Plan – in Germany, rezoning in Austria) and the grid connection commitment. Construction itself usually takes only a few months. We take around 50 MWp per year into new development – these projects usually only become ready to build years later.",
    AT: { a: "Realistically two to four years. The biggest blocks of time are the rezoning of the land (Umwidmung) under the regional planning law of the federal state and the grid connection commitment. Construction itself usually takes only a few months. We take around 50 MWp per year into new development – these projects usually only become ready to build years later." },
    CH: { a: "In Switzerland, this depends mainly on the permit from the municipality and canton and on the grid connection commitment; we only give a reliable duration after reviewing the site. Construction itself usually takes only a few months. We take around 50 MWp per year into new development – these projects usually only become ready to build years later." },
  },
  {
    q: "What do I see in the portal?",
    a: "Your case with its current status, all documents (contracts, reports, plans), messages with your contact person and the next steps. Enquiries you made before registering appear automatically if you register with the same email address.",
  },
  {
    q: "What does working with you cost me?",
    a: `${gross(provisionTextEn(PROVISION.flaeche.text))}; investors use the project exchange ${provisionTextEn(PROVISION.kaeufer.text).replace(/ for investors/, "")}. Sellers of projects pay ${provisionTextEn(PROVISION.verkaeufer.text)}.`,
  },
  {
    q: "What happens if the project fails?",
    a: "It happens – for example if the municipal council does not pass a resolution to draw up a development plan or no grid connection is possible. Landowners incur no costs as a result; the land use agreement regulates when it ends. In the portal you can see at any time what phase your project is in and what it is currently waiting for.",
    AT: { a: "It happens – for example if the municipality does not rezone the land or no grid connection is possible. Landowners incur no costs as a result; the land use agreement regulates when it ends. In the portal you can see at any time what phase your project is in and what it is currently waiting for." },
    CH: { a: "It happens – for example if the municipality or canton does not grant a permit or no grid connection is possible. Landowners incur no costs as a result; the land use agreement regulates when it ends. In the portal you can see at any time what phase your project is in and what it is currently waiting for." },
  },
];

/* Kontakt */
export const FAQ_KONTAKT_EN = [
  {
    q: "How quickly will I get an answer?",
    a: "Every enquiry is created as a case and assigned to a responsible person for your country, who will contact you personally. You can see the status in the portal after registering.",
  },
  {
    q: "Why is there no telephone number on the website?",
    a: "We are currently setting up the platform’s customer service. So that no enquiry gets lost, all requests currently go through the forms and the portal. If you would like a call back, enter your number in the form – we will get in touch.",
  },
  {
    q: "Which documents should I have ready?",
    a: "For land: plot numbers or a map extract, size and current use. For the residual power pool: annual consumption or load profile and your current electricity contract. For projects: development stage, grid request and land security. You can upload everything else later in the portal.",
  },
  {
    q: "Can I visit you in Ostermiething?",
    a: "Gladly, by appointment. Write to us via the form and tell us when suits you – unfortunately we cannot always accommodate spontaneous visits.",
  },
];

/* Zentrale FAQ-Seite: Gruppen */
const FLAECHE_EN = [
  {
    q: "Which land is suitable for a solar park?",
    a: `From about ${z(FREIFLAECHE.mindestHa)} ha, a solar park usually becomes economically viable; contiguous plots of 10 ha or more are much better. Other decisive factors are the distance to the grid connection point, protected areas, slope and shading. In Germany, land in disadvantaged areas and strips of up to 500 m along motorways and railway lines are particularly sought after; along these routes, a 200 m corridor also enjoys privileged status under building law.`,
  },
  {
    q: "How much lease will I receive for my land?",
    a: `For ground-mounted photovoltaics in Germany, currently mostly ${eur(PACHT.freiflaecheProHa.min)}–${eur(PACHT.freiflaecheProHa.max)} per hectare per year is paid, in many cases around ${eur(PACHT.freiflaecheProHa.mittel)}. The amount depends mainly on the grid connection, irradiation, plot size and remuneration model. Annual indexation and a reservation fee until construction are usual.`,
    nurDE: "Lease rates",
  },
  {
    q: "How long does a lease contract for a solar park run?",
    a: `${PACHT.laufzeit} years from commissioning is usual, often with extension options (${optionEn(PACHT.verlaengerung)}). The contract also regulates complete decommissioning at the end of use – secured by a decommissioning bond or reserve.`,
  },
  {
    q: "What does checking my land cost me?",
    a: `Nothing – the platform is ${provisionTextEn(PROVISION.flaeche.text)}. You can complete the land check online in a few minutes; our project team carries out the detailed review.`,
  },
  {
    q: "Does my land lose its status as agricultural assets?",
    a: "The German Annual Tax Act 2024 improved the situation for leased PV land in Germany: under certain conditions, it remains classified as agricultural and forestry assets for inheritance and property tax. The details depend on the farm – please coordinate this with your tax adviser.",
    nurDE: "Tax rules",
  },
];

const LANDWIRTE_EN = [
  {
    q: "What distinguishes agrivoltaics from a normal solar park?",
    a: `With agrivoltaics, the land remains in agricultural use. Under DIN SPEC 91434, the structures may take up at most ${z(AGRI.flaechenverlustMaxKat1 * 100)}% (category 1) or ${z(AGRI.flaechenverlustMaxKat2 * 100)}% (category 2) of the area, and the agricultural yield must reach at least ${z(AGRI.mindestErtrag * 100)}% of the reference yield.`,
    nurDE: "Rules for agrivoltaics",
  },
  {
    q: "Will I continue to receive CAP direct payments for agrivoltaic land?",
    a: `In Germany, agrivoltaic land that meets the requirements of DIN SPEC 91434 usually remains ${z(AGRI.gapFoerderfaehig * 100)}% eligible for the CAP (Common Agricultural Policy). For conventional ground-mounted plants, by contrast, eligibility is usually lost.`,
    nurDE: "Subsidy rules for agrivoltaics",
  },
  {
    q: "What options do I have as a farmer?",
    a: "Three ways: you lease the land and continue farming under the modules; you invest yourself and operate the plant; or an investor builds and operates the plant while you participate as a member via the planned energy cooperative. The agrivoltaics calculator compares the options.",
  },
  {
    q: "Do I need a development plan for agrivoltaics?",
    a: `Not always. In Germany, agrivoltaic plants with a spatial and functional link to an agricultural or forestry business enjoy privileged status in the outer area up to a footprint of ${z(AGRI.privilegierungHa, 1)} ha (§ 35(1) no. 9 BauGB, German Federal Building Code). Larger plants usually need a development plan (B-Plan).`,
    nurDE: "Permit rules for agrivoltaics",
  },
  {
    q: "How high is the lease for agrivoltaics?",
    a: `Because farming remains on the land, the lease is usually lower than for a pure solar park – as a guide ${eur(PACHT.agriProHa.min)}–${eur(PACHT.agriProHa.max)} per hectare per year. In return, you keep the harvest and usually most of the direct payments.`,
    nurDE: "Lease rates",
  },
];

const INVESTOREN_EN = [
  {
    q: "Which projects will I find on the project exchange?",
    a: `Projects in all phases – from secured land through planning permission to ready-to-build projects (RTB) and operating assets. Risk and price differ considerably by phase: from around €${z(PHASEN[0].preisProKwp.min)}/kWp for secured land to €${z(PHASEN[4].preisProKwp.max)}/kWp for ready-to-build projects.`,
    nurDE: "Market ranges per kWp",
  },
  {
    q: "What does the project exchange cost investors?",
    a: `It is ${provisionTextEn(PROVISION.kaeufer.text)}. The seller pays the fee – and only on successful closing.`,
  },
  {
    q: "How do I get details and documents for a project?",
    a: "Publicly, you see an anonymised exposé teaser. After registering and signing a non-disclosure agreement (NDA), you receive access to the site data and data room.",
  },
  {
    q: "What return does a solar park bring?",
    a: "That depends on the purchase price, construction costs, remuneration model (EEG award or PPA), financing and location. We do not promise returns. The solar park return calculator shows project and equity returns for your own assumptions.",
    AT: { a: "That depends on the purchase price, construction costs, remuneration model (market premium or investment grant under the EAG – Austrian Renewable Energy Expansion Act – or a PPA), financing and location. We do not promise returns. We prepare a calculation with figures for Austria on request." },
    CH: { a: "That depends on the purchase price, construction costs, remuneration model (one-off remuneration or market premium via Pronovo, or a power purchase agreement), financing and location. We do not promise returns. We prepare a calculation with figures for Switzerland on request." },
  },
  {
    q: "How large is ÖkoInvest’s pipeline?",
    a: "We take around 50 MWp per year into new development. It usually takes several years until these projects are ready to build – which is why we deliberately do not state completion figures.",
  },
];

const PROJEKTBOERSE_EN = [
  {
    q: "What does it cost to list a project?",
    a: `Listing is free of charge. Sellers pay ${provisionTextEn(PROVISION.verkaeufer.text)}.`,
  },
  {
    q: "Which documents do I need for a listing?",
    a: "At a minimum: location and size, status of land security, grid request or commitment and the status of planning law. You can upload reports, plans and contracts to the data room later – they are only released after an NDA.",
  },
  {
    q: "Does my project remain confidential?",
    a: "Yes. Publicly, only an anonymised teaser without the exact location appears. Only those who are registered and have accepted the non-disclosure agreement see details. If you wish, we present your project only to selected investors.",
  },
  {
    q: "How is the price of my project assessed?",
    a: "The decisive factors are the development phase, grid connection, size, remuneration model and location. The project valuation shows usual ranges per kWp; you receive a reliable assessment after a review by our team.",
  },
];

const STROM_POOL_EN = [
  FAQ_RESTSTROM_EN[0],
  FAQ_RESTSTROM_EN[1],
  FAQ_RESTSTROM_EN[2],
  FAQ_RESTSTROM_EN[3],
  FAQ_RESTSTROM_EN[6],
  FAQ_VPP_EN[0],
  FAQ_VPP_EN[5],
  FAQ_GEMEINSCHAFT_EN[0],
  FAQ_GENOSSENSCHAFT_EN[0],
  {
    q: "How do municipalities benefit from a solar park?",
    a: `In Germany, operators may voluntarily pay the host municipality up to ${z(KOMMUNE.beteiligungCt, 1)} ct per kWh fed into the grid under § 6 EEG; several federal states now require a participation by state law. In addition, ${z(KOMMUNE.gewerbesteuerStandort * 100)}% of a solar park’s trade tax goes to the host municipality. The municipal calculator shows the order of magnitude for your project.`,
    nurDE: "Rules on municipal participation",
  },
];

const PORTAL_EN = [
  {
    q: "What do I need portal access for?",
    a: "In the portal you see the status of your enquiries and projects, upload and download documents and write directly to your contact person. Investors manage their search profile, NDAs and data rooms there.",
  },
  {
    q: "Does the portal cost anything?",
    a: "No. Registration and use are free of charge. Fees are only payable by sellers on the project exchange and only on successful closing.",
  },
  {
    q: "I have already made an enquiry – will I see it in the portal?",
    a: "Yes. Register with the same email address you entered in the form. Your enquiry will then appear automatically as a case with its status.",
  },
  {
    q: "What happens to my data?",
    a: "We only process your details in order to handle your enquiry and support the project. We only pass on project data with your consent and – in the case of investors – only after a signed non-disclosure agreement. Details can be found in the privacy policy.",
  },
  {
    q: "Can I delete my account again?",
    a: "Yes. You can request the deletion of your account at any time. Data that we have to retain for legal reasons (such as contracts) is blocked until the end of the retention period and then deleted.",
  },
];

/** Gruppen der zentralen FAQ-Seite auf Englisch (gleiche ids und Reihenfolge wie FAQ_GRUPPEN). */
export const FAQ_GRUPPEN_EN = [
  { titel: "Landowners", items: FLAECHE_EN },
  { titel: "Farmers", items: LANDWIRTE_EN },
  { titel: "Investors", items: INVESTOREN_EN },
  { titel: "Project exchange", items: PROJEKTBOERSE_EN },
  { titel: "Power & pool", items: STROM_POOL_EN },
  { titel: "Portal & privacy", items: PORTAL_EN },
];
