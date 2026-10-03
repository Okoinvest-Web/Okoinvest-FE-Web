// /ch/parzellen-vorpruefung – Schweiz, gestufter Start: in Vorbereitung (Masterplan Abschnitt 4).
// Inhalt folgt nach Fachfreigabe (Prüfer TODO-E6). noindex, nicht in der Sitemap.
import InVorbereitung from "@/components/Land/InVorbereitung";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const metadata = {
  title: "Parzellen-Vorprüfung Schweiz (in Vorbereitung) | ÖkoInvest",
  description: "Die Parzellen-Vorprüfung für Freiflächen-PV in der Schweiz ist in Vorbereitung und erscheint nach fachlicher Prüfung.",
};

export const generateMetadata = landMetadata("/parzellen-vorpruefung", metadata);

export default async function ParzellenVorpruefung({ params }) {
  const { land } = await landDerSeite(params, "/parzellen-vorpruefung");
  return (
    <InVorbereitung
      land={land}
      titel="Parzellen-Vorprüfung"
      worum="Die Vorprüfung soll eine erste Einschätzung geben, ob sich eine Parzelle für eine Photovoltaik-Freiflächenanlage eignet."
      weiter={[{ href: "/wissen/ratgeber/freiflaechen-pv-schweiz", titel: "Ratgeber Schweiz", text: "Freiflächen-PV in der Schweiz: Bewilligung, Förderung, Auktionen." }]}
    />
  );
}
