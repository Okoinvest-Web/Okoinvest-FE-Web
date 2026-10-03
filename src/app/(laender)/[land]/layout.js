// Root-Layout der Länderzonen /de, /at, /ch (Welle 2, Masterplan Abschnitt 4).
// <html lang> je Land (de-DE, de-AT, de-CH) aus src/lib/land. Unbekannte Präfixe: 404
// (dynamicParams = false); welche Seiten es je Land gibt, entscheidet stufen.js je Seite.
import "../../globals.css";
import Wurzel, { basisMetadata, viewport } from "@/components/Wurzel/Wurzel";
import { LAND_CODES, landAusPraefix, landInfo } from "@/lib/land";

export { viewport };
export const dynamicParams = false;

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
  const info = landInfo(landAusPraefix(land)) || landInfo("DE");
  return <Wurzel lang={info.lang}>{children}</Wurzel>;
}
