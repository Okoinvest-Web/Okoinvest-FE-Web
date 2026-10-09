import Link from "@/components/Land/Link";
import { Building2, CircleAlert } from "lucide-react";
import AuthRahmen from "@/components/Plattform/AuthRahmen";
import EinladungAnnehmen from "@/components/Plattform/EinladungAnnehmen";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { ORGANISATION_ARTEN, TEAM_ROLLEN, teamRolleLabel } from "@/lib/plattform/organisation";
import { datum } from "@/lib/plattform/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Einladung ins Team | ÖkoInvest",
  description: "Einladung in eine Organisation im Portal von ÖkoInvest: Flächen, Projekte und Interessen gemeinsam im Team bearbeiten – mit klaren Rollen und Rechten.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const knopf = "inline-flex h-12 flex-1 items-center justify-center rounded-full px-6 text-[15px] font-semibold transition-colors";

export default async function Einladung({ params }) {
  const { token: roh } = await params;
  const token = /^[A-Za-z0-9_-]{20,200}$/.test(String(roh || "")) ? roh : "";
  const info = token ? await sicherheit().einladungInfo(token).catch(() => ({ gueltig: false })) : { gueltig: false };
  const nutzer = info.gueltig ? await aktuellerNutzer().catch(() => null) : null;
  const weiter = encodeURIComponent(`/einladung/${token}`);

  if (!info.gueltig) {
    return (
      <AuthRahmen eyebrow="Einladung" titel="Einladung nicht mehr gültig" text="Die Einladung ist abgelaufen, wurde widerrufen oder bereits angenommen. Bitten Sie die einladende Person um eine neue Einladung.">
        <div className="flex items-start gap-3 rounded-2xl bg-sun-300/20 p-4 text-[14px] text-ink-800 ring-1 ring-inset ring-sun-400/40">
          <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Einladungslinks sind 7 Tage gültig und funktionieren nur einmal.</p>
        </div>
        <Link href="/login" className="mt-6 inline-block text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zur Anmeldung</Link>
      </AuthRahmen>
    );
  }

  return (
    <AuthRahmen eyebrow="Einladung ins Team" titel={`Team „${info.organisation.name}“`} text={`${info.eingeladenVon || "Ein Teammitglied"} lädt Sie ein, im Portal von ÖkoInvest mitzuarbeiten.`}>
      <div className="space-y-6">
        <dl className="grid gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70 sm:grid-cols-2">
          <div className="flex items-start gap-3 sm:col-span-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
              <Building2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <dt className="sr-only">Organisation</dt>
              <dd className="break-words font-semibold text-ink-900">{info.organisation.name}</dd>
              <dd className="text-[13px] text-ink-600">{ORGANISATION_ARTEN[info.organisation.art]?.label}</dd>
            </div>
          </div>
          <div>
            <dt className="text-[12.5px] text-ink-500">Ihre Rolle</dt>
            <dd className="text-[14.5px] font-semibold text-ink-900">{teamRolleLabel(info.rolle)}</dd>
            <dd className="text-[12.5px] text-ink-600">{TEAM_ROLLEN[info.rolle]?.text}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-ink-500">Für</dt>
            <dd className="break-all text-[14.5px] font-semibold text-ink-900">{info.email}</dd>
            <dd className="text-[12.5px] text-ink-600">gültig bis {datum(info.ablauf)}</dd>
          </div>
        </dl>

        {nutzer ? (
          <>
            <p className="text-[14px] text-ink-600">
              Angemeldet als <strong className="text-ink-900">{nutzer.email}</strong>. Die Einladung lässt sich nur mit der eingeladenen Adresse annehmen.
            </p>
            <EinladungAnnehmen token={token} />
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
