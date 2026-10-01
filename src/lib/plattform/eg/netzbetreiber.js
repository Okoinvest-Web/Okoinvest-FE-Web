// src/lib/plattform/eg/netzbetreiber.js
//
// Stammdaten der österreichischen Verteilnetzbetreiber für Energiegemeinschaften (Fachkonzept 2.3, 3.2). Reine Daten +
// Helfer. Python-Spiegel: plattform/eg_stamm_kern.py (NETZBETREIBER, Abgleich im Test).
//
// Kennungen: `nbNummer` = Ziffern 3–8 der Zählpunktnummer, `marktpartnerId` = EDA-Adresse des Netzbetreibers („AT“ +
// nbNummer). Beide sind nur dort eingetragen, wo sie in öffentlich zugänglichen Unterlagen (Zählpunkte auf Netzrechnungen,
// Fachkonzept) erkennbar sind, und stehen auf „zu_bestaetigen“, bis sie gegen das ebUtilities-Marktpartnerverzeichnis
// geprüft sind. Leere Nummer = offen; der Zählpunkt eines Mitglieds liefert sie dann (Hinweis in zaehlpunktPruefen).
// Kontaktwege laut Koordinationsstelle (Schritt 5) bzw. Netzbetreiberseiten – Formulare und Fristen vor Einsatz prüfen.
// Netzentgelte (`netzentgeltAp`) je Netzbereich aus der SNE-V pflegen; bis dahin leer (Ersparnis-Schätzung nutzt den
// Standardwert aus src/lib/invest/markt.js GEMEINSCHAFTEN.rechner.at.netzAp).

export const NETZBETREIBER_STAND = "2026-10-01";
const KOORD = "https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber/";

