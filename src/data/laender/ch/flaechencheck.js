// Länderinhalt CH für /flaechencheck (Ländermodell, Inhalte CH – Gruppe 1).
// Rechtsgrundlage wie src/data/regionen/schweiz.js (RPG Stand 01.01.2026, Art. 24ter; Luzerner Merkblatt).
// Die Ampel-Heuristik des Checks ist nicht auf Schweizer Raumplanungsrecht abgestimmt – darauf weist die
// Zusatzfrage offen hin. Darum bleibt die Schweizer Fassung des Checks vorerst noindex (siehe Bericht CH – Gruppe 1).

export const FLAECHENCHECK_CH = {
  querverweisRegion: { href: "/regionen/schweiz", titel: "Solarpark und Agri-PV in der Schweiz", text: "Art. 24ter RPG, Kantone, Bewilligung und Förderung – mit Quellen." },
  freiflaecheText: "Standortgebundenheit, Bewilligung durch Gemeinde und Kanton, HEIV-Auktion.",
  ctaSecondary: { label: "Region Schweiz", href: "/regionen/schweiz" },
  faq: [
    {
      q: "Berücksichtigt der Check das Schweizer Raumplanungsrecht?",
      a: "Nur zum Teil. Die Ampel bewertet Grösse, Nutzung, Netz und Besonderheiten Ihrer Parzelle. Ob eine Anlage ausserhalb der Bauzone als standortgebunden gilt (Art. 24ter RPG), kann sie nicht beurteilen. Auf landwirtschaftlicher Nutzfläche braucht es dafür einen Vorteil für die Produktion oder einen Forschungszweck, ausserhalb davon ein wenig empfindliches oder vorbelastetes Gebiet. Das prüfen wir parzellengenau – mit kantonalem Richtplan und Fruchtfolgeflächen.",
    },
  ],
};

// Englisch (Sprachmodell): Übersetzung von FLAECHENCHECK_CH – gleiche Rechtsgrundlage, nur Texte.
export const FLAECHENCHECK_CH_EN = {
  querverweisRegion: { titel: "Solar parks and agrivoltaics in Switzerland", text: "Art. 24ter RPG, cantons, permits and funding – with sources." },
  freiflaecheText: "Site-bound status, permits from the municipality and canton, HEIV auction.",
  ctaSecondary: { label: "Region Switzerland" },
  faq: [
    {
      q: "Does the check take Swiss spatial planning law into account?",
      a: "Only in part. The traffic light assesses the size, use, grid and special features of your plot. It cannot judge whether an installation outside the building zone qualifies as site-bound (Art. 24ter RPG, Swiss Spatial Planning Act). On utilised agricultural area, this requires a benefit for production or a research purpose; outside it, a less sensitive or pre-impacted area. We check this plot by plot – with the cantonal structure plan and crop rotation areas.",
    },
  ],
};
