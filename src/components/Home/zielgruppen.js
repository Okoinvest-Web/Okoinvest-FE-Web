import { Factory, FolderUp, LineChart, MapPinned, Tractor } from "lucide-react";
import { pfad } from "@/lib/land";
import { zusammenfuehren } from "@/lib/sprache/woerterbuch";

/**
 * Zielgruppen der Startseite – eine Quelle für die Weiche im Hero (ZielgruppenWahl)
 * und den Abschluss-Handlungsaufruf (RollenCtaBand).
 * Alle Aussagen stammen aus bestehenden Texten der Seite; `id` = Rollen-ID der Registrierung.
 */
export const GRUPPEN = [
  {
    id: "flaeche",
    label: "Fläche",
    lang: "Ich habe eine Fläche",
    konto: "Flächeneigentümer",
    icon: MapPinned,
    titel: "Planbare Pacht über die Vertragslaufzeit – ohne eigene Investition.",
    punkte: ["Kostenloser Flächencheck mit Pachtspanne", "Festpacht, indexiert oder mit Umsatzbeteiligung", "Rückbau vertraglich abgesichert"],
    primaer: { label: "Fläche prüfen", href: pfad("/flaechencheck") },
    sekundaer: { label: "Pachtrechner", href: pfad("/rechner/pacht") },
    abschluss: null, // Standard des CtaBand passt bereits
  },
  {
    id: "landwirt",
    label: "Landwirt",
    lang: "Ich bin Landwirt",
    konto: "Landwirt",
    icon: Tractor,
    titel: "Ernten und Strom erzeugen – auf demselben Acker.",
    punkte: ["Agri-PV nach DIN SPEC 91434", "Verpachten, selbst investieren oder beteiligen", "Direktzahlungen bleiben weitgehend erhalten"],
    primaer: { label: "Welcher Weg passt?", href: pfad("/landwirte") },
    sekundaer: { label: "Agri-PV-Rechner", href: pfad("/rechner/agri-pv") },
    abschluss: {
      eyebrow: "Für Landwirte · kostenlos & unverbindlich",
      title: "Ernten und Strom erzeugen – auf demselben Acker.",
    },
  },
  {
    id: "investor",
    label: "Investor",
    lang: "Ich möchte investieren",
    konto: "Investor",
    icon: LineChart,
    titel: "PV-Projekte mit vorgeprüften Unterlagen – von Projektrechten bis Bestand.",
    punkte: ["Suchprofil mit automatischem Matching", "NDA und Datenraum digital", "Für Investoren kostenfrei – der Verkäufer zahlt die Provision"],
    primaer: { label: "Zur Projektbörse", href: "/projektboerse" },
    sekundaer: { label: "Renditerechner", href: pfad("/rechner/solarpark") },
    abschluss: {
      eyebrow: "Für Investoren kostenfrei",
      title: "PV-Projekte mit vorgeprüften Unterlagen – von Projektrechten bis Bestand.",
      primary: { label: "Suchprofil anlegen", href: "/registrieren?rolle=investor" },
      secondary: { label: "Zur Projektbörse", href: "/projektboerse" },
    },
  },
  {
    id: "anbieter",
    label: "Anbieter",
    lang: "Ich biete ein Projekt an",
    konto: "Projektentwickler / Anbieter",
    icon: FolderUp,
    titel: "Ihr Projekt vor den richtigen Käufern im DACH-Raum.",
    punkte: ["Plausibilitätsprüfung vor Veröffentlichung","Vertraulich bis zur NDA-Freigabe", "Provision nur bei Abschluss"],
    primaer: { label: "Projekt anbieten", href: "/projektboerse/anbieten" },
    sekundaer: { label: "Projekt bewerten", href: pfad("/rechner/projektbewertung") },
    abschluss: {
      eyebrow: "Provision nur bei Abschluss",
      title: "Ihr Projekt vor den richtigen Käufern im DACH-Raum.",
    },
  },
  {
    id: "unternehmen",
    label: "Firma",
    lang: "Ich brauche günstigen Strom",
    konto: "Unternehmen",
    icon: Factory,
    titel: "Reststrom gemeinsam einkaufen – statt allein zu zahlen.",
    // Paket D / E3 (Entwurf, Inhaber-Entscheidung): Vermittlerrolle mit offengelegter Vergütung;
    // „Solarstrom aus Parks der Gruppe“ entfernt, solange kein PPA aus Gruppenparks belegt ist.
    punkte: ["Bündelung im Einkaufspool", "Wir vermitteln – unsere Vergütung legen wir offen", "Passt zu Ihrer PV und Ihrem Speicher"],
    primaer: { label: "Ersparnis berechnen", href: pfad("/rechner/reststrom") },
    sekundaer: { label: "So funktioniert der Pool", href: pfad("/reststrom") },
    abschluss: {
      eyebrow: "Reststrom-Pool für den Mittelstand",
      title: "Reststrom gemeinsam einkaufen – statt allein zu zahlen.",
    },
  },
];

