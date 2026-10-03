// Einstiegsseite je Land: /de, /at, /ch (Welle 2, Länderrouting)
import LandEinstieg from "@/components/Land/LandEinstieg";
import { EINSTIEG, LAENDER } from "@/lib/land";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const TITEL = {
  DE: "ÖkoInvest Deutschland – Solarpark, Agri-PV, Rechner und Regionen",
  AT: "ÖkoInvest Österreich – Freiflächen-PV, Energiegemeinschaften und Regionen",
  CH: "ÖkoInvest Schweiz – Freiflächen-PV (im Aufbau)",
};
const BESCHREIBUNG = {
  DE: "Alle Seiten für Deutschland: Flächencheck, Pacht- und Renditerechner, Regionalseiten der 16 Bundesländer, Agri-PV, Kommunen und Strombezug.",
  AT: "Seiten für Österreich: Regionalseiten der neun Bundesländer, Energiegemeinschaften und Flächencheck. Weitere Seiten nach fachlicher Prüfung.",
  CH: "Seiten für die Schweiz im Aufbau: Marktzugang-Check und Parzellen-Vorprüfung in Vorbereitung, dazu der Ratgeber zur Freiflächen-PV in der Schweiz.",
};

const basis = (land) => ({
  title: TITEL[land],
  description: BESCHREIBUNG[land],
  openGraph: { type: "website", siteName: "ÖkoInvest", title: TITEL[land], description: BESCHREIBUNG[land], images: [{ url: "/img/solarpark-himmel.jpg", width: 1280, height: 852, alt: `Solarpark – Seiten ${LAENDER[land].fuerLand}` }] },
});

export const generateMetadata = landMetadata(EINSTIEG, basis);

export default async function LandSeite({ params }) {
  const { land } = await landDerSeite(params, EINSTIEG);
  return <LandEinstieg land={land} />;
}
