import PortalRahmen from "@/components/Portal/PortalRahmen";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend, istDemo } from "@/lib/plattform/backend";
import { nutzerFuerBrowser } from "@/lib/plattform/server/route";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { template: "%s | Portal ÖkoInvest", default: "Portal | ÖkoInvest" },
  robots: { index: false, follow: false, nocache: true },
};

export default async function PortalLayout({ children }) {
  const nutzer = await portalNutzer();
  let ungelesen = 0;
  try {
    const threads = await backend().nachrichtenThreads(nutzer);
    ungelesen = threads.reduce((s, t) => s + (t.ungelesen || 0), 0);
  } catch {
    // Zähler ist nicht kritisch
  }
  return (
    <PortalRahmen nutzer={nutzerFuerBrowser(nutzer)} ungelesen={ungelesen} demo={istDemo()}>
      {children}
    </PortalRahmen>
  );
}
