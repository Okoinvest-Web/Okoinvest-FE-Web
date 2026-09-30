import { cookies } from "next/headers";
import { CheckCircle2, History, KeyRound, Laptop, MonitorSmartphone, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import ZweiFaktor from "@/components/Portal/Sicherheit/ZweiFaktor";
import { GeraeteListe, SitzungenListe } from "@/components/Portal/Sicherheit/Sitzungen";
import PflichtEinstellung from "@/components/Portal/Sicherheit/PflichtEinstellung";
import { PasswortAendern } from "@/components/Portal/Sicherheit/Konto";
import { portalNutzer, istAdmin } from "@/lib/plattform/server/seite";
import { sicherheit } from "@/lib/plattform/backend/sicherheit";
import { geraetCookieName } from "@/lib/plattform/server/anmeldung";
import { datumZeit } from "@/lib/plattform/format";
import { cn } from "@/components/ui/cn";

export const metadata = { title: "Sicherheit" };

const METHODE = (m = "") =>
  m
    .replace("passwort-reset", "Passwort-Link")
    .replace("passwort-geaendert", "Passwort geändert")
    .replace("e-mail-link", "E-Mail-Link")
    .replace("zwei-faktor-einrichtung", "2FA eingerichtet")
    .replace("zwei-faktor", "Zwei-Faktor-Code")
    .replace("registrierung", "Registrierung")
    .replace(/^passwort/, "Passwort")
    .replace("2FA eingerichtet + 2FA", "2FA eingerichtet")
    .replace(" + 2FA", " · mit 2FA");
const GRUND = { passwort: "falsches Passwort", "2fa": "falscher Code", gesperrt: "Konto gesperrt" };

export default async function Sicherheit({ searchParams }) {
  const sp = await searchParams;
  const n = await portalNutzer();
  const s = sicherheit();
  const geraetToken = (await cookies()).get(geraetCookieName())?.value || "";
  const [status, sitzungen, anmeldungen, geraete, pflicht] = await Promise.all([
    s.zweiFaktorStatus(n),
    s.sitzungen(n),
    s.anmeldungen(n, { limit: 30 }),
    s.geraete(n, { geraetToken }),
    istAdmin(n) ? s.zweiFaktorPflicht(n).catch(() => null) : null,
  ]);
  const fehlversuche = anmeldungen.filter((a) => !a.ok && Date.now() - new Date(a.am).getTime() < 7 * 86400e3).length;
  const punkte = [
    { ok: status.aktiv, text: "Zwei-Faktor-Anmeldung aktiv" },
    { ok: n.emailBestaetigt, text: "E-Mail-Adresse bestätigt" },
    { ok: !status.aktiv || status.codesUebrig > 3, text: "Genug Wiederherstellungscodes" },
    { ok: fehlversuche === 0, text: fehlversuche ? `${fehlversuche} Fehlversuch(e) in 7 Tagen` : "Keine Fehlversuche in 7 Tagen" },
  ];
  const quote = punkte.filter((p) => p.ok).length;

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Konto" titel="Sicherheit" text="Zwei-Faktor-Anmeldung, aktive Sitzungen, Geräte und Anmeldehistorie – alles an einem Ort." />
      {(sp?.pflicht === "1" || n.zweiFaktorPflichtOffen) && !status.aktiv && (
        <Hinweis ton="warn" icon={ShieldAlert} titel="Zwei-Faktor-Anmeldung erforderlich">
          Für Ihre Rolle ist die Zwei-Faktor-Anmeldung Pflicht. Richten Sie sie in zwei Minuten ein – danach stehen Ihnen alle Bereiche wieder zur Verfügung.
        </Hinweis>
      )}

      <section aria-label="Sicherheitsstatus" className="ov-noise relative overflow-hidden rounded-3xl bg-navy-950 p-5 text-white md:p-6">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-ov-500/30 blur-[90px]" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", quote === 4 ? "bg-ov-500/25 text-ov-300" : "bg-sun-400/20 text-sun-300")}>
              {quote === 4 ? <ShieldCheck aria-hidden="true" className="h-7 w-7" /> : <ShieldAlert aria-hidden="true" className="h-7 w-7" />}
            </span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">Sicherheitsstatus</p>
              <p className="font-display text-[22px] font-extrabold leading-tight">{quote === 4 ? "Sehr gut geschützt" : quote >= 2 ? "Gut – mit Luft nach oben" : "Bitte absichern"}</p>
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {punkte.map((p) => (
              <li key={p.text} className="flex items-center gap-2 text-[13.5px] text-white/85">
                {p.ok ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-300" /> : <XCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-sun-300" />}
                <span className="min-w-0">{p.text}</span>
                <span className="sr-only">{p.ok ? "(erfüllt)" : "(offen)"}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Karte titel="Zwei-Faktor-Anmeldung" untertitel="Code aus einer Authenticator-App (TOTP)">
          <ZweiFaktor status={status} email={n.email} pflicht={!!n.zweiFaktorPflicht} />
        </Karte>
        <Karte titel="Passwort ändern" untertitel="Andere Sitzungen werden dabei beendet">
          <PasswortAendern email={n.email} name={`${n.vorname} ${n.nachname}`} />
        </Karte>
      </div>

      <Karte titel="Aktive Sitzungen" untertitel="Wo Ihr Konto gerade angemeldet ist" aktion={<MonitorSmartphone aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
        <SitzungenListe sitzungen={sitzungen} />
      </Karte>

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Bekannte Geräte" untertitel="Neue Geräte melden wir per E-Mail" aktion={<Laptop aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
          <GeraeteListe geraete={geraete} />
        </Karte>
        <Karte titel="Anmeldehistorie" untertitel="Letzte Anmeldungen und Fehlversuche" aktion={<History aria-hidden="true" className="h-5 w-5 text-ink-400" />}>
          {anmeldungen.length ? (
            <ul className="divide-y divide-ink-100">
              {anmeldungen.slice(0, 15).map((a) => (
                <li key={a.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
                  {a.ok ? <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" /> : <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-sun-500" />}
                  <div className="min-w-0 flex-1 text-[13.5px]">
                    <p className="font-semibold text-ink-900">
                      {a.ok ? METHODE(a.methode) : `Fehlgeschlagen: ${GRUND[a.grund] || a.grund || "unbekannt"}`}
                      <span className="sr-only">{a.ok ? " (erfolgreich)" : ""}</span>
                    </p>
                    <p className="text-ink-500">{[a.geraet, a.ort, datumZeit(a.am)].filter(Boolean).join(" · ")}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Noch keine Einträge.</p>
          )}
        </Karte>
      </div>

      {pflicht && (
        <Karte titel="Backoffice: Pflicht zur Zwei-Faktor-Anmeldung" untertitel="Gilt für alle Konten mit den gewählten Rollen" aktion={<Badge ton="dunkel"><KeyRound aria-hidden="true" className="h-3 w-3" /> Admin</Badge>}>
          <PflichtEinstellung pflicht={pflicht} />
        </Karte>
      )}
    </div>
  );
}
