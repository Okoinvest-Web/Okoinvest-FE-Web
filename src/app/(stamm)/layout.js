// Root-Layout des neutralen Stamms und der präfixlosen Bereiche (Portal, Login, Token-Strecken).
// <html lang="de">: Stammseiten richten sich an alle drei Länder (Zonenmodell, src/lib/land/zonen.js).
import "../globals.css";
import Wurzel, { basisMetadata, viewport } from "@/components/Wurzel/Wurzel";

export { viewport };
export const metadata = basisMetadata({ ogLocale: "de_DE" });

export default function StammLayout({ children }) {
  return <Wurzel lang="de">{children}</Wurzel>;
}
