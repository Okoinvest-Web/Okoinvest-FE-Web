// src/lib/sprache/faktenEn.js – englische Fassung der Fakten-Texte (Fristen, Umlagen, Netzentgelte)
//
// Das Faktenregister bleibt deutsch und maßgeblich. Diese Datei liefert nur die englischen
// Anzeigetexte je Fakt-id (Titel, Text, Notiz, Textwert) und je Quellen-URL (Quellentitel).
// Fehlt eine Übersetzung, zeigen die Bausteine den deutschen Text (nie einen erfundenen Wert).
// Länderbegriffe werden erklärt statt übersetzt, z. B. „Grundversorgung (default supply)“.

import { istIsoDatum } from "@/lib/fakten/schema";

const MONATE_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONATE_KURZ_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** ISO-Datum als „1 March 2026“ */
export function datumLangEn(iso) {
  if (!istIsoDatum(iso)) return "";
  const [j, m, t] = iso.split("-").map(Number);
  return `${t} ${MONATE_EN[m - 1]} ${j}`;
}

/** ISO-Datum als „1 Mar 2026“ (eindeutig für ein internationales Publikum, statt 01/03/2026) */
export function datumKurzEn(iso) {
  if (!istIsoDatum(iso)) return "";
  const [j, m, t] = iso.split("-").map(Number);
  return `${t} ${MONATE_KURZ_EN[m - 1]} ${j}`;
}

/** „TT.MM.JJJJ“ (deutsches Kurzdatum) → „1 Mar 2026“ */
export const datumDeZuEn = (s) => {
  const m = typeof s === "string" ? s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/) : null;
  return m ? datumKurzEn(`${m[3]}-${m[2]}-${m[1]}`) : s;
};

/** Datumstext eines Termins wie terminText(), auf Englisch: „8–22 October 2026“, „expected by 31 December 2026“ */
export function terminTextEn(w) {
  if (!w) return "";
  if (w.art === "erwartet") return `expected by ${datumLangEn(w.ende)}`;
  if (w.art === "zeitraum" && w.beginn) {
    const [jb, mb] = w.beginn.split("-");
    const [je, me] = w.ende.split("-");
    if (jb === je && mb === me) return `${Number(w.beginn.slice(8, 10))}–${datumLangEn(w.ende)}`;
    if (jb === je) return `${datumLangEn(w.beginn).replace(` ${jb}`, "")} to ${datumLangEn(w.ende)}`;
    return `${datumLangEn(w.beginn)} to ${datumLangEn(w.ende)}`;
  }
  return datumLangEn(w.ende);
}

export const LAND_NAME_EN = { DE: "Germany", AT: "Austria", CH: "Switzerland", DACH: "Germany, Austria, Switzerland" };

