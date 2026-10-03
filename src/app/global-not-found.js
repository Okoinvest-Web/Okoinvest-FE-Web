// Globale 404-Seite (Next.js 15, experimental.globalNotFound): für Pfade, die zu keinem der
// Root-Layouts gehören. Seiten innerhalb einer Zone nutzen deren eigene not-found.js.
import "./globals.css";
import Wurzel, { viewport } from "@/components/Wurzel/Wurzel";
import NichtGefundenSeite from "@/components/Wurzel/NichtGefundenSeite";

export { viewport };
export const metadata = {
  title: "Seite nicht gefunden | ÖkoInvest",
  robots: { index: false, follow: true },
};

export default function GlobalNotFound() {
  return (
    <Wurzel lang="de">
      <NichtGefundenSeite />
    </Wurzel>
  );
}
