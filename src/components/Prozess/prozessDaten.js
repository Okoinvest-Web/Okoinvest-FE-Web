// Der Weg von der Anfrage bis zum Betrieb – je Zielgruppe.
// Dauern sind typische Spannen (DACH, Stand 2026), keine Zusagen.
// `portal`: Statusstufe, die im Portal angezeigt wird.
// `monate`: [min, max] – dieselbe Spanne wie `dauer`, als Zahl für Diagramme.

import { PACHT, PROVISION, AGRI } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";
import { fmtZahl } from "@/lib/sprache/format";
import { zusammenfuehren } from "@/lib/sprache/woerterbuch";

export const ZIELGRUPPEN = [
  {
    id: "flaeche",
    label: "Flächeneigentümer",
    icon: "MapPinned",
    gesamt: "2–4 Jahre bis zum Betrieb",
    intro: "Sie stellen eine Fläche zur Verfügung, wir entwickeln, bauen und betreiben den Solarpark. Für Sie entstehen keine Kosten.",
    cta: { label: "Flächencheck starten", href: pfad("/flaechencheck") },
    schritte: [
      {
        titel: "Flächencheck & Anfrage",
        dauer: "5 Minuten online, danach persönliche Rückmeldung",
        sie: "Lage, Größe und Nutzung angeben – Flurstücke genügen.",
        wir: "Erste Prüfung von Netzentfernung, Schutzgebieten und Planungsrecht.",
        portal: "Eingegangen",
        dokumente: ["Kartenausschnitt oder Flurstücksliste"],
      },
      {
        titel: "Standortprüfung",
        dauer: "2–6 Wochen",
        monate: [0.5, 1.5],
        sie: "Fragen zu Zufahrt, Leitungen und Bewirtschaftung beantworten.",
        wir: "Netzanfrage, Restriktionen, Gespräch mit der Gemeinde, Ertragsprognose.",
        portal: "In Prüfung",
        dokumente: ["Prüfbericht mit Ampel", "Skizze der möglichen Anlage"],
      },
      {
        titel: "Pachtangebot & Nutzungsvertrag",
        dauer: "2–8 Wochen",
        monate: [0.5, 2],
        sie: "Angebot prüfen – gern mit Anwalt oder Steuerberatung.",
        wir: `Pachtangebot (Orientierung ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha und Jahr), Vertragsentwurf, Rückbausicherheit.`,
        portal: "Vertrag",
        dokumente: ["Pachtangebot", "Nutzungsvertrag", "Bewilligung der Dienstbarkeit"],
      },
      {
        titel: "Planung & Genehmigung",
        dauer: "12–30 Monate",
        monate: [12, 30],
        sie: "Dienstbarkeit notariell bewilligen, bei Bedarf Termine in der Gemeinde.",
        wir: "Gutachten, Bebauungsplan (DE) bzw. Umwidmung (AT), Netzanschlusszusage, Vergütung oder PPA.",
        portal: "Genehmigung",
        dokumente: ["Aufstellungsbeschluss", "Gutachten", "Satzungsbeschluss / Widmung", "Netzzusage"],
      },
      {
        titel: "Bau",
        dauer: "3–6 Monate",
        monate: [3, 6],
        sie: "Nichts – Zufahrt und Termine stimmen wir mit Ihnen ab.",
        wir: "Bau mit Rammtechnik der Gruppe, Netzanschluss, Inbetriebnahme.",
        portal: "Bau",
        dokumente: ["Bauzeitenplan", "Übergabeprotokoll"],
      },
      {
        titel: "Betrieb",
        dauer: `${PACHT.laufzeit} Jahre + Optionen`,
        sie: "Pacht jährlich erhalten.",
        wir: "Betriebsführung, Wartung, Pflege der Fläche, am Ende vollständiger Rückbau.",
        portal: "In Betrieb",
        dokumente: ["Pachtabrechnung", "Jahresbericht"],
      },
    ],
  },
  {
    id: "landwirt",
    label: "Landwirt",
    icon: "Tractor",
    gesamt: "1,5–3 Jahre bis zum Betrieb",
    intro: "Agri-PV: Die Fläche bleibt landwirtschaftlich genutzt. Sie wählen, ob Sie verpachten, selbst investieren oder sich beteiligen.",
    cta: { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") },
    schritte: [
      {
        titel: "Anfrage & Agri-Check",
        dauer: "Persönliche Rückmeldung",
        sie: "Fläche, Kulturen und Fruchtfolge beschreiben.",
        wir: "Eignung für vertikale oder hoch aufgeständerte Agri-PV, Netz, Planungsrecht.",
        portal: "Eingegangen",
        dokumente: ["Flächenverzeichnis", "Fotos der Fläche"],
      },
      {
        titel: "Modell wählen",
        dauer: "2–6 Wochen",
        sie: "Verpachten, selbst investieren oder Investor + Mitgliedschaft in der Genossenschaft.",
        wir: "Wirtschaftlichkeit der drei Wege im Vergleich, inklusive Direktzahlungen.",
        portal: "Angebot",
        dokumente: ["Vergleichsrechnung", "Angebot je Modell"],
      },
      {
        titel: "Bewirtschaftungskonzept",
        dauer: "4–8 Wochen",
        sie: "Maschinenbreiten, Kulturen und Arbeitsgänge einbringen.",
        wir: `Anlagendesign nach DIN SPEC 91434 (mind. ${fmt(AGRI.mindestErtrag * 100)} % landwirtschaftlicher Ertrag), Reihenabstände, Durchfahrtshöhen.`,
        portal: "Konzept",
        dokumente: ["Agri-PV-Konzept", "Nachweis DIN SPEC 91434"],
      },
      {
        titel: "Genehmigung",
        dauer: "3–24 Monate",
        sie: "Mitwirkung bei Antrag bzw. Gemeindebeteiligung.",
        wir: `Bauantrag (privilegiert bis ${fmt(AGRI.privilegierungHa, 1)} ha mit Hofbezug) oder B-Plan, Netzanschluss, Vergütung.`,
        portal: "Genehmigung",
        dokumente: ["Bauantrag / B-Plan-Unterlagen", "Netzzusage"],
      },
      {
        titel: "Bau im Takt der Fruchtfolge",
        dauer: "2–5 Monate",
        sie: "Bauzeitfenster nach Ernte oder vor der Aussaat abstimmen.",
        wir: "Montage mit bodenschonender Rammtechnik, Inbetriebnahme.",
        portal: "Bau",
        dokumente: ["Bauzeitenplan", "Übergabeprotokoll"],
      },
      {
        titel: "Betrieb & Bewirtschaftung",
        dauer: "25–30 Jahre",
        sie: "Fläche bewirtschaften, Direktzahlungen beantragen.",
        wir: "Betriebsführung, Monitoring, Abrechnung von Pacht, Ertrag oder Beteiligung.",
        portal: "In Betrieb",
        dokumente: ["Ertragsberichte", "Abrechnungen"],
      },
    ],
  },
  {
    id: "investor",
    label: "Investor",
    icon: "LineChart",
    gesamt: "2–6 Monate vom Match bis Closing",
    intro: `Sie suchen Projektrechte, baureife Projekte oder Bestandsanlagen. Die Plattform ist ${PROVISION.kaeufer.text}.`,
    cta: { label: "Als Investor registrieren", href: "/registrieren?rolle=investor" },
    schritte: [
      {
        titel: "Registrierung & Suchprofil",
        dauer: "10 Minuten",
        sie: "Region, Phase, Größe, Vergütungsmodell und Ticketgröße festlegen.",
        wir: "Profil prüfen und freischalten.",
        portal: "Suchprofil aktiv",
        dokumente: ["Suchprofil"],
      },
      {
        titel: "Match & Teaser",
        dauer: "laufend",
        sie: "Passende Projekte ansehen, Interesse bekunden.",
        wir: "Projekte aus der Börse und der eigenen Pipeline passend zum Profil vorschlagen.",
        portal: "Match",
        dokumente: ["Anonymisierter Exposé-Teaser"],
      },
      {
        titel: "NDA & Datenraum",
        dauer: "1–3 Tage",
        sie: "Vertraulichkeitsvereinbarung digital akzeptieren.",
        wir: "Datenraum mit Verträgen, Gutachten und Plänen freigeben.",
        portal: "Datenraum",
        dokumente: ["NDA", "Datenraum-Index"],
      },
      {
        titel: "Due Diligence",
        dauer: "4–12 Wochen",
        sie: "Technische, rechtliche und wirtschaftliche Prüfung – selbst oder mit Beratern.",
        wir: "Fragen beantworten, Q&A im Portal, Termine vor Ort.",
        portal: "Prüfung",
        dokumente: ["Q&A-Protokoll", "Ertragsgutachten", "Rechtsgutachten"],
      },
      {
        titel: "Angebot & Verhandlung",
        dauer: "2–6 Wochen",
        sie: "Indikatives Angebot (LOI), Verhandlung von Preis und Bedingungen.",
        wir: "Moderation zwischen Käufer und Verkäufer.",
        portal: "LOI",
        dokumente: ["Letter of Intent", "Term Sheet"],
      },
      {
        titel: "Signing & Closing",
        dauer: "2–8 Wochen",
        sie: "Kaufvertrag unterzeichnen, Kaufpreis zahlen.",
        wir: "Übergabe der Unterlagen, auf Wunsch Weiterentwicklung, Bau oder Betriebsführung.",
        portal: "Abgeschlossen",
        dokumente: ["Kaufvertrag", "Übergabeprotokoll"],
      },
    ],
  },
  {
    id: "anbieter",
    label: "Projektanbieter",
    icon: "FolderUp",
    gesamt: "2–6 Monate bis zum Verkauf",
    intro: `Sie haben ein Projekt in Entwicklung oder eine Bestandsanlage. Einstellen ist kostenlos; Provision: ${PROVISION.verkaeufer.text}.`,
    cta: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    schritte: [
      {
        titel: "Projekt einstellen",
        dauer: "15 Minuten",
        sie: "Eckdaten zu Lage, Größe, Phase, Netz und Planungsrecht erfassen.",
        wir: "Vollständigkeit prüfen, Rückfragen stellen.",
        portal: "Eingegangen",
        dokumente: ["Projektsteckbrief"],
      },
      {
        titel: "Prüfung & Bewertung",
        dauer: "1–3 Wochen",
        sie: "Unterlagen in den Datenraum laden.",
        wir: "Plausibilität, Einordnung der Phase, Preisspanne je kWp.",
        portal: "In Prüfung",
        dokumente: ["Bewertung", "Datenraum"],
      },
      {
        titel: "Veröffentlichung",
        dauer: "wenige Tage",
        sie: "Teaser freigeben – öffentlich oder nur für ausgewählte Investoren.",
        wir: "Anonymisierten Teaser erstellen, passende Suchprofile benachrichtigen.",
        portal: "Veröffentlicht",
        dokumente: ["Exposé-Teaser"],
      },
      {
        titel: "Interessenten & NDA",
        dauer: "laufend",
        sie: "Interessenten freigeben.",
        wir: "NDA-Verwaltung, Datenraumzugänge, Terminkoordination.",
        portal: "Interessenten",
        dokumente: ["NDA-Übersicht"],
      },
      {
        titel: "Due Diligence & Verhandlung",
        dauer: "4–16 Wochen",
        sie: "Fragen beantworten, Angebote vergleichen.",
        wir: "Q&A-Prozess, Moderation der Verhandlung.",
        portal: "Verhandlung",
        dokumente: ["Q&A-Protokoll", "Angebote / LOI"],
      },
      {
        titel: "Abschluss",
        dauer: "2–8 Wochen",
        sie: "Kaufvertrag unterzeichnen.",
        wir: "Abschluss begleiten; Provision nur bei erfolgreichem Verkauf.",
        portal: "Verkauft",
        dokumente: ["Kaufvertrag", "Provisionsabrechnung"],
      },
    ],
  },
  {
    id: "unternehmen",
    label: "Unternehmen",
    icon: "Factory",
    gesamt: "4–12 Wochen bis zum Angebot, Lieferbeginn nach Vertragsende",
    intro: "Reststrom-Pool, Solarcarport oder Speicher: Sie schicken uns Verbrauchsdaten, wir rechnen und liefern ein transparentes Angebot.",
    cta: { label: "Reststrom-Rechner", href: pfad("/rechner/reststrom") },
    schritte: [
      {
        titel: "Anfrage mit Verbrauchsdaten",
        dauer: "5 Minuten",
        sie: "Jahresverbrauch oder Lastgang, aktueller Vertrag, Vertragsende.",
        wir: "Vorgang anlegen, fehlende Daten anfragen.",
        portal: "Eingegangen",
        dokumente: ["Lastgang oder Jahresabrechnung", "aktueller Liefervertrag"],
      },
      {
        titel: "Analyse",
        dauer: "1–3 Wochen",
        sie: "Auf Wunsch Vollmacht für den Lastgangabruf beim Netzbetreiber.",
        wir: "Lastprofil, Preisbestandteile, Flexibilität und PV-/Speicherpotenzial auswerten.",
        portal: "Analyse",
        dokumente: ["Vollmacht", "Analysebericht"],
      },
      {
        titel: "Angebot",
        dauer: "1–2 Wochen",
        sie: "Angebot prüfen und vergleichen.",
        wir: "Pool-Angebot mit Beschaffungsstrategie, Preiszerlegung und Laufzeit.",
        portal: "Angebot",
        dokumente: ["Angebot", "Preisblatt"],
      },
      {
        titel: "Vertrag & Kündigung",
        dauer: "abhängig von Ihrer Kündigungsfrist",
        sie: "Liefervertrag unterzeichnen.",
        wir: "Kündigung des Altvertrags fristgerecht übernehmen, Beschaffung der ersten Tranchen.",
        portal: "Vertrag",
        dokumente: ["Liefervertrag (mit lizenziertem Lieferanten)", "Kündigungsbestätigung"],
      },
      {
        titel: "Lieferbeginn & Betrieb",
        dauer: "Vertragslaufzeit",
        sie: "Strom beziehen, Flexibilität nach Absprache nutzen.",
        wir: "Beschaffung steuern, Monitoring, Rechnungsprüfung.",
        portal: "Beliefert",
        dokumente: ["Rechnungen", "Beschaffungsstand", "Verbrauchsauswertung"],
      },
    ],
  },
];

/**
 * Wege je Land (Ländermodell, src/lib/land/inhalte.js): deutsche Werte und Begriffe (Pacht in €/ha,
 * DIN SPEC 91434, Privilegierung nach BauGB, Bebauungsplan) nur in DE; auf der gemeinsamen Seite mit
 * „gilt für Deutschland“, in AT/CH ohne deutsche Werte und mit den Verfahren des Landes.
 * @param {"DE"|"AT"|"CH"|null} land
 */
export function zielgruppenFuer(land) {
  if (land === "DE") return ZIELGRUPPEN;
  const ersetzen = (gruppe, titel, neu) => ({ ...gruppe, schritte: gruppe.schritte.map((s) => (s.titel === titel ? { ...s, ...neu } : s)) });
  return ZIELGRUPPEN.map((g) => {
    if (g.id === "flaeche") {
      if (!land) {
        return ersetzen(g, "Pachtangebot & Nutzungsvertrag", {
          wir: `Pachtangebot (Orientierung ${fmt(PACHT.freiflaecheProHa.min)}–${fmt(PACHT.freiflaecheProHa.max)} €/ha und Jahr, gilt für Deutschland), Vertragsentwurf, Rückbausicherheit.`,
        });
      }
      const pacht = ersetzen(g, "Pachtangebot & Nutzungsvertrag", { wir: "Pachtangebot, Vertragsentwurf, Rückbausicherheit." });
      return ersetzen(pacht, "Planung & Genehmigung", land === "AT"
        ? { wir: "Gutachten, Umwidmung, Netzanschlusszusage, Vergütung oder PPA.", dokumente: ["Gutachten", "Widmung", "Netzzusage"] }
        : { wir: "Gutachten, Genehmigung nach kantonalem Planungs- und Baurecht, Netzanschlusszusage, Vergütung oder PPA.", dokumente: ["Gutachten", "Genehmigungsunterlagen", "Netzzusage"] });
    }
    if (g.id === "landwirt") {
      if (!land) {
        return ersetzen(g, "Genehmigung", {
          wir: `Bauantrag (privilegiert bis ${fmt(AGRI.privilegierungHa, 1)} ha mit Hofbezug, gilt für Deutschland) oder B-Plan, Netzanschluss, Vergütung.`,
        });
      }
      const konzept = ersetzen(g, "Bewirtschaftungskonzept", {
        wir: "Anlagendesign passend zur Bewirtschaftung: Reihenabstände, Durchfahrtshöhen, Arbeitsgänge.",
        dokumente: ["Agri-PV-Konzept"],
      });
      return ersetzen(konzept, "Genehmigung", {
        wir: `Genehmigung nach dem Bau- und Raumordnungsrecht ${land === "AT" ? "des Bundeslandes" : "des Kantons"}, Netzanschluss, Vergütung.`,
        dokumente: ["Genehmigungsunterlagen", "Netzzusage"],
      });
    }
    return g;
  });
}

/* ------------------------------------------------------------------ */
/* Englisch (Sprachmodell): nur Texte, gleiche Reihenfolge und Werte   */
/* ------------------------------------------------------------------ */

const zEn = (n, s = 0) => fmtZahl(n, s, "en");

/** Englische Texte je Zielgruppe (Index-gleich mit ZIELGRUPPEN; Icons, hrefs, monate aus der deutschen Fassung). */
const ZIELGRUPPEN_EN = [
  {
    label: "Landowner",
    gesamt: "2–4 years until operation",
    intro: "You provide the land, we develop, build and operate the solar park. There are no costs for you.",
    cta: { label: "Land check" },
    schritte: [
      { titel: "Land check & enquiry", dauer: "5 minutes online, followed by a personal response", sie: "Provide location, size and use – plot numbers are enough.", wir: "Initial check of grid distance, protected areas and planning law.", portal: "Received", dokumente: ["Map extract or list of plots"] },
      { titel: "Site assessment", dauer: "2–6 weeks", sie: "Answer questions on access, cables and pipelines, and farming.", wir: "Grid request, restrictions, talks with the municipality, yield forecast.", portal: "Under review", dokumente: ["Assessment report with traffic-light rating", "Sketch of the possible plant"] },
      { titel: "Lease offer & land-use agreement", dauer: "2–8 weeks", sie: "Review the offer – ideally with a lawyer or tax adviser.", wir: `Lease offer (guide value €${zEn(PACHT.freiflaecheProHa.min)}–${zEn(PACHT.freiflaecheProHa.max)}/ha per year), draft contract, decommissioning security.`, portal: "Contract", dokumente: ["Lease offer", "Land-use agreement", "Approval of the easement"] },
      { titel: "Planning & permits", dauer: "12–30 months", sie: "Approve the easement before a notary; attend meetings in the municipality if needed.", wir: "Expert reports, development plan (Bebauungsplan, DE) or rezoning (Umwidmung, AT), grid connection commitment, remuneration or PPA.", portal: "Permit", dokumente: ["Resolution to draw up the plan", "Expert reports", "Adopted plan / zoning", "Grid commitment"] },
      { titel: "Construction", dauer: "3–6 months", sie: "Nothing – we agree access and dates with you.", wir: "Construction using pile-driving equipment from within the group, grid connection, commissioning.", portal: "Construction", dokumente: ["Construction schedule", "Handover report"] },
      { titel: "Operation", dauer: `${PACHT.laufzeit} years + options`, sie: "Receive the lease payment every year.", wir: "Operations management, maintenance, care of the land, full decommissioning at the end.", portal: "In operation", dokumente: ["Lease statement", "Annual report"] },
    ],
  },
  {
    label: "Farmer",
    gesamt: "1.5–3 years until operation",
    intro: "Agrivoltaics: the land stays in agricultural use. You choose whether to lease, invest yourself or take a stake.",
    cta: { label: "Agrivoltaics calculator" },
    schritte: [
      { titel: "Enquiry & agri check", dauer: "Personal response", sie: "Describe the land, crops and crop rotation.", wir: "Suitability for vertical or elevated agrivoltaics, grid, planning law.", portal: "Received", dokumente: ["List of fields", "Photos of the land"] },
      { titel: "Choose a model", dauer: "2–6 weeks", sie: "Lease, invest yourself, or investor + membership of the cooperative.", wir: "Economic comparison of the three options, including direct payments.", portal: "Offer", dokumente: ["Comparison calculation", "Offer per model"] },
      { titel: "Farming concept", dauer: "4–8 weeks", sie: "Contribute machine widths, crops and field operations.", wir: `Plant design to DIN SPEC 91434 (at least ${zEn(AGRI.mindestErtrag * 100)} % of the agricultural yield), row spacing, clearance heights.`, portal: "Concept", dokumente: ["Agrivoltaics concept", "DIN SPEC 91434 evidence"] },
      { titel: "Permit", dauer: "3–24 months", sie: "Support the application or the municipal participation process.", wir: `Building application (privileged up to ${zEn(AGRI.privilegierungHa, 1)} ha linked to a farm) or development plan, grid connection, remuneration.`, portal: "Permit", dokumente: ["Building application / development plan documents", "Grid commitment"] },
      { titel: "Construction in step with crop rotation", dauer: "2–5 months", sie: "Agree construction windows after harvest or before sowing.", wir: "Installation with soil-friendly pile-driving, commissioning.", portal: "Construction", dokumente: ["Construction schedule", "Handover report"] },
      { titel: "Operation & farming", dauer: "25–30 years", sie: "Farm the land, apply for direct payments.", wir: "Operations management, monitoring, settlement of lease, yield or participation.", portal: "In operation", dokumente: ["Yield reports", "Statements"] },
    ],
  },
  {
    label: "Investor",
    gesamt: "2–6 months from match to closing",
    intro: "You are looking for project rights, ready-to-build projects or operating assets. The platform is free of charge for investors (search profile, NDA, data room).",
    cta: { label: "Register as an investor" },
    schritte: [
      { titel: "Registration & search profile", dauer: "10 minutes", sie: "Define region, stage, size, remuneration model and ticket size.", wir: "Check and activate the profile.", portal: "Search profile active", dokumente: ["Search profile"] },
      { titel: "Match & teaser", dauer: "ongoing", sie: "View suitable projects, express interest.", wir: "Suggest projects from the exchange and our own pipeline that match your profile.", portal: "Match", dokumente: ["Anonymised exposé teaser"] },
      { titel: "NDA & data room", dauer: "1–3 days", sie: "Accept the non-disclosure agreement digitally.", wir: "Open the data room with contracts, expert reports and plans.", portal: "Data room", dokumente: ["NDA", "Data room index"] },
      { titel: "Due diligence", dauer: "4–12 weeks", sie: "Technical, legal and financial review – yourself or with advisers.", wir: "Answer questions, Q&A in the portal, site visits.", portal: "Review", dokumente: ["Q&A log", "Yield assessment", "Legal opinion"] },
      { titel: "Offer & negotiation", dauer: "2–6 weeks", sie: "Indicative offer (LOI), negotiation of price and terms.", wir: "Moderation between buyer and seller.", portal: "LOI", dokumente: ["Letter of intent", "Term sheet"] },
      { titel: "Signing & closing", dauer: "2–8 weeks", sie: "Sign the purchase agreement, pay the purchase price.", wir: "Handover of documents; on request further development, construction or operations management.", portal: "Completed", dokumente: ["Purchase agreement", "Handover report"] },
    ],
  },
  {
    label: "Project seller",
    gesamt: "2–6 months until sale",
    intro: `You have a project in development or an operating plant. Listing is free; commission: ${zEn(PROVISION.verkaeufer.min * 100, 1)}–${zEn(PROVISION.verkaeufer.max * 100)} % of the purchase price, only on successful closing.`,
    cta: { label: "Offer a project" },
    schritte: [
      { titel: "List your project", dauer: "15 minutes", sie: "Enter key data on location, size, stage, grid and planning law.", wir: "Check completeness, ask follow-up questions.", portal: "Received", dokumente: ["Project profile"] },
      { titel: "Review & valuation", dauer: "1–3 weeks", sie: "Upload documents to the data room.", wir: "Plausibility, stage classification, price range per kWp.", portal: "Under review", dokumente: ["Valuation", "Data room"] },
      { titel: "Publication", dauer: "a few days", sie: "Approve the teaser – public or only for selected investors.", wir: "Create an anonymised teaser, notify matching search profiles.", portal: "Published", dokumente: ["Exposé teaser"] },
      { titel: "Interested parties & NDA", dauer: "ongoing", sie: "Approve interested parties.", wir: "NDA management, data room access, scheduling.", portal: "Interested parties", dokumente: ["NDA overview"] },
      { titel: "Due diligence & negotiation", dauer: "4–16 weeks", sie: "Answer questions, compare offers.", wir: "Q&A process, moderation of the negotiation.", portal: "Negotiation", dokumente: ["Q&A log", "Offers / LOI"] },
      { titel: "Closing", dauer: "2–8 weeks", sie: "Sign the purchase agreement.", wir: "Support the closing; commission only on a successful sale.", portal: "Sold", dokumente: ["Purchase agreement", "Commission statement"] },
    ],
  },
  {
    label: "Company",
    gesamt: "4–12 weeks to an offer, supply starts when your current contract ends",
    intro: "Residual power pool, solar carport or storage: you send us your consumption data, we run the numbers and deliver a transparent offer.",
    cta: { label: "Residual power calculator" },
    schritte: [
      { titel: "Enquiry with consumption data", dauer: "5 minutes", sie: "Annual consumption or load profile, current contract, contract end.", wir: "Create the case, request missing data.", portal: "Received", dokumente: ["Load profile or annual bill", "Current supply contract"] },
      { titel: "Analysis", dauer: "1–3 weeks", sie: "On request, a power of attorney to retrieve the load profile from the grid operator.", wir: "Evaluate load profile, price components, flexibility and PV/storage potential.", portal: "Analysis", dokumente: ["Power of attorney", "Analysis report"] },
      { titel: "Offer", dauer: "1–2 weeks", sie: "Review and compare the offer.", wir: "Pool offer with procurement strategy, price breakdown and term.", portal: "Offer", dokumente: ["Offer", "Price sheet"] },
      { titel: "Contract & termination", dauer: "depending on your notice period", sie: "Sign the supply contract.", wir: "Handle the termination of your old contract on time, procure the first tranches.", portal: "Contract", dokumente: ["Supply contract (with a licensed supplier)", "Confirmation of termination"] },
      { titel: "Start of supply & operation", dauer: "contract term", sie: "Draw power, use flexibility as agreed.", wir: "Manage procurement, monitoring, invoice checks.", portal: "Supplied", dokumente: ["Invoices", "Procurement status", "Consumption analysis"] },
    ],
  },
];

/** Zielgruppen in der Sprache der Seite (ohne Länderanpassung). */
export const zielgruppenSprache = (sprache) => (sprache === "en" ? zusammenfuehren(ZIELGRUPPEN, ZIELGRUPPEN_EN) : ZIELGRUPPEN);

/**
 * Wege je Land UND Sprache. Deutsch: zielgruppenFuer(land). Englisch: dieselben Regeln (Schritte per Index),
 * mit englischen Texten; AT/CH ohne deutsche Werte.
 */
export function zielgruppenFuerSprache(land, sprache) {
  if (sprache !== "en") return zielgruppenFuer(land);
  const basis = zielgruppenSprache("en");
  if (land === "DE") return basis;
  const ersetzen = (gruppe, index, neu) => ({ ...gruppe, schritte: gruppe.schritte.map((s, i) => (i === index ? { ...s, ...neu } : s)) });
  return basis.map((g) => {
    if (g.id === "flaeche") {
      if (!land) {
        return ersetzen(g, 2, {
          wir: `Lease offer (guide value €${zEn(PACHT.freiflaecheProHa.min)}–${zEn(PACHT.freiflaecheProHa.max)}/ha per year, applies to Germany), draft contract, decommissioning security.`,
        });
      }
      const pacht = ersetzen(g, 2, { wir: "Lease offer, draft contract, decommissioning security." });
      return ersetzen(pacht, 3, land === "AT"
        ? { wir: "Expert reports, rezoning (Umwidmung), grid connection commitment, remuneration or PPA.", dokumente: ["Expert reports", "Zoning (Widmung)", "Grid commitment"] }
        : { wir: "Expert reports, permit under cantonal planning and building law, grid connection commitment, remuneration or PPA.", dokumente: ["Expert reports", "Permit documents", "Grid commitment"] });
    }
    if (g.id === "landwirt") {
      if (!land) {
        return ersetzen(g, 3, {
          wir: `Building application (privileged up to ${zEn(AGRI.privilegierungHa, 1)} ha linked to a farm, applies to Germany) or development plan, grid connection, remuneration.`,
        });
      }
      const konzept = ersetzen(g, 2, {
        wir: "Plant design to suit the farming: row spacing, clearance heights, field operations.",
        dokumente: ["Agrivoltaics concept"],
      });
      return ersetzen(konzept, 3, {
        wir: `Permit under the building and spatial planning law of the ${land === "AT" ? "federal state" : "canton"}, grid connection, remuneration.`,
        dokumente: ["Permit documents", "Grid commitment"],
      });
    }
    return g;
  });
}
