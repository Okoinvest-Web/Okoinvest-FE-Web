// /einladung/lieferant/[token] – Einladung eines Energieversorgers ins Versorger-Portal (öffentlich, noindex).
// Zeigt nur Versorgername und maskierte E-Mail; Annahme legt ggf. das Konto an (Rolle „lieferant“).

import { Karte } from "@/components/Portal/ui";
import { EinladungAnnehmen } from "@/components/Portal/Energie/Formulare";
import { aktuellerNutzer } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { LIEFERANT_BEDINGUNGEN } from "@/lib/plattform/energie/texte";

export const metadata = { title: "Einladung Versorger-Portal | ÖkoInvest", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LieferantEinladung({ params }) {
  const { token } = await params;
  const t = String(token || "").slice(0, 200);
  const [info, n] = await Promise.all([energieBackend().energieEinladungInfo(t).catch(() => ({ gueltig: false })), aktuellerNutzer().catch(() => null)]);
  return (
    <section className="bg-sand-50 py-14 md:py-20">
      <div className="ov-container max-w-3xl">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Versorger-Portal</p>
        <h1 className="mt-2 font-display text-[28px] font-extrabold leading-tight tracking-tight text-ink-900 md:text-[36px]">Einladung zur Angebotsabgabe</h1>
        {info.gueltig ? (
          <div className="mt-6 grid gap-6">
            <p className="text-[16px] leading-relaxed text-ink-700">
              ÖkoInvest lädt <strong>{info.lieferant}</strong> ein, Angebote für die Stromlieferung an Gewerbe- und Industriekunden abzugeben. Die Einladung gilt für <strong>{info.email}</strong> bis {new Date(info.ablauf).toLocaleDateString("de-DE")}.
            </p>
            <Karte titel={n ? "Einladung annehmen" : info.kontoVorhanden ? "Anmelden" : "Konto anlegen"}>
              <EinladungAnnehmen token={t} angemeldet={!!n} kontoVorhanden={info.kontoVorhanden} />
            </Karte>
            <Karte titel="Teilnahmebedingungen">
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{LIEFERANT_BEDINGUNGEN}</p>
            </Karte>
            <p className="text-[13px] text-ink-500">Nach der Anmeldung verifizieren Sie Ihr Unternehmen (KYB) unter „Verifizierung“ – Voraussetzung für verbindliche Angebote und Zuschläge.</p>
          </div>
        ) : (
          <p className="mt-6 text-[16px] leading-relaxed text-ink-700">Diese Einladung ist ungültig, abgelaufen oder wurde bereits angenommen. Bitte wenden Sie sich an Ihren Ansprechpartner bei ÖkoInvest.</p>
        )}
      </div>
    </section>
  );
}
