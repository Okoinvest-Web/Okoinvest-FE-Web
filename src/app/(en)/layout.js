// Root-Layout der englischen Seiten (/en/**): <html lang="en"> serverseitig.
import "../globals.css";
import Wurzel, { basisMetadata, viewport } from "@/components/Wurzel/Wurzel";

export { viewport };
export const metadata = basisMetadata({ ogLocale: "en_GB" });

export default function EnRootLayout({ children }) {
  return <Wurzel lang="en">{children}</Wurzel>;
}
