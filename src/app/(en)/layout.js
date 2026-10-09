// Root-Layout der englischen Seiten (/en/**, Sprachmodell): <html lang="en"> serverseitig.
// Gleicher Rahmen wie die deutschen Seiten (Wurzel) – nur die Sprache als Kontext. Das Land
// (/en/at/… → AT) kommt im Browser aus dem Pfad, auf dem Server aus params.land der Seite.
import "../globals.css";
import Wurzel, { LAND_AUS_PFAD, basisMetadata, viewport } from "@/components/Wurzel/Wurzel";

export { viewport };
export const metadata = basisMetadata({ ogLocale: "en_GB", sprache: "en" });

export default function EnRootLayout({ children }) {
  return (
    <Wurzel lang="en" sprache="en" land={LAND_AUS_PFAD}>
      {children}
    </Wurzel>
  );
}
