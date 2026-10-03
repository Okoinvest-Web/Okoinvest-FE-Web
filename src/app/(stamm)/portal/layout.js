import PortalRahmen from "@/components/Portal/PortalRahmen";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend, istDemo } from "@/lib/plattform/backend";
import { nutzerFuerBrowser } from "@/lib/plattform/server/route";

export const dynamic = "force-dynamic";

export const metadata = {
  title: { template: "%s | Portal ÖkoInvest", default: "Portal | ÖkoInvest" },
  robots: { index: false, follow: false, nocache: true },
  // PWA des Portals (Bedienung & Onboarding): eigenes Manifest mit start_url /portal
  manifest: "/portal.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "ÖkoInvest", statusBarStyle: "default" },
};

export default async function PortalLayout({ children }) {
  const nutzer = await portalNutzer();
  const b = backend();
  const admin = nutzer.rollen?.includes("admin");
  // Zähler sind nicht kritisch – Fehler dürfen das Portal nicht blockieren
  const [threads, hinweise, aufgaben] = await Promise.all([
    b.nachrichtenThreads(nutzer).catch(() => []),
    b.benachrichtigungen(nutzer, { limit: 8 }).catch(() => ({ eintraege: [], ungelesen: 0 })),
    admin ? b.aufgaben(nutzer, { zustaendigId: nutzer.id, status: "offen" }).catch(() => []) : [],
  ]);
  const ungelesen = threads.reduce((s, t) => s + (t.ungelesen || 0), 0);
  const aufgabenFaellig = aufgaben.filter((a) => a.ueberfaellig || a.heuteFaellig).length;
  return (
    <PortalRahmen
      nutzer={nutzerFuerBrowser(nutzer)}
      ungelesen={ungelesen}
      hinweise={{ eintraege: hinweise.eintraege, ungelesen: hinweise.ungelesen }}
      aufgabenFaellig={aufgabenFaellig}
      demo={istDemo()}
    >
      {children}
    </PortalRahmen>
  );
}
