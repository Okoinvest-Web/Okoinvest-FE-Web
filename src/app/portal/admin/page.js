import Link from "next/link";
import { AlarmClock, ArrowRight, CheckCircle2, ClipboardList, Coins, FileSignature, FileSpreadsheet, KeyRound, LandPlot, MessagesSquare, ShieldCheck, TrendingUp, UserX } from "lucide-react";
import { AufgabenListe } from "@/components/Portal/Aufgaben";
import ErsteSchritte from "@/components/Portal/Bedienung/Onboarding/ErsteSchritte"; // Onboarding B1
import DateiLink from "@/components/Portal/DateiLink";
import { Hinweis } from "@/components/Portal/ui";
import { EXPORTE } from "@/lib/plattform/csv";
import { Karte, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import KpiKachel from "@/components/ui/KpiKachel";
import Stagger from "@/components/ui/Stagger";
import Reveal from "@/components/ui/Reveal";
import { cn } from "@/components/ui/cn";
import { KeineAufgaben } from "@/components/illustrationen";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend } from "@/lib/plattform/backend";
import { PROZESSE, statusLabel } from "@/lib/plattform/prozesse";
import { VORGANG_TYPEN } from "@/lib/plattform/konstanten";
import { eur, relativ } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Backoffice-Cockpit" };

const ZEITZONE = "Europe/Berlin";

function begruessung(jetzt = new Date()) {
  const stunde = Number(new Intl.DateTimeFormat("de-DE", { hour: "numeric", hourCycle: "h23", timeZone: ZEITZONE }).format(jetzt));
  if (stunde >= 5 && stunde < 11) return "Guten Morgen";
  if (stunde >= 11 && stunde < 18) return "Guten Tag";
  return "Guten Abend";
}

/** Neue Einträge je Woche (älteste zuerst) */
function jeWoche(liste, feld, wochen = 8) {
  const jetzt = Date.now();
  const werte = new Array(wochen).fill(0);
  for (const x of liste) {
    const t = new Date(x[feld]).getTime();
    if (!Number.isFinite(t)) continue;
    const i = Math.floor((jetzt - t) / (7 * 864e5));
    if (i >= 0 && i < wochen) werte[wochen - 1 - i] += 1;
  }
  return werte;
}

/** Große Zähler ruhig halten: ab 100 „99+“ (genaue Zahl für Screenreader) */
function zaehlerText(wert) {
  return wert > 99 ? "99+" : fmt(wert);
}