// Abschluss-Wege: sofern nicht eigens angegeben, dieselben zwei Wege wie im Hero
for (const g of GRUPPEN) {
  if (g.abschluss) {
    g.abschluss.primary ??= g.primaer;
    g.abschluss.secondary ??= g.sekundaer;
  }
}

/** Englisch (Sprachmodell): nur Texte, gleiche Reihenfolge wie GRUPPEN – ids, Icons, hrefs bleiben. */
const GRUPPEN_EN = [
  {
    label: "Land",
    lang: "I own land",
    konto: "a landowner",
    titel: "Predictable lease income over the contract term – without investing yourself.",
    punkte: ["Free land check with lease range", "Fixed lease, indexed or with revenue share", "Decommissioning secured by contract"],
    primaer: { label: "Check your land" },
    sekundaer: { label: "Lease calculator" },
  },
  {
    label: "Farmer",
    lang: "I am a farmer",
    konto: "a farmer",
    titel: "Harvest crops and generate power – on the same field.",
    punkte: ["Agrivoltaics to DIN SPEC 91434", "Lease, invest yourself or participate", "Direct payments are largely retained"],
    primaer: { label: "Which path suits you?" },
    sekundaer: { label: "Agrivoltaics calculator" },
    abschluss: {
      eyebrow: "For farmers · free of charge & without obligation",
      title: "Harvest crops and generate power – on the same field.",
      primary: { label: "Which path suits you?" },
      secondary: { label: "Agrivoltaics calculator" },
    },
  },
  {
    label: "Investor",
    lang: "I want to invest",
    konto: "an investor",
    titel: "PV projects with pre-checked documents – from project rights to operating assets.",
    punkte: ["Search profile with automatic matching", "NDA and data room online", "Free of charge for investors – the seller pays the commission"],
    primaer: { label: "To the project exchange" },
    sekundaer: { label: "Return calculator" },
    abschluss: {
      eyebrow: "Free of charge for investors",
      title: "PV projects with pre-checked documents – from project rights to operating assets.",
      primary: { label: "Create search profile" },
      secondary: { label: "To the project exchange" },
    },
  },
  {
    label: "Seller",
    lang: "I am offering a project",
    konto: "a project developer / seller",
    titel: "Your project in front of the right buyers in the DACH region.",
    punkte: ["Plausibility check before publication", "Confidential until NDA approval", "Commission only on closing"],
    primaer: { label: "Offer a project" },
    sekundaer: { label: "Value a project" },
    abschluss: {
      eyebrow: "Commission only on closing",
      title: "Your project in front of the right buyers in the DACH region.",
      primary: { label: "Offer a project" },
      secondary: { label: "Value a project" },
    },
  },
  {
    label: "Business",
    lang: "I need affordable power",
    konto: "a business",
    titel: "Buy residual power together – instead of paying alone.",
    punkte: ["Pooling in a purchasing pool", "We act as intermediary – we disclose our remuneration", "Fits your PV and your storage"],
    primaer: { label: "Calculate savings" },
    sekundaer: { label: "How the pool works" },
    abschluss: {
      eyebrow: "Residual power pool for SMEs",
      title: "Buy residual power together – instead of paying alone.",
      primary: { label: "Calculate savings" },
      secondary: { label: "How the pool works" },
    },
  },
];

/** Zielgruppen in der Sprache der Seite (Rückfall Deutsch). */
export const gruppenFuer = (sprache) => (sprache === "en" ? zusammenfuehren(GRUPPEN, GRUPPEN_EN) : GRUPPEN);

/** sessionStorage-Schlüssel + Ereignis, damit der Abschluss die Hero-Wahl aufgreift. */
export const ROLLE_SPEICHER = "ov-start-rolle";
export const ROLLE_EREIGNIS = "ov:start-rolle";
