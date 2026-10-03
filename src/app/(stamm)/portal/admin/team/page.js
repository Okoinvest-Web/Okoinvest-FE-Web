import { BookOpen, Clock, Gauge, Plane, Users } from "lucide-react";
import { Hinweis, Karte, Kennzahl, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import TeamListe from "@/components/Portal/Team/TeamListe";
import { AbwesenheitFormular, Zeiterfassung } from "@/components/Portal/Team/TeamFormulare";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { serviceBackend } from "@/lib/plattform/backend/service";

export const metadata = { title: "Team & Zeiten" };

export default async function TeamSeite() {
  const n = await portalNutzer({ admin: true });
  const s = serviceBackend();
  const [team, zeiten, integrationen, projekte] = await Promise.all([
    laden(() => s.team(n)),
    laden(() => s.zeiten(n, {})),
    s.ablageStatus(n).catch(() => null),
    backend().projekte(n, { alle: true }).catch(() => []),
  ]);
  const m = team.mitarbeiter;
  const abwesend = m.filter((x) => x.abwesendHeute).length;
  const schnitt = m.length ? Math.round(m.reduce((a, x) => a + x.auslastung.prozent, 0) / m.length) : 0;
  const stunden = m.reduce((a, x) => a + x.stundenMonat, 0);

  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Steuerung" titel="Team & Zeiten" text="Wer ist da, wer vertritt wen, wie ausgelastet ist das Team – und auf welche Projekte laufen die Stunden. Abwesenheiten übergeben Aufgaben, Termine und Tickets automatisch an die Vertretung." aktionen={<PfeilLink href="/portal/admin/wissen">Wissensdatenbank</PfeilLink>} />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={Users} label="Mitarbeiter" wert={String(m.length)} />
        <Kennzahl icon={Plane} label="Heute abwesend" wert={String(abwesend)} />
        <Kennzahl icon={Gauge} label="Ø Auslastung (7 Tage)" wert={`${schnitt} %`} />
        <Kennzahl icon={Clock} label="Stunden diesen Monat" wert={String(Math.round(stunden * 10) / 10).replace(".", ",")} />
      </section>
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="team-h">
            <h2 id="team-h" className="mb-3 font-display text-[18px] font-bold text-ink-900">Team</h2>
            <TeamListe mitarbeiter={m} darfBearbeiten={team.darfBearbeiten} />
          </section>
          <Karte titel="Zeiterfassung" untertitel="Stunden auf Projekte – Auswertung für Projektentwicklung und Finanzen (mit HRMS als Timesheet)">
            <Zeiterfassung projekte={projekte.map((p) => ({ id: p.id, titel: `${p.titel} (${p.id})` }))} eintraege={zeiten.eintraege.filter((z) => z.kontoId === n.id)} summe={zeiten.eintraege.filter((z) => z.kontoId === n.id).reduce((a, z) => a + z.stunden, 0)} monat={zeiten.monat.split("-").reverse().join("/")} />
          </Karte>
        </div>
        <aside className="min-w-0 space-y-6">
          <Karte titel="Abwesenheit eintragen" untertitel="Übergibt Termine, fällige Aufgaben und offene Tickets an die Vertretung">
            <AbwesenheitFormular konten={m.map((x) => ({ id: x.id, name: x.name }))} ichId={n.id} darfAndere={team.darfBearbeiten} />
          </Karte>
          {zeiten.jeProjekt?.length > 0 && (
            <Karte titel="Stunden je Projekt" untertitel={zeiten.monat.split("-").reverse().join("/")}>
              <ul className="space-y-1.5 text-[13.5px]">
                {zeiten.jeProjekt.slice(0, 8).map((p) => (
                  <li key={p.projektId || p.erpProjekt} className="flex justify-between gap-3"><span className="truncate text-ink-700">{projekte.find((x) => x.id === p.projektId)?.titel || p.erpProjekt || p.projektId}</span><span className="ov-num font-semibold text-ink-900">{String(p.stunden).replace(".", ",")} h</span></li>
                ))}
              </ul>
            </Karte>
          )}
          {integrationen && (
            <Karte titel="Integrationen (optional)" untertitel="Frappe-Apps – nur aktiv, wenn installiert und freigeschaltet">
              <ul className="space-y-3 text-[13px] leading-relaxed text-ink-600">
                {[["HRMS", integrationen.hrms], ["Frappe Drive", integrationen.drive], ["Helpdesk", integrationen.helpdesk]].map(([name, x]) => (
                  <li key={name}>
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${x?.aktiv ? "bg-ov-500" : "bg-ink-300"}`} aria-hidden="true" />
                    <strong className="text-ink-900">{name}</strong> – {x?.aktiv ? "aktiv" : "nicht aktiv"}. {x?.hinweis}
                  </li>
                ))}
              </ul>
            </Karte>
          )}
          <Hinweis ton="neutral" icon={BookOpen} titel="Wissen teilen">Abläufe, Checklisten und Rechtsfragen gehören in die interne <a href="/portal/admin/wissen" className="font-semibold text-ov-700 hover:underline">Wissensdatenbank</a> – nur für das Backoffice sichtbar.</Hinweis>
        </aside>
      </div>
    </>
  );
}