/** Englische Texte je Fakt-id */
export const FAKTEN_EN = {
  // ---- Österreich ----
  "termin.eag.investitionszuschussCall3": {
    titel: "Deadline: 3rd EAG funding call 2026 (8–22 October)",
    text: "The 3rd funding call of 2026 for investment grants (Investitionszuschüsse) for PV systems opens on **8 October 2026 at 5 pm** with the ticket draw; applications can be submitted from 9 October (8 am) until **22 October 2026**. A ticket on its own is not yet a funding application. The EAG portal is unavailable for maintenance from 7 October (5 pm) to 9 October (8 am).",
    notiz: "Ticket draw 8 Oct 2026 from 5 pm, submission 9 Oct 2026 from 8 am until 22 Oct 2026; portal maintenance 7 Oct 5 pm to 9 Oct 8 am (announcement of 18 Sep 2026).",
  },
  "termin.eag.marktpraemieGebotstermin4": {
    titel: "Bidding date for the EAG market premium, photovoltaics (10 December 2026)",
    text: "The last bidding date of 2026 for the **EAG market premium** (Marktprämie, photovoltaics) is **10 December 2026**. Bids are submitted electronically to the EAG funding settlement agency (EAG-Förderabwicklungsstelle).",
    notiz: "Bidding dates 2026 under the EAG Market Premium Ordinance (amendment Federal Law Gazette BGBl. II No. 13/2026): 17 Mar, 11 Jun, 24 Sep, 10 Dec. Date confirmed by research; the text of the ordinance has not yet been checked against the original.",
  },
  "netzentgelt.at.sne2027": {
    notiz: "New system usage charges (Systemnutzungsentgelte) under the Electricity Industry Act (ElWG) from 1 January 2027 (E-Control): first a principles ordinance (SNE-GV), then the tariff ordinance (SNE-TV) based on it. No value and no Austrian atlas before promulgation in the Legal Information System (RIS).",
  },
  "termin.at.sneTv2027": {
    titel: "Network charges Austria 2027: new tariff ordinance expected",
    text: "The new **system usage charges** (Systemnutzungsentgelte) under the Electricity Industry Act (ElWG) are to apply from **1 January 2027**. To this end, E-Control first issues a principles ordinance (SNE-GV) and, building on it, the tariff ordinance (SNE-TV). No official promulgation date has been announced yet.",
    notiz: "According to the E-Control consultation (19 Feb 2026), the new charge structure applies from 1 Jan 2027; the relevant ElWG provisions enter into force on 31 Dec 2026. Secondary sources name issue dates (SNE-GV October, SNE-TV December 2026) – not officially confirmed.",
  },

  // ---- Schweiz ----
  "termin.pronovo.auktionRunde4": {
    titel: "Deadline: Pronovo auction round 4/2026 (18 October to 1 November)",
    text: "Bids for the fourth PV auction round of 2026 can be submitted from **18 October up to and including 1 November 2026**. The round covers 50 MW for the high one-off remuneration (HEIV, maximum bid CHF 620/kW) and 10 MW for the sliding market premium (maximum bid 10 Rp./kWh, i.e. 10 Swiss centimes). Bids can be prepared in advance in the Pronovo customer portal; the participation fee is CHF 300 per bid.",
    notiz: "According to Pronovo, the round starts on 18 Oct (the master plan stated “until 17 Oct”). HEIV 50 MW, ceiling CHF 620/kW; sliding market premium 10 MW, ceiling 10 Rp./kWh; participation fee CHF 300.",
  },
  "termin.ch.marktzugangMitteilung": {
    titel: "Deadline: market access from 2027 (notification by 31 October 2026)",
    text: "End consumers with an annual consumption of at least 100 MWh per consumption site who are still in default supply (Grundversorgung) can notify their distribution system operator by **31 October 2026** that they will use the free market from 1 January 2027. This permanently ends the network operator's obligation to supply; a return to default supply is not provided for.",
    notiz: "The deadline applies every year (Art. 11 para. 2 Electricity Supply Ordinance, StromVV); this entry covers the switch on 1 Jan 2027. To be created anew for 2027.",
  },
  "netzentgelt.ch.elcomTarife2027": {
    wert: "Tariffs per municipality and network operator, officially available from ElCom",
    notiz: "Reference to the official source only; the register does not take over any tariff values (values to be checked; check the licence of the open-data query at the original before use). Default supply tariffs, not market prices.",
  },

  // ---- Deutschland ----
  "termin.eeg.gebotsterminSolar1": {
    titel: "Bidding date EEG solar tender, first segment (1 December 2026)",
    text: "The next bidding date in the tender for **solar installations of the first segment** (ground-mounted systems) is **1 December 2026**. For the years 2023 to 2029, the Renewable Energy Sources Act (EEG) sets 1 March, 1 July and 1 December each year.",
    notiz: "Section 28a(1) sentence 1 EEG 2023: bidding dates 1 March, 1 July and 1 December (2023–2029).",
  },
  "umlage.kwkg": {
    notiz: "CHP levy (KWKG-Umlage) under Sections 10 and 11 of the Energy Financing Act (EnFG); uniform nationwide, net per kWh of final consumption.",
  },
  "umlage.offshoreNetz": {
    notiz: "Offshore grid levy under Section 17f of the Energy Industry Act (EnWG) in conjunction with the EnFG; uniform nationwide.",
  },
  "umlage.besondereNetznutzung": {
    notiz: "Basis: determination BK8-24-001-A of the Bundesnetzagentur (Federal Network Agency), para. 7. The surcharge is tiered by consumption per offtake point (first GWh and above); the 2027 tiers will be added together with the values.",
  },
  "termin.umlagen.veroeffentlichung2027": {
    titel: "Levies 2027: publication by 25 October 2026",
    text: "The transmission system operators publish the levies for 2027 (**CHP levy**, **offshore grid levy** and **surcharge for special grid use**) by **25 October 2026** on netztransparenz.de.",
    notiz: "Section 11 EnFG: publication “by 25 October of a calendar year” for the following calendar year. For the surcharge for special grid use, netztransparenz.de names the same date (para. 7 BK8-24-001-A).",
  },
  "netzentgelt.de.struktur": {
    wert: "per network operator: energy price (ct/kWh) and annual capacity price (€/kW); without load metering, energy price and, where applicable, a standing charge; plus a charge for metering point operation",
    notiz: "Structure under Section 17(2), (6) and (7) of the Electricity Network Charges Ordinance (StromNEV). Values are in the price sheet of the respective network operator; this overview deliberately does not list price sheets of individual operators. The Bundesnetzagentur is reorganising the network charge system (AgNes); changes will be added.",
  },
  "termin.netzentgelte.de.vorlaeufig2027": {
    titel: "Network charges 2027: publication by 15 October 2026",
    text: "Network operators publish their network charges for 2027 by **15 October 2026** at the latest. If they have not been finalised by then, they publish the expected level based on the revenue cap (**provisional network charges**).",
    notiz: "Section 20(1) sentences 1 and 2 EnWG.",
  },
  "termin.netzentgelte.de.endgueltig2027": {
    titel: "Network charges 2027: final charges",
    text: "Network operators publish final network charges **immediately after they have been determined**; the law does not set a separate deadline for this. The charges apply to the year 2027.",
    notiz: "Section 20(1) EnWG only names 15 October. That the final charges are available by the start of the year is common practice, but not a statutory deadline – specialist review pending.",
  },
};

