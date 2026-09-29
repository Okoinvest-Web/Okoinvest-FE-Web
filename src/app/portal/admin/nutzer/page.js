import Link from "next/link";
import { Search } from "lucide-react";
import NutzerZeile from "@/components/Portal/NutzerZeile";
import { Badge, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { eingabe } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { backend, istDemo } from "@/lib/plattform/backend";
import { datum, datumZeit, relativ } from "@/lib/plattform/format";

export const metadata = { title: "Nutzer & Protokoll" };

export default async function AdminNutzer({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = await searchParams;
  const q = typeof sp?.q === "string" ? sp.q.slice(0, 80) : "";
  const b = backend();
  const [nutzer, aktivitaeten, links] = await Promise.all([b.nutzerListe(n, { q: q || undefined }), b.aktivitaeten(n, { limit: 60 }), istDemo() ? b.demoLinks(n) : []]);

  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice" titel="Nutzer & Protokoll" text="Konten, Rollen und Sperren. Sperren beendet alle Sitzungen des Kontos sofort." />
      <form method="get" className="relative max-w-xl">
        <label htmlFor="nutzer-suche" className="sr-only">Nutzer suchen</label>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-3.5 h-5 w-5 text-ink-400" />
        <input id="nutzer-suche" name="q" defaultValue={q} placeholder="Name, E-Mail oder Firma" className={cn(eingabe, "pl-11")} />
      </form>

      <Karte titel={`${nutzer.length} Konten`}>
        <Tabelle kopf={["Konto", "Rollen & Status", "Objekte", "Letzter Login"]}>
          {nutzer.map((u) => (
            <tr key={u.id} className={u.aktiv ? "" : "bg-ink-50"}>
              <td className={zelle}>
                <p className="font-semibold text-ink-900">{u.vorname} {u.nachname} {!u.aktiv && <Badge>gesperrt</Badge>}</p>
                <p className="text-[12.5px] text-ink-500">{u.email}{u.emailBestaetigt ? "" : " · E-Mail unbestätigt"}</p>
                {u.firma && <p className="text-[12.5px] text-ink-500">{u.firma}</p>}
                <Link href={`/portal/nachrichten?bezug=nutzer:${u.id}`} className="mt-1 inline-block text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Nachricht schreiben</Link>
              </td>
              <td className={zelle}><NutzerZeile nutzer={{ id: u.id, rollen: u.rollen, aktiv: u.aktiv }} eigen={u.id === n.id} /></td>
              <td className={`${zelle} text-[13px] text-ink-600`}>
                {u.zaehler.vorgaenge} Anfr. · {u.zaehler.flaechen} Fl. · {u.zaehler.projekte} Proj. · {u.zaehler.interessen} Int.
              </td>
              <td className={`${zelle} whitespace-nowrap text-[13px] text-ink-500`}>{u.letzterLogin ? relativ(u.letzterLogin) : "–"}<br />seit {datum(u.erstelltAm)}</td>
            </tr>
          ))}
        </Tabelle>
      </Karte>

      {istDemo() && (
        <Karte titel="Demo: E-Mail-Links" untertitel="Im Demo-Modus werden keine E-Mails versendet – Bestätigungs- und Passwort-Links erscheinen hier und im Server-Log.">
          {links.length ? (
            <ul className="space-y-2 text-[13px]">
              {links.map((l, i) => (
                <li key={i} className="break-all">
                  <span className="font-semibold text-ink-900">{l.art === "reset" ? "Passwort" : "Bestätigung"}</span> · {l.email} · {datumZeit(l.am)}
                  <br />
                  <a href={l.link} className="text-ov-700 underline">{l.link}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[14px] text-ink-500">Noch keine Links erzeugt.</p>
          )}
        </Karte>
      )}

      <Karte titel="Aktivitätsprotokoll" id="protokoll" untertitel="Letzte 60 Einträge (Anmeldungen, Statuswechsel, NDA, Uploads, Downloads)">
        <Tabelle kopf={["Zeit", "Wer", "Aktion", "Objekt", "IP"]}>
          {aktivitaeten.map((a) => (
            <tr key={a.id}>
              <td className={`${zelle} whitespace-nowrap text-[13px] text-ink-500`}>{datumZeit(a.am)}</td>
              <td className={`${zelle} text-[13px]`}>{a.nutzer}</td>
              <td className={`${zelle} text-[13px]`}>{a.text}</td>
              <td className={`${zelle} ov-num text-[12.5px] text-ink-500`}>{a.objektId}</td>
              <td className={`${zelle} text-[12.5px] text-ink-400`}>{a.ip || "–"}</td>
            </tr>
          ))}
        </Tabelle>
      </Karte>
    </div>
  );
}
