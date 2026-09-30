// /portal/admin/einarbeitung – Einarbeitungsstand des Backoffice-Teams (Onboarding-Assistenten, Team B1).
// Nur Unterrolle „Leitung“ (sonst 404). Stand aus echten Daten (2FA, Profil, erste erledigte Aufgabe, Gebiete) und
// bestätigten Kurzanleitungen je Unterrolle. Dazu der Erinnerungslauf für externe Konten (im Betrieb: Frappe-Scheduler).

import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import Button from "@/components/ui/Button";
import ErinnerungslaufKnopf from "@/components/Portal/Bedienung/Onboarding/ErinnerungslaufKnopf";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { onboardingBackend } from "@/lib/plattform/backend/onboarding";
import { BACKOFFICE_ROLLEN, unterrollen } from "@/lib/plattform/rechte";
import { datum } from "@/lib/plattform/format";

export const metadata = { title: "Einarbeitung" };

export default async function Einarbeitung() {
  const n = await portalNutzer({ admin: true });
  if (!unterrollen(n).includes("leitung")) notFound();
  const team = await laden(() => onboardingBackend().onbTeam(n));
  const fertig = team.filter((t) => t.abgeschlossen || t.offen.every((o) => !o.pflicht)).length;
  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Steuerung"
        titel="Einarbeitung des Teams"
        text="Stand je Konto aus echten Daten: Zwei-Faktor-Anmeldung, Profil, erste erledigte Aufgabe und die Kurzanleitungen der jeweiligen Unterrolle. Pflichtpunkte sind markiert."
        aktionen={<><Button href="/portal/willkommen" variant="secondary" size="sm">Eigene Einarbeitung</Button><ErinnerungslaufKnopf /></>}
      />
      <Karte titel={`${team.length} Backoffice-Konten`} untertitel={`${fertig} mit allen Pflichtpunkten`}>
        {team.length ? (
          <ul className="divide-y divide-ink-100">
            {team.map((t) => (
              <li key={t.id} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.6fr)] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">{t.name}</p>
                  <p className="truncate text-[13px] text-ink-500">{t.email}</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {t.unterrollen.map((r) => <span key={r} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink-600">{BACKOFFICE_ROLLEN[r]?.label || r}</span>)}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-between text-[13px] text-ink-600"><span>{t.erledigt} von {t.gesamt}</span><span className="font-semibold text-ink-900">{t.quote} %</span></div>
                  <div className="mt-1 h-2 rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={t.quote} aria-label={`Einarbeitung ${t.name}`}>
                    <div className={`h-2 rounded-full ${t.quote === 100 ? "bg-ov-600" : "bg-ov-400"}`} style={{ width: `${Math.max(4, t.quote)}%` }} />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-500">{t.gestartetAm ? `Begonnen ${datum(t.gestartetAm)}` : "Noch nicht begonnen"}{t.letzterLogin ? ` · zuletzt angemeldet ${datum(t.letzterLogin)}` : ""}</p>
                </div>
                <div className="min-w-0">
                  {t.offen.length ? (
                    <p className="flex flex-wrap gap-1.5">
                      {t.offen.map((o) => (
                        <span key={o.id} className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${o.pflicht ? "bg-white text-ink-900 ring-ov-300" : "bg-sand-50 text-ink-500 ring-ink-200"}`}>
                          {o.kurz}{o.pflicht ? " *" : ""}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="text-[13.5px] font-semibold text-ov-700">Alles erledigt</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Leer icon={GraduationCap} titel="Keine Backoffice-Konten" text="Neue Konten legen Sie unter „Nutzer & Protokoll“ an." />
        )}
        <p className="mt-4 text-[12.5px] text-ink-500">* Pflichtpunkt der Einarbeitung. Offene Punkte sind kein Leistungsmaß – sie zeigen, wo eine kurze Einweisung hilft.</p>
      </Karte>
    </>
  );
}