/** Englische Quellentitel je URL */
export const QUELLEN_EN = {
  "https://www.eag-abwicklungsstelle.at/artikel/3-foerdercall-fuer-photovoltaikanlagen-laeuft-von-8-bis-22-oktober-2026/":
    "EAG-Abwicklungsstelle (Austrian funding settlement agency) – 3rd funding call for photovoltaic systems runs from 8 to 22 October 2026 (18 Sep 2026, in German)",
  "https://pronovo.ch/de/foerderung/photovoltaik/auktionen/": "Pronovo – PV auctions (round 4/2026, in German)",
  "https://www.fedlex.admin.ch/eli/cc/2008/226/de#art_11": "Fedlex – Electricity Supply Ordinance (StromVV, SR 734.71), Art. 11 para. 2, as at 1 July 2026 (in German)",
  "https://www.gesetze-im-internet.de/eeg_2014/__28a.html": "EEG 2023, Section 28a(1) – tender volume and bidding dates for solar installations of the first segment (in German)",
  "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012029":
    "RIS – EAG Market Premium Ordinance, consolidated federal law (amendment BGBl. II No. 13/2026, in German)",
  "https://www.gesetze-im-internet.de/enfg/__11.html": "Energy Financing Act (EnFG), Section 11 – publication of levies (in German)",
  "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/KWKG/KWKG-Umlage": "netztransparenz.de – CHP levy (transmission system operators, in German)",
  "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Offshore-Netzumlage/Offshore-Netzumlagen-%C3%9Cbersicht":
    "netztransparenz.de – offshore grid levy overview (transmission system operators, in German)",
  "https://www.netztransparenz.de/de-de/Erneuerbare-Energien-und-Umlagen/Sonstige-Umlagen/Aufschlag-f%C3%BCr-besondere-Netznutzung-19-StromNEV-Umlage":
    "netztransparenz.de – surcharge for special grid use (until 2024: Section 19 StromNEV levy, in German)",
  "https://www.gesetze-im-internet.de/enwg_2005/__20.html": "Energy Industry Act (EnWG), Section 20(1) – publication of network charges (in German)",
  "https://www.gesetze-im-internet.de/stromnev/__17.html": "Electricity Network Charges Ordinance (StromNEV), Section 17 – calculation of network charges (in German)",
  "https://www.e-control.at/documents/1785851/0/Marktkonsultation+SNE-GV+Teil+1_20260219_1v0.pdf/c37b0eeb-080d-fd5c-9c4a-86b75b5f2051?t=1771832185841":
    "E-Control – market consultation on the system usage charges principles ordinance (SNE-GV), part 1 (19 Feb 2026, in German)",
  "https://www.strompreis.elcom.admin.ch/": "ElCom – electricity price website, 2027 tariffs per municipality and network operator",
};

/** Englischer Text eines Fakt-Felds (titel | text | notiz | wert) – sonst null */
export const faktEn = (id, feld) => FAKTEN_EN[id]?.[feld] ?? null;

/** Englischer Quellentitel – sonst der deutsche */
export const quelleTitelEn = (q) => (q?.url && QUELLEN_EN[q.url]) || q?.titel || "";
