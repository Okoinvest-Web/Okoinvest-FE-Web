import { Factory, FolderUp, LineChart, MapPinned, Tractor } from "lucide-react";
import { pfad } from "@/lib/land";

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

/** sessionStorage-Schlüssel + Ereignis, damit der Abschluss die Hero-Wahl aufgreift. */
export const ROLLE_SPEICHER = "ov-start-rolle";
export const ROLLE_EREIGNIS = "ov:start-rolle";
