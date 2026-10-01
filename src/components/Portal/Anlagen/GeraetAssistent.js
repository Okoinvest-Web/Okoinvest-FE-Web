"use client";

// „Gerät verbinden“: erzeugt einen MQTT-Zugang je Datenlogger. Das Passwort wird GENAU EINMAL angezeigt (Server
// speichert nur den scrypt-Hash) – danach nur noch Benutzer, Topic und Fingerabdruck des Hashes. Zeigt Broker,
// Topic, Beispiel-Payload und mosquitto_pub-Befehl, wartet auf die erste Nachricht („Warte auf erste Nachricht …“
// → „verbunden“, Abfrage alle 3 s). Demo: „Testnachricht senden“ simuliert die erste Nachricht.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Lock, LockOpen, Plug, RefreshCw, Send, ShieldAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { GERAET_STATUS, MQTT, beispielPayload } from "@/lib/plattform/anlagen";
import { alterText } from "./teile";
import { bestaetigen } from "@/components/ui/Rueckfrage";

function Kopieren({ text, label }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        } catch {
          /* Zwischenablage nicht erlaubt */
        }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold text-ov-700 hover:bg-ov-50"
      aria-label={`${label} kopieren`}
    >
      {ok ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
      {ok ? "kopiert" : "kopieren"}
    </button>
  );
}

function Zeile({ label, wert, geheim = false }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 items-center gap-1">
        <code className={cn("min-w-0 flex-1 break-all rounded-lg px-2.5 py-1.5 font-mono text-[13px]", geheim ? "bg-sun-300/25 text-ink-900 ring-1 ring-inset ring-sun-400/50" : "bg-ink-50 text-ink-900")}>{wert}</code>
        <Kopieren text={String(wert)} label={label} />
      </dd>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = GERAET_STATUS[status] || GERAET_STATUS.wartet;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset", status === "verbunden" ? "bg-ov-50 text-ov-800 ring-ov-200" : status === "gesperrt" ? "bg-ink-100 text-ink-700 ring-ink-200" : "bg-sun-300/25 text-ink-900 ring-sun-400/50")}>
      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", status === "verbunden" ? "bg-ov-500" : status === "gesperrt" ? "bg-ink-400" : "bg-sun-500 motion-safe:animate-pulse")} />
      {s.label}
    </span>
  );
}

