// /ch/marktzugang-check – Schweiz, gestufter Start: in Vorbereitung (Masterplan Abschnitt 4).
// Inhalt folgt nach Fachfreigabe (Prüfer TODO-E6). noindex, nicht in der Sitemap.
import InVorbereitung from "@/components/Land/InVorbereitung";
import { landDerSeite, landMetadata } from "@/lib/land/seite";

const metadata = {
  title: "Marktzugang-Check Schweiz (in Vorbereitung) | ÖkoInvest",
  description: "Der Marktzugang-Check für die Schweiz ist in Vorbereitung und erscheint nach fachlicher Prüfung.",
};

export const generateMetadata = landMetadata("/marktzugang-check", metadata);

export default async function MarktzugangCheck({ params }) {
  const { land } = await landDerSeite(params, "/marktzugang-check");
  return (
    <InVorbereitung
      land={land}
      titel="Marktzugang-Check"
      worum="Der Check soll zeigen, ob und ab wann ein Unternehmen seinen Strom am freien Markt beschaffen kann."
      weiter={[{ href: "/wissen/ratgeber/freiflaechen-pv-schweiz", titel: "Ratgeber Schweiz", text: "Freiflächen-PV in der Schweiz: Bewilligung, Förderung, Auktionen." }]}
    />
  );
}
