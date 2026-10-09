// Englische Länderfassungen /en/de, /en/at, /en/ch (Sprachmodell): nur die gültigen Länderpräfixe.
// Kein eigener Rahmen – das Root-Layout src/app/(en)/layout.js setzt <html lang="en">, das Land
// liest der Browser-Kontext aus dem Pfad (LandProvider), die Seite aus params.land (seitenLand).
import { LAND_CODES, landInfo } from "@/lib/land";

export function generateStaticParams() {
  return LAND_CODES.map((c) => ({ land: landInfo(c).praefix }));
}

export default function EnglischeLaenderLayout({ children }) {
  return children;
}
