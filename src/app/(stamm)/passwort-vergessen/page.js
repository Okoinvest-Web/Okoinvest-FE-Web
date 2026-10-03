import AuthRahmen from "@/components/Plattform/AuthRahmen";
import { PasswortAnfordern, PasswortSetzen } from "@/components/Plattform/PasswortFormular";
import { abs } from "@/data/site";
import { istDemo } from "@/lib/plattform/backend";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Passwort vergessen | ÖkoInvest",
  description: "Passwort für das Portal von ÖkoInvest zurücksetzen: Wir senden Ihnen einen einmaligen Link, mit dem Sie ein neues Passwort festlegen können.",
  alternates: { canonical: abs("/passwort-vergessen") },
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PasswortVergessen({ searchParams }) {
  const sp = await searchParams;
  const token = typeof sp?.token === "string" && /^[A-Za-z0-9_-]{20,200}$/.test(sp.token) ? sp.token : "";

  return token ? (
    <AuthRahmen eyebrow="Passwort" titel="Neues Passwort festlegen" text="Der Link ist einmalig und eine Stunde gültig. Danach sind Sie direkt angemeldet; andere Sitzungen werden beendet.">
      <PasswortSetzen token={token} />
    </AuthRahmen>
  ) : (
    <AuthRahmen eyebrow="Passwort" titel="Passwort vergessen?" text="Geben Sie die E-Mail-Adresse Ihres Kontos ein. Wir senden Ihnen einen Link, mit dem Sie ein neues Passwort festlegen.">
      <PasswortAnfordern demo={istDemo()} />
    </AuthRahmen>
  );
}