/** @type {import("./modell.js").EgNetzbetreiber[]} */
export const NETZBETREIBER = [
  { id: "ENB-WIEN", nbNummer: "001000", nbNummerStatus: "zu_bestaetigen", name: "Wiener Netze GmbH", kurzname: "Wiener Netze", bundesland: ["W"], vertragsweg: "email", kontaktEmail: "energiegemeinschaften@wienernetze.at", portalUrl: "", formularUrl: "", besonderheiten: "Daten bzw. Vertrag per E-Mail.", quelle: KOORD },
  { id: "ENB-NOE", nbNummer: "002000", nbNummerStatus: "zu_bestaetigen", name: "Netz Niederösterreich GmbH", kurzname: "Netz NÖ", bundesland: ["N"], vertragsweg: "email", kontaktEmail: "", portalUrl: "https://netz-noe.at/strom/energiegemeinschaften/eeg-erneuerbare-energie-gemeinschaft", formularUrl: "", besonderheiten: "Datenübermittlung per E-Mail nach Schritt-für-Schritt-Anleitung; eigene Seiten für EEG, BEG und GEA.", quelle: "https://netz-noe.at/strom/energiegemeinschaften/eeg-erneuerbare-energie-gemeinschaft" },
  { id: "ENB-OOE", nbNummer: "003000", nbNummerStatus: "zu_bestaetigen", name: "Netz Oberösterreich GmbH", kurzname: "Netz OÖ", bundesland: ["O"], vertragsweg: "formular", kontaktEmail: "", portalUrl: "", formularUrl: "", besonderheiten: "Online-Formular „Anmeldung Ihrer Energiegemeinschaft beim Netzbetreiber“.", quelle: KOORD },
  { id: "ENB-LINZ", nbNummer: "", nbNummerStatus: "offen", name: "LINZ NETZ GmbH", kurzname: "LINZ NETZ", bundesland: ["O"], vertragsweg: "formular", kontaktEmail: "", portalUrl: "https://www.linznetz.at/portal/de/home/strom/mein_stromanschluss/erzeugungsanlage_anschliessen/energiegemeinschaften/umsetzung", formularUrl: "", besonderheiten: "Eigene Seite zur Umsetzung von Energiegemeinschaften.", quelle: "https://www.linznetz.at/portal/de/home/strom/mein_stromanschluss/erzeugungsanlage_anschliessen/energiegemeinschaften/umsetzung" },
  { id: "ENB-BGLD", nbNummer: "", nbNummerStatus: "offen", name: "Netz Burgenland GmbH", kurzname: "Netz Burgenland", bundesland: ["B"], vertragsweg: "email", kontaktEmail: "info.energiegemeinschaften@netzburgenland.at", portalUrl: "", formularUrl: "", besonderheiten: "Vertragsvorlage herunterladen und per E-Mail senden.", quelle: KOORD },
  { id: "ENB-STMK", nbNummer: "", nbNummerStatus: "offen", name: "Energienetze Steiermark GmbH", kurzname: "Energienetze Steiermark", bundesland: ["St"], vertragsweg: "email", kontaktEmail: "energiegemeinschaften@e-netze.at", portalUrl: "https://www.e-netze.at/Strom/Energiegemeinschaften/Default.aspx", formularUrl: "", besonderheiten: "RC-Nummer und Partnerdaten per E-Mail.", quelle: "https://www.e-netze.at/Strom/Energiegemeinschaften/Default.aspx" },
  { id: "ENB-GRAZ", nbNummer: "", nbNummerStatus: "offen", name: "Stromnetz Graz GmbH & Co KG", kurzname: "Stromnetz Graz", bundesland: ["St"], vertragsweg: "email", kontaktEmail: "", portalUrl: "", formularUrl: "", besonderheiten: "Städtischer Verteilnetzbetreiber – Ablauf einzeln klären.", quelle: KOORD },
  { id: "ENB-SBG", nbNummer: "", nbNummerStatus: "offen", name: "Salzburg Netz GmbH", kurzname: "Salzburg Netz", bundesland: ["S"], vertragsweg: "formular", kontaktEmail: "", portalUrl: "", formularUrl: "", besonderheiten: "Formular zur Anforderung des Vertrags.", quelle: KOORD },
  { id: "ENB-TIROL", nbNummer: "", nbNummerStatus: "offen", name: "TINETZ-Tiroler Netze GmbH", kurzname: "TINETZ", bundesland: ["T"], vertragsweg: "email", kontaktEmail: "netzanschluss@tinetz.at", portalUrl: "", formularUrl: "https://www.tinetz.at/uploads/tx_bh/334/formular-tinetz-vertrag_vnb-mit-betreiber-eeg.pdf", besonderheiten: "Unterschriebenen Vertrag „Betrieb einer EEG“ per E-Mail.", quelle: "https://www.tinetz.at/uploads/tx_bh/334/formular-tinetz-vertrag_vnb-mit-betreiber-eeg.pdf" },
  { id: "ENB-IKB", nbNummer: "", nbNummerStatus: "offen", name: "Innsbrucker Kommunalbetriebe AG (Netz)", kurzname: "IKB", bundesland: ["T"], vertragsweg: "email", kontaktEmail: "", portalUrl: "", formularUrl: "", besonderheiten: "Städtischer Verteilnetzbetreiber – Ablauf einzeln klären.", quelle: KOORD },
  { id: "ENB-KTN", nbNummer: "", nbNummerStatus: "offen", name: "KNG-Kärnten Netz GmbH", kurzname: "Kärnten Netz", bundesland: ["K"], vertragsweg: "portal", kontaktEmail: "", portalUrl: "", formularUrl: "", besonderheiten: "Antrag im Kundenportal „Mein Portal“, Vertrag wird zugesandt.", quelle: KOORD },
  { id: "ENB-VBG", nbNummer: "", nbNummerStatus: "offen", name: "Vorarlberger Energienetze GmbH", kurzname: "Vorarlberg Netz", bundesland: ["V"], vertragsweg: "post", kontaktEmail: "energiegemeinschaft@vorarlbergnetz.at", portalUrl: "", formularUrl: "", besonderheiten: "Vorlage herunterladen, per Post (Weidachstraße 10, 6900 Bregenz) oder E-Mail.", quelle: KOORD },
].map((x) => ({ marktpartnerId: x.nbNummer ? `AT${x.nbNummer}` : "", plzListe: [], netzentgeltAp: [], ...x }));

export const BUNDESLAENDER = { W: "Wien", N: "Niederösterreich", O: "Oberösterreich", S: "Salzburg", T: "Tirol", V: "Vorarlberg", K: "Kärnten", St: "Steiermark", B: "Burgenland" };

/** Netzbetreiber zu einer Zählpunktnummer (Ziffern 3–8) – null, wenn nicht hinterlegt */
export function netzbetreiberFuerZaehlpunkt(zp, liste = NETZBETREIBER) {
  const nr = String(zp || "").toUpperCase().replace(/\s/g, "").slice(2, 8);
  return /^\d{6}$/.test(nr) ? liste.find((x) => x.nbNummer === nr) || null : null;
}
export const netzbetreiberVon = (id, liste = NETZBETREIBER) => liste.find((x) => x.id === id) || null;
