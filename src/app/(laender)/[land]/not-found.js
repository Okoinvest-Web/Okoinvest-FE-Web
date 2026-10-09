// 404 in den Länderfassungen (/de, /at, /ch …). Linkziele bleiben im Land der Seite
// (Link-Komponente src/components/Land/Link.js liest das Land aus dem Root-Layout).
import NichtGefundenSeite from "@/components/Wurzel/NichtGefundenSeite";

export const metadata = {
  title: "Seite nicht gefunden | ÖkoInvest",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NichtGefundenSeite />;
}
