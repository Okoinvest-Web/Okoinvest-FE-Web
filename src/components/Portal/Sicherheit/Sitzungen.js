"use client";

// Aktive Sitzungen und bekannte Geräte: einzeln beenden/vergessen, „alle anderen abmelden“.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Monitor, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { FehlerBox, ErfolgBox } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { datumZeit, relativ } from "@/lib/plattform/format";

function Symbol({ mobil }) {
  const Icon = mobil ? Smartphone : Monitor;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
      <Icon aria-hidden="true" className="h-5 w-5" />
    </span>
  );
}

export function SitzungenListe({ sitzungen }) {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const andere = sitzungen.filter((s) => !s.aktuell).length;

  async function beenden(s) {
    setLaeuft(s.id);
    setFehler("");
    try {
      const r = await senden(`/api/portal/sicherheit/sitzungen/${s.id}`, { method: "DELETE" });
      if (r.abgemeldet) {
        router.replace("/login?hinweis=abgemeldet");
        router.refresh();
        return;
      }
      setErfolg(`Sitzung auf „${s.geraet}“ beendet.`);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft("");
    }
  }

  async function alleAnderen() {
    setLaeuft("alle");
    setFehler("");
    try {
      const r = await senden("/api/portal/sicherheit/sitzungen", { body: { alleAnderen: true } });
      setErfolg(r.beendet ? `${r.beendet} andere Sitzung(en) beendet.` : "Es gab keine anderen Sitzungen – ältere Anmeldungen sind jetzt ebenfalls ungültig.");
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft("");
    }
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-ink-100">
        {sitzungen.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Symbol mobil={s.mobil} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-900">
                <span className="min-w-0 break-words">{s.geraet}</span>
                {s.aktuell && <Badge ton="ok">Dieses Gerät</Badge>}
                {s.zweiFaktor && (
                  <Badge ton="info">
                    <ShieldCheck aria-hidden="true" className="h-3 w-3" /> 2FA
                  </Badge>
                )}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-500" suppressHydrationWarning>{/* relative Zeit kann zwischen Server und Browser um eine Minute springen */}
                {s.ort || "Ort unbekannt"} · aktiv {relativ(s.letzteAktivitaet)} · seit {datumZeit(s.erstelltAm)}
                {s.organisation ? ` · ${s.organisation}` : ""}
              </p>
            </div>
            <Button type="button" size="sm" variant={s.aktuell ? "ghost" : "secondary"} icon={LogOut} disabled={!!laeuft} onClick={() => beenden(s)} aria-label={`Sitzung auf ${s.geraet} beenden`}>
              {s.aktuell ? "Abmelden" : "Beenden"}
            </Button>
          </li>
        ))}
      </ul>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{erfolg}</ErfolgBox>
      <Button type="button" variant="navy" size="sm" icon={LogOut} disabled={!!laeuft} onClick={alleAnderen}>
        Alle anderen abmelden{andere ? ` (${andere})` : ""}
      </Button>
    </div>
  );
}

export function GeraeteListe({ geraete }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState("");
  if (!geraete.length) return <p className="text-[14px] text-ink-500">Noch keine Geräte erfasst.</p>;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100">
        {geraete.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
            <Symbol mobil={g.mobil} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-900">
                {g.label}
                {g.aktuell && <Badge ton="ok">Dieses Gerät</Badge>}
                {g.vertraut && <Badge ton="info">2FA gemerkt bis {datumZeit(g.vertrautBis).slice(0, 10)}</Badge>}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-500" suppressHydrationWarning>Zuletzt {relativ(g.letzteAnmeldung)} · erstmals {datumZeit(g.ersteAnmeldung)}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={Trash2}
              disabled={laeuft === g.id}
              aria-label={`Gerät ${g.label} vergessen`}
              onClick={async () => {
                setLaeuft(g.id);
                setFehler("");
                try {
                  await senden(`/api/portal/sicherheit/geraete/${g.id}`, { method: "DELETE" });
                  router.refresh();
                } catch (e) {
                  setFehler(e.message);
                } finally {
                  setLaeuft("");
                }
              }}
            >
              Vergessen
            </Button>
          </li>
        ))}
      </ul>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}
