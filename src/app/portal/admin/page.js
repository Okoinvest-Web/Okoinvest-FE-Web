import Link from "next/link";
import { ClipboardList, Coins, FileSignature, KeyRound, LandPlot, MessagesSquare, ShieldCheck, TrendingUp, UserX } from "lucide-react";
import { Karte, Kennzahl, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { PROZESSE, statusLabel } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { eur, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Backoffice-Cockpit" };

/** Horizontaler Trichter (eine Farbe, Werte direkt beschriftet) */
function Trichter({ stufen }) {
  const max = Math.max(1, ...stufen.map((s) => s.anzahl));
  return (
    <ol className="space-y-2.5">
      {stufen.map((s, i) => {
        const vorher = i > 0 ? stufen[i - 1].anzahl : null;
        const quote = vorher ? Math.round((s.anzahl / vorher) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13.5px]">
            <span className="truncate text-ink-600">{s.label}</span>
            <span className="h-3 rounded-full bg-ink-100">
              <span className="block h-3 rounded-full bg-ov-500" style={{ width: `${Math.max(2, (s.anzahl / max) * 100)}%` }} />
            </span>
            <span className="text-right">
              <span className="ov-num font-bold text-ink-900">{fmt(s.anzahl)}</span>
              {quote !== null && <span className="ml-1.5 text-[11.5px] text-ink-500">{quote} %</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function AdminCockpit() {
  const n = await portalNutzer({ admin: true });
  const b = backend();
  const [u, aktivitaeten] = await Promise.all([b.adminUebersicht(n), b.aktivitaeten(n, { limit: 12 })]);

  const todos = [
    { icon: ShieldCheck, label: "Projekte in Prüfung", wert: u.projekte.inPruefung, href: "/portal/admin/projekte" },
    { icon: KeyRound, label: "NDA-Anfragen offen", wert: u.interessen.ndaOffen, href: "/portal/admin/interessen?ansicht=nda" },
    { icon: FileSignature, label: "LOIs zu entscheiden", wert: u.interessen.loiOffen, href: "/portal/admin/interessen?ansicht=loi" },
    { icon: ClipboardList, label: "Neue Vorgänge", wert: u.vorgaenge.status.eingegangen || 0, href: "/portal/admin/vorgaenge?status=eingegangen" },
    { icon: UserX, label: "Offen ohne Zuständigen", wert: u.vorgaenge.ohneZustaendig, href: "/portal/admin/vorgaenge?ohne=1" },
    { icon: MessagesSquare, label: "Ungelesene Nachrichten", wert: u.nachrichten.ungelesen, href: "/portal/nachrichten?filter=ungelesen" },
  ];

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Cockpit" text="Pipeline, Trichter und alles, was heute entschieden werden muss." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="Vorgänge offen" wert={fmt(u.vorgaenge.offen)} hinweis={`${fmt(u.vorgaenge.neu7)} neu in 7 Tagen · ${fmt(u.vorgaenge.gesamt)} gesamt`} icon={ClipboardList} href="/portal/admin/vorgaenge" />
        <Kennzahl label="Flächen in der Pipeline" wert={`${fmt(u.flaechen.ha)} ha`} hinweis={`${fmt(u.flaechen.gesamt)} Flächen`} icon={LandPlot} href="/portal/admin/flaechen" />
        <Kennzahl label="Leistung in der Börse" wert={`${fmt(u.projekte.mwpBoerse, 1)} MWp`} hinweis={`${fmt((u.projekte.status.veroeffentlicht || 0) + (u.projekte.status.reserviert || 0))} Projekte sichtbar`} icon={TrendingUp} href="/portal/admin/projekte" />
        <Kennzahl label="Provisionen offen" wert={eur(u.provisionen.offen)} hinweis={`bezahlt: ${eur(u.provisionen.bezahlt)}`} icon={Coins} href="/portal/admin/deals" ton="dunkel" />
      </div>

      <Karte titel="Zu erledigen">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {todos.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.label}>
                <Link href={t.href} className={`flex items-center gap-3 rounded-2xl p-4 ring-1 transition-colors ${t.wert ? "bg-sun-300/15 ring-sun-400/40 hover:ring-sun-500" : "bg-sand-50 ring-ink-200/60 hover:ring-ov-300"}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-700 ring-1 ring-ink-200"><Icon aria-hidden="true" className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1 text-[14px] font-medium text-ink-700">{t.label}</span>
                  <span className="ov-num font-display text-[22px] font-extrabold text-ink-900">{fmt(t.wert)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Karte>

      <div className="grid gap-6 xl:grid-cols-3">
        <Karte titel="Anfragen-Trichter" untertitel="Vorgänge, die die Stufe erreicht haben · Quote zur Vorstufe" aktion={<PfeilLink href="/portal/admin/vorgaenge">Vorgänge</PfeilLink>}>
          <Trichter stufen={u.vorgaenge.trichter.map((s) => ({ label: statusLabel("vorgang", s.status), anzahl: s.anzahl }))} />
        </Karte>
        <Karte titel="Flächen-Trichter" untertitel="Flächen, die die Stufe erreicht haben" aktion={<PfeilLink href="/portal/admin/flaechen">Kanban</PfeilLink>}>
          <Trichter stufen={u.flaechen.trichter.map((s) => ({ label: statusLabel("flaeche", s.status), anzahl: s.anzahl }))} />
        </Karte>
        <Karte titel="Börsen-Trichter" untertitel="Vom Inserat zum Abschluss" aktion={<PfeilLink href="/portal/admin/interessen">NDA & LOI</PfeilLink>}>
          <Trichter stufen={u.interessen.trichter.map((s) => ({ label: s.label, anzahl: s.anzahl }))} />
        </Karte>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Vorgänge nach Typ">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px]">
            {Object.entries(u.vorgaenge.typ).sort((a, c) => c[1] - a[1]).map(([t, z]) => (
              <li key={t} className="flex justify-between gap-3 border-b border-ink-100 py-1.5">
                <Link href={`/portal/admin/vorgaenge?typ=${t}`} className="text-ink-700 hover:text-ov-700">{VORGANG_TYPEN[t] || t}</Link>
                <span className="ov-num font-semibold text-ink-900">{fmt(z)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-ink-500">Projekte nach Status: {PROZESSE.projekt.pipeline.concat("abgelehnt").map((s) => `${statusLabel("projekt", s)} ${u.projekte.status[s] || 0}`).join(" · ")}</p>
        </Karte>
        <Karte titel="Letzte Aktivität" aktion={<PfeilLink href="/portal/admin/nutzer#protokoll">Protokoll</PfeilLink>}>
          <ul className="space-y-2.5">
            {aktivitaeten.map((a) => (
              <li key={a.id} className="flex gap-3 text-[13.5px]">
                <span className="w-20 shrink-0 text-ink-400">{relativ(a.am)}</span>
                <span className="min-w-0 text-ink-700"><span className="font-semibold text-ink-900">{a.nutzer}</span> · {a.text}</span>
              </li>
            ))}
          </ul>
        </Karte>
      </div>
    </div>
  );
}
