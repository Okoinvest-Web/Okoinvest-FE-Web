import AuthRahmen from "@/components/Plattform/AuthRahmen";
import MagicLinkEinloesen from "@/components/Plattform/MagicLinkEinloesen";
import { abs } from "@/data/site";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Anmelde-Link | ÖkoInvest",
  description: "Passwortlose Anmeldung im Portal von ÖkoInvest: Mit dem einmaligen Link aus Ihrer E-Mail melden Sie sich sicher an – er ist 15 Minuten gültig.",
  alternates: { canonical: abs("/login/link") },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AnmeldeLink({ searchParams }) {
  const sp = await searchParams;
  const token = typeof sp?.token === "string" && /^[A-Za-z0-9_-]{20,200}$/.test(sp.token) ? sp.token : "";
  return (
    <AuthRahmen eyebrow="Anmelde-Link" titel={token ? "Anmeldung bestätigen" : "Link unvollständig"} text={token ? "Ein Klick genügt – der Link ist einmalig und 15 Minuten gültig." : "Der Link ist unvollständig. Bitte öffnen Sie ihn direkt aus der E-Mail oder fordern Sie einen neuen an."}>
      <MagicLinkEinloesen token={token} />
    </AuthRahmen>
  );
}
