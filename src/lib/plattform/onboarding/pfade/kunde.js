// src/lib/plattform/onboarding/pfade/kunde.js – Unternehmen: Contracting-Kunde (Solarstrom vor Ort) und Reststrom-/Energiebeschaffungs-Kunde

import { ansprechpartnerSchritt, benachrichtigungenSchritt, profilSchritt, untertypSchritt } from "./gemeinsam";

export const kunde = {
  id: "kunde",
  titel: "Einstieg für Unternehmen",
  text: "Solarstrom vom eigenen Dach oder gebündelte Energiebeschaffung – mit den Stammdaten, die Lieferanten und Abrechnung wirklich brauchen.",
  rollen: ["unternehmen"],
  untertypen: {
    contracting: { label: "Solarstrom vor Ort (Contracting)", text: "Die Anlage auf Ihrem Dach gehört ÖkoInvest bzw. der Projektgesellschaft – Sie beziehen den Strom." },
    reststrom: { label: "Reststrom / Energiebeschaffung", text: "Den Strom, den Sie weiterhin kaufen müssen, bündeln wir im Pool und schreiben ihn unter Versorgern aus." },
  },
  schritte: [
    untertypSchritt("Womit starten Sie?", "Beides ist später kombinierbar – z. B. Solarstrom vom Dach und Reststrom aus dem Pool."),
    profilSchritt({ firmaPflicht: true, firmaLabel: "Unternehmen", text: "Firma laut Register und eine erreichbare Ansprechperson – für Verträge, Rechnungen und Störungsmeldungen." }),
    // Contracting
    {
      id: "solarstrom", titel: "„Mein Solarstrom“ kennenlernen", kurz: "Mein Solarstrom", art: "aktion", begriff: "energie-contracting",
      text: "Vertrag, erzeugter und gelieferter Strom, abrechnungsrelevante Zähler. Technik und Finanzierung der Anlage liegen beim Betreiber – Sie sehen, was Sie für Abrechnung und Planung brauchen.",
      punkte: ["Vertragsdaten: Laufzeit, Arbeitspreis, Preisgleitung, Mindestabnahme und Endschaftsregelung.", "Monatswerte je Zähler – Grundlage der Rechnung."],
      links: [{ href: "/portal/anlagen", label: "Mein Solarstrom öffnen", primaer: true }],
      pflicht: ["contracting"], kriterium: { eines: [{ fakt: "anlagen" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Angesehen", nurFuer: ["contracting"],
    },
    {
      id: "rechnungen", titel: "Rechnungen und Zahlungen", kurz: "Rechnungen", art: "info",
      text: "Rechnungen aus dem Contracting-Vertrag erscheinen monatlich unter „Abrechnungen“ – mit PDF und Zahlungsstatus. Die E-Mail enthält nur einen Hinweis, keine Beträge.",
      punkte: ["Rechnungsanschrift und Bestellnummer bitte über „Nachrichten“ mitteilen, falls Ihre Buchhaltung sie braucht.", "Abweichungen zum Zählerstand? Direkt an der Rechnung melden – wir prüfen die Messwerte."],
      links: [{ href: "/portal/abrechnungen", label: "Abrechnungen öffnen" }],
      pflicht: false, kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden", nurFuer: ["contracting"],
    },
    {
      id: "stoerung", titel: "Störung melden", kurz: "Störung", art: "info",
      text: "Die Anlage wird laufend überwacht – die meisten Störungen sehen wir vor Ihnen. Fällt Ihnen etwas auf (Brandgeruch, beschädigte Module, Wechselrichter aus), melden Sie es über den Support.",
      punkte: ["Bei Gefahr (Brand, Rauch) zuerst Feuerwehr 112 bzw. 118 (CH) rufen, dann melden.", "Meldung mit Foto und Ort am Gebäude – Sie erhalten eine Ticketnummer und Statusmeldungen."],
      links: [{ href: "/portal/support", label: "Support öffnen" }],
      pflicht: ["contracting"], kriterium: { merker: true }, bestaetigbar: true, bestaetigenText: "Verstanden", nurFuer: ["contracting"],
    },
    // Reststrom / Energiebeschaffung
    {
      id: "abnahmestelle", titel: "Energie-Stammdaten erfassen", kurz: "Abnahmestelle", art: "aktion", begriff: "marktlokation",
      text: "Je Abnahmestelle: Marktlokation (DE, 11-stellig mit Prüfziffer), Messlokation bzw. Zählpunkt (AT, 33-stellig) oder Messpunkt (CH), Messart, Netzebene und Jahresverbrauch.",
      punkte: ["Die Angaben stehen auf Ihrer Stromrechnung oder im Netznutzungsvertrag.", "Leistungsgemessene Kunden (RLM) haben in der Regel ab 100.000 kWh/a einen Lastgang – das verbessert Angebote deutlich."],
      links: [{ href: "/portal/energie", label: "Energie & Lastgang öffnen", primaer: true }],
      pflicht: ["reststrom"], kriterium: { fakt: "abnahmestellen" }, nurFuer: ["reststrom"],
    },
    {
      id: "lastgang", titel: "Lastgang hochladen", kurz: "Lastgang", art: "aktion", begriff: "lastgang",
      text: "15-Minuten-Werte eines Jahres (CSV/Excel-Export des Netzbetreibers oder Messstellenbetreibers). Einheiten, Zeitumstellung und Lücken erkennt der Import selbst.",
      punkte: ["Ohne Lastgang (Standardlastprofil) rechnen wir mit dem Jahresverbrauch – dann Schritt auf „später“ setzen."],
      links: [{ href: "/portal/energie", label: "Lastgang hochladen", primaer: true }],
      pflicht: false, kriterium: { eines: [{ fakt: "lastgaenge" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Kein Lastgang vorhanden", nurFuer: ["reststrom"],
    },
    {
      id: "vertrag", titel: "Laufenden Vertrag und Kündigungsfrist erfassen", kurz: "Vertrag", art: "aktion",
      text: "Lieferant, Vertragsende, Kündigungsfrist und Preisstruktur. Daraus berechnen wir das Kündigungsfenster und erinnern rechtzeitig – ein verpasstes Fenster kostet oft ein ganzes Jahr.",
      links: [{ href: "/portal/energie/beschaffung", label: "Energiebeschaffung öffnen", primaer: true }],
      pflicht: ["reststrom"], kriterium: { fakt: "energieVertrag" }, nurFuer: ["reststrom"],
    },
    {
      id: "vollmacht", titel: "Beschaffungsvollmacht erteilen", kurz: "Vollmacht", art: "aktion",
      text: "Mit der Vollmacht dürfen wir in Ihrem Namen Angebote bei Versorgern einholen und – nur nach Ihrer Freigabe im Portal – den Zuschlag erteilen. Widerruf jederzeit im Portal.",
      punkte: ["Angebote holen wir mit anonymisiertem Lastgang ein – Ihr Firmenname geht erst mit dem Zuschlag an den Versorger."],
      links: [{ href: "/portal/energie/beschaffung", label: "Vollmacht erteilen", primaer: true }],
      pflicht: false, kriterium: { eines: [{ fakt: "vollmacht" }, { merker: true }] }, bestaetigbar: true, bestaetigenText: "Später entscheiden", nurFuer: ["reststrom"],
    },
    ansprechpartnerSchritt(),
    benachrichtigungenSchritt("Kündigungsfristen, Angebotsvergleiche zur Freigabe, Rechnungen und Störungen – wählen Sie, was per E-Mail kommen soll."),
  ],
};
