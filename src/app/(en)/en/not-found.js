// 404 der englischen Seiten (/en, /en/<land>, Sprachmodell): englischer Text, Links bleiben in Sprache und
// Land der Seite (Link-Komponente). Unbekannte tiefere Pfade außerhalb aller Routen zeigt global-not-found.js.
import NichtGefundenSeite from "@/components/Wurzel/NichtGefundenSeite";

export const metadata = {
  title: "Page not found | ÖkoInvest",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NichtGefundenSeite sprache="en" />;
}
