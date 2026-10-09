// src/lib/sprache/rechnerBegriffe.js – englische Fassungen von Texten, die als Daten aus
// src/lib/invest/markt.js bzw. src/lib/rechner/* kommen (Rechner, Marktdaten, Wissen).
// Die Rechenlogik bleibt unverändert; hier stehen nur Anzeige-Texte. Fehlt ein Eintrag → Deutsch.

import { PROVISION } from "../invest/markt.js";
import { fmtZahl } from "./format.js";

const z = (n, d = 0) => fmtZahl(n, d, "en");

/** Provisionstexte (PROVISION.*.text) auf Englisch. */
export function provisionTextEn(text) {
  if (text === PROVISION.verkaeufer.text)
    return `${z(PROVISION.verkaeufer.min * 100, 1)}–${z(PROVISION.verkaeufer.max * 100)}% of the purchase price, only on successful closing`;
  if (text === PROVISION.kaeufer.text) return "free of charge for investors (search profile, NDA, data room)";
  if (text === PROVISION.flaeche.text) return "always free of charge for landowners";
  return text;
}

/** „2 × 5 Jahre Option“ → „2 × 5-year option“ (Verlängerungsoptionen aus dem Faktenregister). */
export const optionEn = (text) => String(text).replace(/ Jahre Option$/, "-year option");

/** Lastprofile (src/lib/rechner/reststrom.js, auch PPA-Rechner): [Bezeichnung, Zusatz]. */
export const LASTPROFILE_EN = Object.freeze({
  einschicht: ["Single shift", "approx. 6 am–4 pm"],
  zweischicht: ["Two shifts", "approx. 6 am–10 pm"],
  dreischicht: ["Three shifts", "around the clock"],
  handel: ["Retail & office", "shop, cooling, air conditioning"],
});

/** Auswahlliste (id, label, sub) mit englischen Texten aus einer Tabelle { id: [label, sub] }. */
export const mitTexten = (liste, tabelle) => liste.map((x) => ({ ...x, label: tabelle[x.id]?.[0] ?? x.label, sub: tabelle[x.id]?.[1] ?? x.sub }));

/* Projektbewertung (src/lib/rechner/projektbewertung.js): Werttreiber, Wertminderer und Hinweise. */
const PROJEKT_TEXTE_EN = {
  "Netzkapazität vertraglich reserviert – der größte Engpass im Markt ist gelöst.": "Grid capacity contractually reserved – the biggest bottleneck in the market is solved.",
  "Netzzusage liegt schon vor der üblichen Phase vor – deutlicher Wertsprung.": "Grid commitment already in place before the usual phase – a significant jump in value.",
  "Netzzusage mit benanntem Einspeisepunkt.": "Grid commitment with a named feed-in point.",
  "Für diese Phase fehlt die Netzzusage noch – Käufer preisen Verzögerung und Kosten ein.": "The grid commitment is still missing for this phase – buyers price in delay and costs.",
  "Netzanfrage gestellt: Mit der Zusage steigt der Wert typischerweise spürbar.": "Grid request submitted: once the commitment is received, the value typically rises noticeably.",
  "Ohne Netzanfrage ist der Anschluss das zentrale Risiko – viele Käufer steigen erst mit Zusage ein.": "Without a grid request, the connection is the central risk – many buyers only come in once there is a commitment.",
  "Netzanschluss noch nicht angefragt – in vielen Regionen der Engpass Nummer eins.": "Grid connection not yet requested – the number one bottleneck in many regions.",
  "Einspeisepunkt in unmittelbarer Nähe – geringe Anschlusskosten.": "Feed-in point in the immediate vicinity – low connection costs.",
  "Lange Trasse bedeutet zusätzliche Wegerechte und Genehmigungen.": "A long cable route means additional rights of way and permits.",
  "Unter 3 MWp: Fixkosten für Netz, Gutachten und Due Diligence verteilen sich auf wenig Leistung – kleinerer Käuferkreis.": "Below 3 MWp: fixed costs for grid, surveys and due diligence are spread over little capacity – a smaller pool of buyers.",
  "Unter 8 MWp: für institutionelle Käufer oft unter der Mindestgröße.": "Below 8 MWp: often below the minimum size for institutional buyers.",
  "Ab 50 MWp: interessant für institutionelle Investoren und Portfoliokäufer.": "From 50 MWp: attractive to institutional investors and portfolio buyers.",
  "Ab 20 MWp: breiter Käuferkreis, Skaleneffekte bei Bau und Betrieb.": "From 20 MWp: a broad pool of buyers, economies of scale in construction and operation.",
  "EEG-Zuschlag gibt es nur in Deutschland – in Österreich entspricht dem die EAG-Marktprämie aus der Ausschreibung. Ein Förderaufschlag ist deshalb nicht eingerechnet.":
    "EEG awards exist only in Germany – in Austria, the equivalent is the EAG market premium from the tender (EAG: Austrian Renewable Energy Expansion Act). A subsidy premium is therefore not included.",
  "Zuschlag gesichert: 20 Jahre Marktprämie als Erlösboden – erleichtert die Finanzierung.": "Award secured: 20 years of market premium as a revenue floor – makes financing easier.",
  "Ein Zuschlag setzt in der Regel Baurecht voraus – bitte Phase prüfen.": "An award usually requires planning permission – please check the phase.",
  "Unterschriebener PPA: planbare Erlöse, erleichtert die Finanzierung.": "Signed PPA: predictable revenue, makes financing easier.",
  "Österreich: Flächenwidmung (z. B. Grünland-Photovoltaik) und Förderung nach EAG (Marktprämie bzw. Investitionszuschuss) prägen den Wert; ab bestimmten Größen ist eine UVP-Prüfung nötig.":
    "Austria: the zoning designation (Flächenwidmung, e.g. “Grünland-Photovoltaik” – green-land zoning for PV) and support under the EAG (market premium or investment grant) shape the value; above certain sizes an environmental impact assessment (UVP) check is required.",
  "Schweiz: kleiner Markt für Freiflächenprojekte, Bewilligung meist über Nutzungsplanung bzw. Solarexpress (alpine Anlagen) – Vergleichswerte sind rar, die Spanne ist unsicherer.":
    "Switzerland: a small market for ground-mounted projects; approval usually via land-use planning (Nutzungsplanung) or the “Solarexpress” scheme for alpine plants – comparable values are rare, so the range is less certain.",
  "Frühe Phase: Viele Käufer zahlen gestaffelt – ein Teil bei Signing, der Rest bei Meilensteinen (Satzungsbeschluss, RTB).": "Early phase: many buyers pay in instalments – part at signing, the rest at milestones (adoption of the development plan, RTB).",
  "Bestandsanlage: Maßgeblich sind Erlöse, Restlaufzeit von Förderung/PPA, Pachtvertrag, technischer Zustand und Ertragshistorie – der Wert folgt dem Barwert der Cashflows.":
    "Operating asset: what matters are revenue, the remaining term of subsidy/PPA, the lease, technical condition and yield history – the value follows the present value of the cash flows.",
};

