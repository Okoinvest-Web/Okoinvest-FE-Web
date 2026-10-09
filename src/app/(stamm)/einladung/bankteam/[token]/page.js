import Link from "@/components/Land/Link";
import { CircleAlert, Users } from "lucide-react";
import AuthRahmen from "@/components/Plattform/AuthRahmen";
import { TeamEinladungAnnehmen } from "@/components/Portal/Finanzierung/BankAkte";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { bankakteBackend } from "@/lib/plattform/backend/bankakte";
import { datum } from "@/lib/plattform/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Einladung Bank-Team | ÖkoInvest",
  description: "Persönliche Einladung in das Bank-Portal von ÖkoInvest: Finanzierungsanfragen Ihres Hauses gemeinsam im Team bearbeiten – nur nach Anmeldung mit der eingeladenen Adresse.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const knopf = "inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-colors";

export default async function BankTeamEinladung({ params }) {
  const { token: roh } = await params;
  const token = /^[A-Za-z0-9_-]{20,200}$/.test(String(roh || "")) ? roh : "";
  const info = token ? await bankakteBackend().baTeamEinladungInfo(token).catch(() => ({ gueltig: false })) : { gueltig: false };
  const nutzer = info.gueltig ? await aktuellerNutzer().catch(() => null) : null;
  const weiter = encodeURIComponent(`/einladung/bankteam/${token}`);

  if (!info.gueltig) {
    return (
      <AuthRahmen eyebrow="Bank-Team" titel="Link nicht mehr gültig" text="Die Einladung ist abgelaufen, wurde widerrufen oder bereits angenommen. Bitte wenden Sie sich an die Person, die Sie eingeladen hat.">
        <div className="flex items-start gap-3 rounded-2xl bg-sun-300/20 p-4 text-[14px] text-ink-800 ring-1 ring-inset ring-sun-400/40">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Team-Einladungen sind 7 Tage gültig und funktionieren nur einmal.</p>
        </div>
        <Link href="/login?weiter=%2Fportal%2Fbank" className="mt-6 inline-block text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zur Anmeldung</Link>
      </AuthRahmen>
    );
  }

  return (
    <AuthRahmen eyebrow="Einladung für Finanzierungspartner" titel={`Team von ${info.bank || "Ihrem Haus"}`} text="Sie wurden eingeladen, Finanzierungsanfragen von ÖkoInvest im Bank-Portal gemeinsam mit Ihrem Team zu bearbeiten.">
      <div className="space-y-6">
        <dl className="grid gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 sm:grid-cols-2">
          <div className="flex items-start gap-3 sm:col-span-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700"><Users aria-hidden="true" className="h-5 w-5" /></span>
            <div className="min-w-0">
              <dt className="text-[12.5px] text-ink-500">Ihre Rolle</dt>
              <dd className="font-semibold text-ink-900">{info.rolle}</dd>
            </div>
          </div>
          <div><dt className="text-[12.5px] text-ink-500">Für</dt><dd className="break-all text-[14.5px] font-semibold text-ink-900">{info.email}</dd></div>
          <div><dt className="text-[12.5px] text-ink-500">Gültig bis</dt><dd className="text-[14.5px] font-semibold text-ink-900">{datum(info.ablauf)}</dd></div>
        </dl>
        {nutzer ? (
          <>
            <p className="text-[14px] text-ink-600">Angemeldet als <strong className="text-ink-900">{nutzer.email}</strong>. Die Einladung lässt sich nur mit der eingeladenen Adresse annehmen.</p>
            <TeamEinladungAnnehmen token={token} />
          </>
        ) : (
          <>
            <p className="text-[14px] leading-relaxed text-ink-600">Melden Sie sich mit der eingeladenen E-Mail-Adresse an – oder registrieren Sie sich kostenlos, falls Sie noch kein Konto haben.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/login?weiter=${weiter}`} className={`${knopf} bg-ov-600 text-white hover:bg-ov-700`}>Anmelden</Link>
              <Link href={`/registrieren?weiter=${weiter}`} className={`${knopf} bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:ring-ink-300`}>Registrieren</Link>
            </div>
          </>
        )}
      </div>
    </AuthRahmen>
  );
}