/** Zugangsdaten + Anleitung nach dem Erzeugen (einmalig) */
function Zugangsdaten({ anlage, zugang, passwort, broker, demo, onFertig }) {
  const router = useRouter();
  const [status, setStatus] = useState(zugang.status);
  const [letzte, setLetzte] = useState(zugang.letzteNachricht);
  const [bestaetigt, setBestaetigt] = useState(false);
  const [fehler, setFehler] = useState("");
  const topic = `${zugang.topic.replace(/\/#$/, "")}/messwerte`;
  const statusTopic = `${zugang.topic.replace(/\/#$/, "")}/status`;
  const payload = JSON.stringify(beispielPayload({ kwp: anlage.kwp || 100, speicher: anlage.speicherKwh > 0 }));
  const befehl = `mosquitto_pub -h ${broker.host} -p ${broker.port} --capath /etc/ssl/certs \\
  -i '${zugang.benutzer}' -u '${zugang.benutzer}' -P '${passwort}' -q 1 \\
  -t '${topic}' \\
  -m '${payload}'`;

  const abfragen = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/anlagen/geraete/${zugang.id}`, { cache: "no-store", credentials: "same-origin" });
      const j = await r.json();
      if (r.ok) {
        setStatus(j.zugang.status);
        setLetzte(j.zugang.letzteNachricht);
      }
    } catch {
      /* nächster Versuch */
    }
  }, [zugang.id]);

  useEffect(() => {
    if (status !== "wartet") return undefined;
    const t = setInterval(abfragen, 3000);
    return () => clearInterval(t);
  }, [status, abfragen]);

  async function testnachricht(mitFehlercode) {
    setFehler("");
    try {
      const r = await senden(`/api/admin/anlagen/geraete/${zugang.id}`, { body: { aktion: "testnachricht", mitFehlercode } });
      setStatus(r.zugang.status);
      setLetzte(r.zugang.letzteNachricht);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    }
  }

  return (
    <div className="space-y-5 rounded-3xl bg-white p-5 ring-2 ring-ov-500 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-display text-[17px] font-bold text-ink-900">
          <Plug aria-hidden="true" className="h-5 w-5 text-ov-600" /> Zugang für „{zugang.bezeichnung}“
        </p>
        <StatusBadge status={status} />
      </div>
      <p role="alert" className="flex gap-2 rounded-2xl bg-sun-300/20 px-4 py-3 text-[14px] text-ink-900 ring-1 ring-inset ring-sun-400/40">
        <ShieldAlert aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" />
        Das Passwort wird nur jetzt angezeigt. ÖkoInvest speichert ausschließlich einen Hash – bei Verlust erzeugen Sie ein neues Passwort (das alte wird dann ungültig).
      </p>
      <dl className="grid gap-3 md:grid-cols-2">
        <Zeile label="Broker (TLS)" wert={`${broker.host}:${broker.port}`} />
        <Zeile label="Client-ID / Benutzer" wert={zugang.benutzer} />
        <Zeile label="Passwort (einmalig)" wert={passwort} geheim />
        <Zeile label="Topic Messwerte" wert={topic} />
        <Zeile label="Topic Status (Last Will „offline“, retained)" wert={statusTopic} />
        <Zeile label="Berechtigung (ACL)" wert={zugang.topic} />
      </dl>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-700">Beispiel-Payload (JSON, QoS 1, Version {MQTT.version})</p>
        <pre className="max-h-64 overflow-auto rounded-2xl bg-navy-950 p-4 font-mono text-[12.5px] leading-relaxed text-white/90">{JSON.stringify(JSON.parse(payload), null, 2)}</pre>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink-700">Test mit mosquitto_pub</p>
          <Kopieren text={befehl} label="Befehl" />
        </div>
        <pre className="overflow-x-auto rounded-2xl bg-navy-950 p-4 font-mono text-[12.5px] leading-relaxed text-white/90">{befehl}</pre>
        <p className="mt-2 text-[12.5px] text-ink-500">Datenlogger: Heartbeat mindestens alle {60} s auf <code>…/heartbeat</code>, Last Will „offline“ (retained) auf <code>…/status</code>, bei Verbindungsaufbau „online“ senden. Zählerstände als fortlaufende Summe (kWh), nie zurücksetzen.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60" aria-live="polite">
        {status === "verbunden" ? (
          <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ov-800">
            <Check aria-hidden="true" className="h-5 w-5" /> Verbunden – erste Nachricht {alterText(letzte)} empfangen.
          </p>
        ) : status === "gesperrt" ? (
          <p className="text-[14.5px] text-ink-700">Zugang gesperrt.</p>
        ) : (
          <p className="flex items-center gap-2 text-[14.5px] text-ink-800">
            <RefreshCw aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> Warte auf erste Nachricht …
          </p>
        )}
        {demo && status === "wartet" && (
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" icon={Send} onClick={() => testnachricht(false)}>Testnachricht senden (Demo)</Button>
            <Button size="sm" variant="secondary" onClick={() => testnachricht(true)}>… mit Fehlercode</Button>
          </div>
        )}
      </div>
      {fehler && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-[13.5px] text-red-800 ring-1 ring-red-200">{fehler}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <label className="inline-flex items-center gap-2 text-[14px] text-ink-800">
          <input type="checkbox" checked={bestaetigt} onChange={(e) => setBestaetigt(e.target.checked)} className="h-5 w-5 accent-ov-600" />
          Passwort ist im Datenlogger hinterlegt
        </label>
        <Button size="sm" variant="navy" disabled={!bestaetigt} onClick={onFertig}>Fertig – Passwort ausblenden</Button>
      </div>
    </div>
  );
}

export default function GeraetAssistent({ anlage, geraete = [], demo = false, sofort = false }) {
  const router = useRouter();
  const [neu, setNeu] = useState(null); // { zugang, passwort, broker }
  const [bezeichnung, setBezeichnung] = useState("Datenlogger");
  const [formular, setFormular] = useState(sofort && !geraete.length);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState("");

  async function anlegen(e) {
    e.preventDefault();
    setLaeuft("neu");
    setFehler("");
    try {
      const r = await senden(`/api/admin/anlagen/${anlage.id}/geraete`, { body: { bezeichnung } });
      setNeu(r);
      setFormular(false);
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft("");
    }
  }

  async function aktion(z, a) {
    if (a === "neu" && !(await bestaetigen({ titel: "Neues Passwort erzeugen?", text: "Das bisherige wird sofort ungültig – der Datenlogger verbindet sich erst mit dem neuen Passwort wieder.", details: [{ label: "Zugang", wert: z.benutzer }], bestaetigenText: "Passwort erneuern", gefahr: true }))) return;
    if (a === "sperren" && !(await bestaetigen({ titel: "Zugang sperren?", text: "Der Broker weist das Gerät ab sofort ab.", details: [{ label: "Zugang", wert: z.benutzer }], bestaetigenText: "Zugang sperren", gefahr: true }))) return;
    setLaeuft(z.id + a);
    setFehler("");
    try {
      const r = await senden(`/api/admin/anlagen/geraete/${z.id}`, { body: { aktion: a } });
      if (a === "neu") setNeu(r);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft("");
    }
  }

  return (
    <div className="space-y-5">
      {neu && (
        <Zugangsdaten
          anlage={anlage}
          zugang={neu.zugang}
          passwort={neu.passwort}
          broker={neu.broker}
          demo={demo}
          onFertig={() => {
            setNeu(null);
            router.refresh();
          }}
        />
      )}
      {geraete.length ? (
        <ul className="divide-y divide-ink-100">
          {geraete.map((z) => (
            <li key={z.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink-900">
                  {z.bezeichnung} <StatusBadge status={z.status} />
                </p>
                <p className="mt-0.5 break-all font-mono text-[12.5px] text-ink-600">{z.benutzer} · {z.topic}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  Letzte Nachricht {z.letzteNachricht ? alterText(z.letzteNachricht) : "–"} · Passwort-Hash {z.hash?.algorithmus} · Fingerabdruck <span className="font-mono">{z.hash?.fingerabdruck}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" icon={KeyRound} disabled={!!laeuft} onClick={() => aktion(z, "neu")}>Neues Passwort</Button>
                {z.gesperrt ? (
                  <Button size="sm" variant="secondary" icon={LockOpen} disabled={!!laeuft} onClick={() => aktion(z, "entsperren")}>Entsperren</Button>
                ) : (
                  <Button size="sm" variant="ghost" icon={Lock} disabled={!!laeuft} onClick={() => aktion(z, "sperren")}>Sperren</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !neu && <p className="text-[14px] text-ink-500">Noch kein Gerät verbunden – ohne Datenlogger gibt es keine Messdaten.</p>
      )}
      {formular ? (
        <form onSubmit={anlegen} className="flex flex-col gap-3 rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/60 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-700">Bezeichnung des Geräts</span>
            <input value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} maxLength={80} className={eingabe} />
          </label>
          <Button type="submit" size="sm" disabled={!!laeuft}>{laeuft === "neu" ? "Erzeuge …" : "Zugang erzeugen"}</Button>
        </form>
      ) : (
        !neu && <Button size="sm" icon={Plug} onClick={() => setFormular(true)}>Gerät verbinden</Button>
      )}
      {fehler && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-[13.5px] text-red-800 ring-1 ring-red-200">{fehler}</p>}
    </div>
  );
}
