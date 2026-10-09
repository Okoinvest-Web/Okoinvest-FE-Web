// Root-Layout der Länderfassungen /de, /at, /ch (Ländermodell nach Vorgabe des Inhabers).
// Gleiches Design wie die gemeinsamen Seiten (src/app/(stamm)/layout.js): derselbe Rahmen
// (Wurzel), nur <html lang> je Land (de-DE, de-AT, de-CH) und das Land als Kontext für alle
// Client-Komponenten (Navigation, Links, Rechner).
// Unbekannte Präfixe: Die Seite ruft seitenLand(params) auf → 404 (src/lib/land/seite.js).
import "../../globals.css";
import Wurzel, { basisMetadata, viewport } from "@/components/Wurzel/Wurzel";
import { LAND_CODES, landAusPraefix, landInfo } from "@/lib/land";

export { viewport };

export function generateStaticParams() {
  return LAND_CODES.map((c) => ({ land: landInfo(c).praefix }));
}

export async function generateMetadata({ params }) {
  const { land } = await params;
  const info = landInfo(landAusPraefix(land)) || landInfo("DE");
  return basisMetadata({ ogLocale: info.ogLocale });
}

export default async function LaenderLayout({ children, params }) {
  const { land } = await params;
  const code = landAusPraefix(land);
  const info = landInfo(code) || landInfo("DE");
  return (
    <Wurzel lang={info.lang} land={code}>
      {children}
    </Wurzel>
  );
}
