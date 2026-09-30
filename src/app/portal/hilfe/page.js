import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Keyboard, MessagesSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { AppInstallation, KuerzelUebersicht } from "@/components/Portal/Bedienung/HilfeTeile";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { PROVISION } from "@/lib/invest/markt";

export const metadata = { title: "Hilfe & Tastenkürzel" };

const hat = (n, ...r) => r.some((x) => n.rollen.includes(x)) || n.rollen.includes("admin");

function fragen(n) {
  const liste = [
    { f: "Wo sehe ich, wie weit meine Anfrage ist?", a: "Unter „Meine Anfragen“ zeigt jede Anfrage ihren Status und den Fortschritt Schritt für Schritt. Änderungen des Backoffice sehen Sie sofort – zusätzlich in der Glocke oben rechts." },
    { f: "Wie erreiche ich das Backoffice?", a: "Über „Nachrichten“: Jede Anfrage, Fläche und jedes Projekt hat einen eigenen Nachrichtenverlauf. Allgemeine Fragen schreiben Sie direkt aus der Nachrichtenübersicht." },
    { f: "Welche E-Mails bekomme ich?", a: "Das legen Sie unter „Benachrichtigungen“ selbst fest. E-Mails enthalten nie Nachrichtentexte oder vertrauliche Projektdaten – nur den Hinweis, dass im Portal etwas Neues liegt." },
  ];
  if (hat(n, "flaeche", "landwirt")) {
    liste.push({ f: "Was kostet die Prüfung meiner Fläche?", a: `Die Vorprüfung ist ${PROVISION.flaeche.text}. Sie erhalten eine ehrliche Ersteinschätzung – auch wenn die Fläche nicht passt.` });
    liste.push({ f: "Welche Angaben brauche ich für eine Fläche?", a: "Für den Anfang genügen Bezeichnung, Ort und ungefähre Größe. Flurstücke und Unterlagen (z. B. Lageplan, Grundbuchauszug) können Sie später ergänzen – die Checkliste auf der Flächenseite zeigt, was noch fehlt." });
  }
  if (hat(n, "investor")) {
    liste.push({ f: "Wie komme ich an die vertraulichen Projektdaten?", a: "Auf der Projektseite fragen Sie per Klick eine Vertraulichkeitsvereinbarung (NDA) an. Nach Freigabe öffnet sich der Datenraum mit allen Unterlagen." });
    liste.push({ f: "Wie funktioniert der Matching-Score?", a: "Aus Ihrem Suchprofil (Größe, Phasen, Länder, Ticket) berechnen wir für jedes Projekt eine Passung in Prozent. Ab der von Ihnen gewählten Schwelle melden wir neue Treffer." });
  }
  if (hat(n, "anbieter")) {
    liste.push({ f: "Wer sieht mein Projekt?", a: "Öffentlich erscheint nur ein anonymer Teaser. Vertrauliche Angaben und der Datenraum sind nur für Investoren mit freigegebenem NDA sichtbar." });
    liste.push({ f: "Wann fällt eine Provision an?", a: "Nur bei erfolgreichem Abschluss. Den Satz vereinbaren Sie vor der Veröffentlichung in der Provisionsvereinbarung." });
  }
  return liste;
}

export default async function Hilfe() {
  const n = await portalNutzer();
  const begriffe = [
    hat(n, "flaeche", "landwirt") && ["flaechenpacht", "Flächenpacht"],
    hat(n, "flaeche", "landwirt") && ["agri-pv", "Agri-PV"],
    hat(n, "flaeche", "landwirt") && ["dienstbarkeit", "Dienstbarkeit"],
    ["nda", "NDA"],
    ["datenraum", "Datenraum"],
    hat(n, "investor", "anbieter") && ["loi", "LOI"],
    hat(n, "investor", "anbieter") && ["due-diligence", "Due Diligence"],
    hat(n, "investor", "anbieter") && ["rtb", "Ready-to-Build"],
    ["netzverknuepfungspunkt", "Netzverknüpfungspunkt"],
    ["bebauungsplan", "Bebauungsplan"],
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Hilfe"
        titel="Hilfe & Tastenkürzel"
        text="Alles Wichtige zur Bedienung des Portals – für den schnellen Einstieg und für alle, die ohne Maus arbeiten möchten."
        aktionen={<><Button href="/portal/hilfe/handbuch" variant="secondary" size="sm" icon={BookOpen}>Handbücher</Button><Button href="/portal/willkommen" variant="secondary" size="sm" icon={Compass}>Geführten Einstieg starten</Button></>}
      />

      <Karte titel="Schnell ans Ziel" untertitel="Befehlspalette und Tastenkürzel" aktion={<Keyboard aria-hidden="true" className="h-5 w-5 text-ov-700" />}>
        <p className="mb-5 max-w-3xl text-[14.5px] leading-relaxed text-ink-600">
          Drücken Sie <kbd className="rounded-md bg-sand-50 px-1.5 py-0.5 text-[13px] font-semibold ring-1 ring-ink-200">Strg</kbd> + <kbd className="rounded-md bg-sand-50 px-1.5 py-0.5 text-[13px] font-semibold ring-1 ring-ink-200">K</kbd> (Mac: ⌘ + K) oder tippen Sie oben auf „Suchen“. Sie finden Ihre Flächen, Projekte, Anfragen und Nachrichten – und können Aktionen wie „Fläche anlegen“ direkt ausführen. Angezeigt wird nur, worauf Sie Zugriff haben.
        </p>
        <KuerzelUebersicht rollen={n.rollen} />
      </Karte>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Häufige Fragen im Portal">
          <div className="divide-y divide-ink-100">
            {fragen(n).map((x) => (
              <details key={x.f} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-ink-900 marker:hidden">
                  {x.f}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{x.a}</p>
              </details>
            ))}
          </div>
        </Karte>

        <div className="space-y-6">
          <Karte titel="Fachbegriffe kurz erklärt" aktion={<BookOpen aria-hidden="true" className="h-5 w-5 text-ov-700" />}>
            <p className="mb-3 text-[14px] text-ink-600">Das „?“ neben einem Begriff erklärt ihn in einem Satz – auch überall sonst im Portal.</p>
            <ul className="flex flex-wrap gap-2">
              {begriffe.map(([id, label]) => (
                <li key={id} className="rounded-full bg-sand-50 px-3 py-1.5 text-[14px] font-medium text-ink-800 ring-1 ring-inset ring-ink-200/70">
                  <Begriff id={id}>{label}</Begriff>
                </li>
              ))}
            </ul>
            <Link href="/wissen/lexikon" className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ov-700 hover:text-ov-800">
              Zum vollständigen Lexikon <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </Karte>

          <Karte titel="Als App nutzen">
            <AppInstallation />
          </Karte>

          <div className="rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200">
            <p className="flex items-center gap-2 font-display text-[16px] font-bold text-ink-900"><MessagesSquare aria-hidden="true" className="h-5 w-5 text-ov-700" /> Noch Fragen?</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-600">Schreiben Sie uns im Portal – das Backoffice antwortet im jeweiligen Nachrichtenverlauf.</p>
            <Button href="/portal/nachrichten" size="sm" className="mt-3" pfeil>Nachricht schreiben</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
