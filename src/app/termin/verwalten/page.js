import Section from "@/components/ui/Section";
import TerminVerwalten from "@/components/Portal/Termine/TerminVerwalten";

// Persönlicher Link aus der Bestätigungs-E-Mail: nicht indexieren, kein Referrer (Token in der URL)
export const metadata = {
  title: "Termin verwalten | ÖkoInvest",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function TerminVerwaltenSeite({ searchParams }) {
  const sp = await searchParams;
  const token = typeof sp?.token === "string" ? sp.token.slice(0, 100) : "";
  return (
    <Section tone="sand" space="md">
      <div className="mx-auto max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Ihr Termin</p>
        <h1 className="ov-h2 mt-2 text-ink-900">Termin verschieben oder absagen</h1>
        <p className="ov-lead mt-3 text-ink-600">Änderungen sind bis zum Beginn des Termins möglich. Sie erhalten eine neue Bestätigung mit Kalenderdatei.</p>
        <div className="mt-8">
          <TerminVerwalten token={token} />
        </div>
      </div>
    </Section>
  );
}