/** Werttreiber/-minderer/Hinweis der Projektbewertung auf Englisch (Rückfall Deutsch). */
export function projektTextEn(text) {
  if (PROJEKT_TEXTE_EN[text]) return PROJEKT_TEXTE_EN[text];
  let m = /^Kabeltrasse ([\d,]+) km: rund (\d+) €\/kWp Mehrkosten für den Käufer\.$/.exec(text);
  if (m) return `Cable route ${m[1].replace(",", ".")} km: around €${m[2]}/kWp of additional costs for the buyer.`;
  m = /^Noch ohne Vermarktung: Zuletzt lagen EEG-Zuschläge um ([\d,]+) ct\/kWh, PPA-Preise grob zwischen ([\d,]+) und ([\d,]+) ct\/kWh\.$/.exec(text);
  if (m) return `No marketing secured yet: recent EEG awards were around ${m[1].replace(",", ".")} ct/kWh, PPA prices roughly between ${m[2].replace(",", ".")} and ${m[3].replace(",", ".")} ct/kWh.`;
  return text;
}

/** Risikostufen der Projektbewertung (Index = risikoStufe). */
export const RISIKO_EN = ["very low", "low", "medium", "medium–high", "high", "very high"];

/** Strompreis-Bestandteile und Pool-Hebel (STROM.bestandteile, STROM.poolHebel in markt.js). */
export const STROM_EN = Object.freeze({
  bestandteile: {
    beschaffung: "Procurement & sales",
    netz: "Grid fees & metering",
    umlagen: "Levies (CHP, offshore, § 19; up to 1 GWh)",
    konzession: "Concession fee",
    stromsteuer: "Electricity tax",
  },
  beschaffungPool: "Procurement & sales (pool)",
  hebel: {
    buendelung: "Pooling & structured procurement",
    ppa: "Solar power from the group’s parks (PPA)",
    flex: "Flexibility & storage in the virtual power plant",
  },
});

/** Bestandteil (id, label) auf Englisch – „(Pool)“-Fassung der Beschaffung eingeschlossen. */
export const stromTeilEn = (t) => ({ ...t, label: t.id === "beschaffung" && /Pool/.test(t.label) ? STROM_EN.beschaffungPool : STROM_EN.bestandteile[t.id] ?? t.label });