/** Horizontaler Trichter (eine Farbe, Werte direkt beschriftet, Balken wachsen beim Einscrollen) */
function Trichter({ stufen, label }) {
  const max = Math.max(1, ...stufen.map((s) => s.anzahl));
  return (
    <Reveal as="ol" dir="ohne" className="space-y-2.5" aria-label={label}>
      {stufen.map((s, i) => {
        const vorher = i > 0 ? stufen[i - 1].anzahl : null;
        const quote = vorher ? Math.round((s.anzahl / vorher) * 100) : null;
        return (
          <li key={s.label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.5rem] items-center gap-3 text-[13.5px]">
            <span className="truncate text-ink-600" title={s.label}>{s.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-ink-100">
              <span className="ov-balken-x block h-3 rounded-full bg-ov-500" style={{ width: `${Math.max(2, (s.anzahl / max) * 100)}%`, "--i": i }} />
            </span>
            <span className="text-right">
              <span className="ov-num font-bold text-ink-900">{fmt(s.anzahl)}</span>
              {quote !== null && <span className="ml-1.5 text-[12px] text-ink-500">{quote} %</span>}
            </span>
          </li>
        );
      })}
    </Reveal>
  );
}

export default async function AdminCockpit() {
  const n = await portalNutzer({ admin: true });
  const b = backend();
  const [u, aktivitaeten, alleVorgaenge] = await Promise.all([
    b.adminUebersicht(n),
    b.aktivitaeten(n, { limit: 12 }),
    b.vorgaenge(n, { alle: true }).catch(() => []), // nur für den Wochenverlauf (Anzahl je Woche)
  ]);

  // dringend: Verzug bzw. niemand kümmert sich – alles andere ist normale Arbeit
  const todos = [
    { icon: AlarmClock, label: "Überfällige Wiedervorlagen", wert: u.aufgaben?.ueberfaellig || 0, href: "/portal/admin/aufgaben?ansicht=ueberfaellig", dringend: true },
    { icon: UserX, label: "Offen ohne Zuständigen", wert: u.vorgaenge.ohneZustaendig, href: "/portal/admin/vorgaenge?ohne=1", dringend: true },
    { icon: ShieldCheck, label: "Projekte in Prüfung", wert: u.projekte.inPruefung, href: "/portal/admin/projekte" },
    { icon: FileSignature, label: "LOIs zu entscheiden", wert: u.interessen.loiOffen, href: "/portal/admin/interessen?ansicht=loi" },
    { icon: KeyRound, label: "NDA-Anfragen offen", wert: u.interessen.ndaOffen, href: "/portal/admin/interessen?ansicht=nda" },
    { icon: ClipboardList, label: "Neue Vorgänge", wert: u.vorgaenge.status.eingegangen || 0, href: "/portal/admin/vorgaenge?status=eingegangen" },
    { icon: MessagesSquare, label: "Ungelesene Nachrichten", wert: u.nachrichten.ungelesen, href: "/portal/nachrichten?filter=ungelesen" },
  ];
  const offen = todos.filter((t) => t.wert > 0);
  const erledigt = todos.filter((t) => !t.wert);
  const a = u.aufgaben || { meine: [], meineOffen: 0, meineUeberfaellig: 0 };

  const verlauf = alleVorgaenge.length >= 3 ? jeWoche(alleVorgaenge, "erstelltAm") : null;
  const trend = verlauf ? { wert: verlauf[7] - verlauf[6], text: "neu ggü. Vorwoche", einheit: "" } : undefined;
  const heute = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: ZEITZONE }).format(new Date());

  return (
    <div className="space-y-6 md:space-y-8">
      <SeitenKopf
        eyebrow={`Backoffice · ${heute}`}
        titel="Cockpit"
        text={`${begruessung()}, ${n.vorname}. ${offen.length ? `${offen.length} ${offen.length === 1 ? "Bereich wartet" : "Bereiche warten"} heute auf Sie – Dringendes steht vorn.` : "Heute ist alles abgearbeitet."}`}
      />

      {a.meineUeberfaellig > 0 && (
        <Hinweis ton="warn" icon={AlarmClock} titel={`${a.meineUeberfaellig} ${a.meineUeberfaellig === 1 ? "Wiedervorlage ist" : "Wiedervorlagen sind"} überfällig`}>
          Bitte erledigen oder neu terminieren – <Link href="/portal/admin/aufgaben?ansicht=meine" className="font-semibold underline">zu meinen Aufgaben</Link>.
        </Hinweis>
      )}

      {/* Heute zu tun – die erhabene Karte dieser Ansicht */}
      <Karte titel="Heute zu tun" untertitel={offen.length ? "Nach Dringlichkeit: Verzug und fehlende Zuständigkeit zuerst" : "Alle Warteschlangen sind leer"} ton="erhaben" className="ov-ein">
        {offen.length ? (
          <Stagger as="ul" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offen.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.label}>
                  <Link
                    href={t.href}
                    className={cn(
                      "ov-lift ov-press group flex items-center gap-3 rounded-2xl p-4 ring-1",
                      t.dringend ? "bg-sun-50 ring-sun-200 hover:ring-sun-400" : "bg-sand-50 ring-ink-200/60 hover:ring-ov-300"
                    )}
                  >
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1", t.dringend ? "bg-white text-sun-700 ring-sun-200" : "bg-white text-ov-600 ring-ink-200")}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium leading-snug text-ink-800">{t.label}</span>
                      {t.dringend && <span className="text-[12.5px] font-semibold text-sun-700">Dringend</span>}
                    </span>
                    <span aria-hidden="true" className="ov-kpi text-ink-900">{zaehlerText(t.wert)}</span>
                    <span className="sr-only">: {fmt(t.wert)}</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ov-600" />
                  </Link>
                </li>
              );
            })}
          </Stagger>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <KeineAufgaben className="w-36" />
            <p className="font-display text-[16px] font-bold text-ink-900">Nichts offen</p>
            <p className="text-[13.5px] text-ink-500">Neue Vorgänge, Prüfungen und Nachrichten erscheinen hier, sobald sie eingehen.</p>
          </div>
        )}
        {offen.length > 0 && erledigt.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-500">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-ov-600" />
            <span>Erledigt: {erledigt.map((t) => t.label).join(" · ")}</span>
          </p>
        )}
      </Karte>

      <Stagger className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiKachel label="Vorgänge offen" wert={u.vorgaenge.offen} hinweis={`${fmt(u.vorgaenge.neu7)} neu in 7 Tagen · ${fmt(u.vorgaenge.gesamt)} gesamt`} icon={ClipboardList} href="/portal/admin/vorgaenge" verlauf={verlauf?.some(Boolean) ? verlauf : undefined} trend={trend} />
        <KpiKachel label="Flächen in der Pipeline" wert={u.flaechen.ha} einheit="ha" hinweis={`${fmt(u.flaechen.gesamt)} Flächen`} icon={LandPlot} href="/portal/admin/flaechen" />
        <KpiKachel label="Leistung in der Börse" wert={u.projekte.mwpBoerse} stellen={1} einheit="MWp" hinweis={`${fmt((u.projekte.status.veroeffentlicht || 0) + (u.projekte.status.reserviert || 0))} Projekte sichtbar`} icon={TrendingUp} href="/portal/admin/projekte" />
        <KpiKachel label="Provisionen offen" wert={eur(u.provisionen.offen)} hinweis={`bezahlt: ${eur(u.provisionen.bezahlt)}`} icon={Coins} href="/portal/admin/deals" ton="dunkel" />
      </Stagger>

      <ErsteSchritte nutzer={n} />{/* Onboarding B1: Einarbeitung je Unterrolle – unter den Arbeitszahlen */}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Karte titel="Meine Aufgaben" untertitel={`${a.meineOffen} offen · ${a.meineUeberfaellig} überfällig`} aktion={<PfeilLink href="/portal/admin/aufgaben">Alle Aufgaben</PfeilLink>}>
          {a.meine?.length ? (
            <AufgabenListe aufgaben={a.meine} leerText="Keine offenen Aufgaben." />
          ) : (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <KeineAufgaben className="w-32" />
              <p className="font-display text-[15px] font-bold text-ink-900">Keine offenen Aufgaben</p>
              <p className="text-[13.5px] text-ink-500">Wiedervorlagen, die Ihnen zugewiesen werden, erscheinen hier.</p>
            </div>
          )}
        </Karte>
        <Karte titel="Export (CSV)" untertitel="Excel-kompatibel: UTF-8, Semikolon, Dezimalkomma">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {Object.entries(EXPORTE).map(([k, e]) => (
              <li key={k}>
                <DateiLink href={`/api/admin/export/${k}`} icon={FileSpreadsheet} className="w-full justify-start">{e.titel}</DateiLink>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-ink-500">Jeder Export wird im Aktivitätsprotokoll vermerkt. Personenbezogene Daten nur zweckgebunden verwenden.</p>
        </Karte>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Karte titel="Anfragen-Trichter" untertitel="Vorgänge, die die Stufe erreicht haben · Quote zur Vorstufe" aktion={<PfeilLink href="/portal/admin/vorgaenge">Vorgänge</PfeilLink>}>
          <Trichter label="Anfragen-Trichter" stufen={u.vorgaenge.trichter.map((s) => ({ label: statusLabel("vorgang", s.status), anzahl: s.anzahl }))} />
        </Karte>
        <Karte titel="Flächen-Trichter" untertitel="Flächen, die die Stufe erreicht haben" aktion={<PfeilLink href="/portal/admin/flaechen">Kanban</PfeilLink>}>
          <Trichter label="Flächen-Trichter" stufen={u.flaechen.trichter.map((s) => ({ label: statusLabel("flaeche", s.status), anzahl: s.anzahl }))} />
        </Karte>
        <Karte titel="Börsen-Trichter" untertitel="Vom Inserat zum Abschluss" aktion={<PfeilLink href="/portal/admin/interessen">NDA & LOI</PfeilLink>}>
          <Trichter label="Börsen-Trichter" stufen={u.interessen.trichter.map((s) => ({ label: s.label, anzahl: s.anzahl }))} />
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
                <span className="w-20 shrink-0 text-ink-500">{relativ(a.am)}</span>
                <span className="min-w-0 text-ink-700"><span className="font-semibold text-ink-900">{a.nutzer}</span> · {a.text}</span>
              </li>
            ))}
          </ul>
        </Karte>
      </div>
    </div>
  );
}
