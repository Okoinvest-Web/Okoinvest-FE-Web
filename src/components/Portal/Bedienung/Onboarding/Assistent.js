"use client";

// Onboarding-Assistent je Rolle und Untertyp (Team B1). Rendert jeden deklarativen Pfad (lib/plattform/onboarding/pfade):
// Schrittliste mit Status (erledigt aus echten Daten, „später“, Pflicht), Inhalt je Schritt (Inline-Formular, Aktion mit
// Links, Info mit „Verstanden“), Wechsel des Untertyps bzw. Pfads, Abschluss nur bei erfüllten Pflichtkriterien.
// Jede Änderung geht an /api/portal/onboarding (Server prüft); danach wird der Stand neu ausgewertet.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock, Compass, ExternalLink, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { FormFehler } from "@/components/formular/Meldungen";
import { useSchrittRichtung } from "@/components/formular/Schritte";
import BegriffPopover from "../BegriffPopover";
import { fehlerText } from "../pruefung";
import { BenachrichtigungenFormular, FlaecheFormular, ProfilFormular, SuchprofilFormular, TicketFormular, UntertypWahl } from "./Formulare";

const aktion = (body) => senden("/api/portal/onboarding", { method: "PUT", body });

/** Nächster offener Schritt nach `nachId` (sonst erster offener, nicht verschobener) – oder null */
function folgeSchritt(schritte, nachId) {
  const i = schritte.findIndex((s) => s.id === nachId);
  return schritte.slice(i + 1).find((s) => !s.erledigt) || schritte.find((s) => !s.erledigt && !s.spaeter && s.id !== nachId) || null;
}

export default function Assistent({ nutzer: nutzerStart, start, pfade, startSchritt = null, begriffe = {}, anzahl = {} }) {
  const router = useRouter();
  const [pfad, setPfad] = useState(start);
  const [nutzer, setNutzer] = useState(nutzerStart);
  const [aktivId, setAktivId] = useState(() => (start.schritte.some((s) => s.id === startSchritt) ? startSchritt : start.naechster || start.schritte[0]?.id));
  const [abschlussOffen, setAbschlussOffen] = useState(false);
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  const kopfRef = useRef(null);
  const ersterRender = useRef(true);

  const index = Math.max(0, pfad.schritte.findIndex((s) => s.id === aktivId));
  const schritt = pfad.schritte[index] || pfad.schritte[0];
  const pflichtOffen = pfad.schritte.filter((s) => s.pflicht && !s.erledigt);
  // Richtung des Schrittwechsels für die Einblendung (vor = von rechts, zurück = von links)
  const richtung = useSchrittRichtung(abschlussOffen ? pfad.schritte.length : index);

  useEffect(() => {
    if (ersterRender.current) {
      ersterRender.current = false;
      return;
    }
    kopfRef.current?.focus();
  }, [aktivId, abschlussOffen]);

  const springe = useCallback((liste, nachId) => {
    const f = folgeSchritt(liste, nachId);
    if (f) setAktivId(f.id);
    else setAbschlussOffen(true);
  }, []);

  /** Stand aus echten Daten neu laden (nach Speichern über andere Portal-APIs) */
  const neuLaden = useCallback(async (weiterNach = null) => {
    const r = await senden("/api/portal/onboarding?ansicht=assistent", { method: "GET" });
    const me = await senden("/api/auth/ich", { method: "GET" }).catch(() => null);
    if (me?.nutzer) setNutzer(me.nutzer);
    if (r?.pfad) {
      setPfad(r.pfad);
      if (weiterNach) springe(r.pfad.schritte, weiterNach);
    }
    router.refresh();
  }, [router, springe]);

  async function ausfuehren(schluessel, body, weiterNach = null) {
    setLaeuft(schluessel);
    setFehler("");
    try {
      const r = await aktion(body);
      if (r?.pfad) {
        setPfad(r.pfad);
        if (weiterNach) springe(r.pfad.schritte, weiterNach);
      }
      return r;
    } catch (e) {
      setFehler(fehlerText(e));
      return null;
    } finally {
      setLaeuft("");
    }
  }

  const gehe = (id) => {
    setAbschlussOffen(false);
    setFehler("");
    setAktivId(id);
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">Geführter Einstieg{pfad.untertyp ? ` · ${pfad.untertypen.find((u) => u.id === pfad.untertyp)?.label || ""}` : ""}</p>
          <p className="mt-1 font-display text-[20px] font-bold leading-tight text-ink-900 md:text-[22px]">{pfad.titel}</p>
          <p className="mt-1 max-w-[70ch] text-[14px] leading-relaxed text-ink-600">{pfad.text}</p>
        </div>
        <Link href={pfad.id === "backoffice" ? "/portal/admin" : "/portal"} className="text-[13.5px] font-semibold text-ink-500 underline-offset-4 hover:text-ink-800 hover:underline">Später fortsetzen</Link>
      </div>

      {pfade.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Einstieg wechseln">
          <span className="text-[13px] text-ink-500">Ihre Rollen:</span>
          {pfade.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === pfad.id}
              disabled={!!laeuft}
              onClick={async () => {
                if (p.id === pfad.id) return;
                const r = await ausfuehren(`pfad-${p.id}`, { aktion: "pfad", pfad: p.id });
                if (r?.pfad) gehe(r.pfad.naechster || r.pfad.schritte[0]?.id);
              }}
              className={cn("rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 ring-inset", p.id === pfad.id ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:ring-ov-300")}
            >
              {p.titel.replace(/^Einstieg für |^Einarbeitung im /, "")}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-600">
          <span>{pfad.erledigt} von {pfad.gesamt} erledigt</span>
          <span>{pflichtOffen.length ? `${pflichtOffen.length} Pflicht${pflichtOffen.length === 1 ? "schritt" : "schritte"} offen` : "Alle Pflichtschritte erledigt"}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pfad.quote} aria-valuetext={`${pfad.erledigt} von ${pfad.gesamt} Schritten erledigt`} aria-label="Fortschritt des Einstiegs">
          <div className="ov-fortschritt h-2 rounded-full bg-ov-500" style={{ transform: `scaleX(${Math.max(4, pfad.quote) / 100})` }} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Schritte des Einstiegs" className="min-w-0">
          <ol className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
            {pfad.schritte.map((s, i) => {
              const aktiv = !abschlussOffen && s.id === schritt.id;
              return (
                <li key={s.id} className="min-w-0 lg:w-full">
                  <button type="button" onClick={() => gehe(s.id)} aria-current={aktiv ? "step" : undefined}
                    className={cn("flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left text-[13px] ring-1 ring-inset transition-colors lg:gap-2.5 lg:px-3 lg:py-2 lg:text-[13.5px]", aktiv ? "bg-white font-semibold text-ink-900 ring-ov-400" : "bg-white/60 text-ink-700 ring-ink-200/70 hover:ring-ov-300")}>
                    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", s.erledigt ? "bg-ov-500 text-white" : s.spaeter ? "bg-sand-100 text-ink-700 ring-1 ring-ink-300" : aktiv ? "bg-navy-900 text-white" : "bg-ink-100 text-ink-500")}>
                      {s.erledigt ? <Check aria-hidden="true" className="ov-erfolg h-3.5 w-3.5" strokeWidth={3} /> : s.spaeter ? <Clock aria-hidden="true" className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className="min-w-0 whitespace-nowrap lg:whitespace-normal">
                      {s.kurz}
                      {s.pflicht && !s.erledigt && <span className="ml-1 text-ov-700" aria-hidden="true">*</span>}
                      <span className="sr-only">{s.erledigt ? " – erledigt" : s.spaeter ? " – auf später gesetzt" : " – offen"}{s.pflicht ? ", Pflicht" : ""}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            <li className="min-w-0 lg:w-full">
              <button type="button" onClick={() => setAbschlussOffen(true)} aria-current={abschlussOffen ? "step" : undefined}
                className={cn("flex w-full items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left text-[13px] ring-1 ring-inset lg:gap-2.5 lg:px-3 lg:py-2 lg:text-[13.5px]", abschlussOffen ? "bg-white font-semibold text-ink-900 ring-ov-400" : "bg-white/60 text-ink-700 ring-ink-200/70 hover:ring-ov-300")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full", pfad.abgeschlossen ? "bg-ov-500 text-white" : "bg-ink-100 text-ink-500")}><Compass aria-hidden="true" className="h-3.5 w-3.5" /></span>
                <span className="whitespace-nowrap">Abschluss</span>
              </button>
            </li>
          </ol>
          <p className="mt-2 hidden text-[12px] text-ink-500 lg:block"><span className="text-ov-700">*</span> Pflicht für ein arbeitsfähiges Konto</p>
        </nav>

        <section aria-labelledby="einstieg-titel" className="min-w-0 overflow-hidden rounded-3xl bg-white p-5 shadow-e1 ring-1 ring-ink-200/70 sm:p-8">
          <div key={abschlussOffen ? "abschluss" : schritt.id} className={richtung === "zurueck" ? "ov-step-zurueck" : "ov-step-vor"}>
          {abschlussOffen ? (
            <Abschluss pfad={pfad} kopfRef={kopfRef} pflichtOffen={pflichtOffen} gehe={gehe} laeuft={laeuft} fehler={fehler}
              abschliessen={async () => {
                const r = await ausfuehren("abschliessen", { aktion: "abschliessen", pfad: pfad.id });
                if (r) {
                  router.push(pfad.id === "backoffice" ? "/portal/admin" : "/portal?hinweis=einstieg-fertig");
                  router.refresh();
                }
              }}
            />
          ) : (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-semibold text-ink-500">Schritt {index + 1} von {pfad.schritte.length}</span>
                {schritt.pflicht && <span className="rounded-full bg-ov-50 px-2 py-0.5 text-[11.5px] font-semibold text-ov-800 ring-1 ring-ov-200">Pflicht</span>}
                {schritt.erledigt && <span className="rounded-full bg-ov-600 px-2 py-0.5 text-[11.5px] font-semibold text-white">Erledigt</span>}
                {schritt.spaeter && <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[11.5px] font-semibold text-ink-800 ring-1 ring-ink-200">Auf später gesetzt</span>}
              </div>
              <h1 id="einstieg-titel" ref={kopfRef} tabIndex={-1} className="mt-2 font-display text-[24px] font-extrabold leading-tight tracking-tight text-ink-900 outline-none md:text-[28px]">
                {schritt.titel}
                {schritt.begriff && begriffe[schritt.begriff] && <span className="ml-2 align-middle text-[16px]"><BegriffPopover eintrag={begriffe[schritt.begriff]} /></span>}
              </h1>
              {schritt.text && <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{schritt.text}</p>}
              {schritt.punkte.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {schritt.punkte.map((p) => (
                    <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-ink-700">
                      <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-ov-600" />
                      <span className="min-w-0">{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              <SchrittInhalt schritt={schritt} pfad={pfad} nutzer={nutzer} anzahl={anzahl} onGespeichert={() => neuLaden(schritt.id)}
                onUntertyp={async (u) => {
                  const r = await aktion({ aktion: "untertyp", pfad: pfad.id, untertyp: u });
                  if (r?.pfad) {
                    setPfad(r.pfad);
                    springe(r.pfad.schritte, "typ");
                  }
                }}
              />

              {schritt.links.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  {schritt.links.map((l) => (
                    <Button key={l.href} href={l.href} variant={l.primaer ? "primary" : "secondary"} size="sm">
                      {l.label}
                      {!l.href.startsWith("/portal") && <ExternalLink aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" />}
                    </Button>
                  ))}
                </div>
              )}
              {schritt.art === "aktion" && !schritt.erledigt && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-500">
                  Erledigt wird der Schritt automatisch, sobald die Angaben im Portal vorliegen.
                  <button type="button" onClick={async () => { setLaeuft("pruefen"); try { await neuLaden(); } catch (e) { setFehler(fehlerText(e)); } finally { setLaeuft(""); } }} className="inline-flex items-center gap-1 font-semibold text-ov-700 hover:text-ov-800">
                    <RefreshCw aria-hidden="true" className={cn("h-3.5 w-3.5", laeuft === "pruefen" && "animate-spin")} /> Stand prüfen
                  </button>
                </p>
              )}

              <div className="mt-4"><FormFehler>{fehler}</FormFehler></div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {index > 0 && (
                    <button type="button" onClick={() => gehe(pfad.schritte[index - 1].id)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14.5px] font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900">
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Zurück
                    </button>
                  )}
                  {!schritt.erledigt && !schritt.spaeter && (
                    <button type="button" disabled={!!laeuft} onClick={() => ausfuehren("spaeter", { aktion: "spaeter", pfad: pfad.id, schritt: schritt.id }, schritt.id)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-4 text-[14.5px] font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900">
                      <Clock aria-hidden="true" className="h-4 w-4" /> Später
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {schritt.bestaetigbar && !schritt.erledigt && (
                    <Button variant={schritt.art === "info" ? "primary" : "secondary"} disabled={!!laeuft} onClick={() => ausfuehren("bestaetigen", { aktion: "bestaetigen", pfad: pfad.id, schritt: schritt.id }, schritt.id)}>
                      {laeuft === "bestaetigen" ? "Wird gespeichert …" : schritt.bestaetigenText || "Verstanden"}
                    </Button>
                  )}
                  {(schritt.erledigt || !schritt.bestaetigbar || schritt.art !== "info") && (
                    <Button variant={schritt.erledigt ? "primary" : "ghost"} pfeil onClick={() => (index < pfad.schritte.length - 1 ? gehe(pfad.schritte[index + 1].id) : setAbschlussOffen(true))}>
                      {index < pfad.schritte.length - 1 ? "Weiter" : "Zum Abschluss"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SchrittInhalt({ schritt, pfad, nutzer, anzahl, onGespeichert, onUntertyp }) {
  switch (schritt.formular) {
    case "untertyp":
      return <UntertypWahl schritt={schritt} pfad={pfad} onWahl={onUntertyp} />;
    case "profil":
      return <ProfilFormular key={`profil-${pfad.untertyp}`} nutzer={nutzer} schritt={schritt} untertyp={pfad.untertyp} onGespeichert={onGespeichert} />;
    case "suchprofil":
      return <SuchprofilFormular nutzer={nutzer} untertyp={pfad.untertyp} onGespeichert={onGespeichert} />;
    case "ticket":
      return <TicketFormular nutzer={nutzer} untertyp={pfad.untertyp} onGespeichert={onGespeichert} />;
    case "flaeche":
      return <FlaecheFormular key={`flaeche-${pfad.untertyp}`} untertyp={pfad.untertyp} anzahl={anzahl.flaechen || 0} onGespeichert={onGespeichert} />;
    case "benachrichtigungen":
      return <BenachrichtigungenFormular nutzer={nutzer} onGespeichert={onGespeichert} />;
    default:
      return null;
  }
}

function Abschluss({ pfad, kopfRef, pflichtOffen, gehe, laeuft, fehler, abschliessen }) {
  const offenOptional = pfad.schritte.filter((s) => !s.pflicht && !s.erledigt);
  return (
    <div>
      <h1 id="einstieg-titel" ref={kopfRef} tabIndex={-1} className="font-display text-[24px] font-extrabold leading-tight tracking-tight text-ink-900 outline-none md:text-[28px]">
        {pfad.abgeschlossen ? "Einstieg abgeschlossen" : pflichtOffen.length ? "Fast geschafft" : "Alles bereit"}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
        {pflichtOffen.length
          ? "Abschließen können Sie, sobald alle Pflichtschritte erledigt sind – geprüft wird an Ihren echten Daten, nicht am Klick."
          : "Ihr Konto ist arbeitsfähig. Offene freiwillige Punkte bleiben in der Checkliste „Erste Schritte“ auf der Übersicht."}
      </p>
      {pflichtOffen.length > 0 && (
        <ul className="mt-5 space-y-2">
          {pflichtOffen.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => gehe(s.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl bg-sand-50 px-4 py-3 text-left ring-1 ring-ink-200/70 hover:ring-ov-300">
                <span className="min-w-0 font-semibold text-ink-900">{s.titel}</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {!pflichtOffen.length && offenOptional.length > 0 && <p className="mt-4 text-[13.5px] text-ink-500">Noch freiwillig offen: {offenOptional.map((s) => s.kurz).join(", ")}.</p>}
      <div className="mt-4"><FormFehler>{fehler}</FormFehler></div>
      <div className="mt-8 flex flex-col gap-3 border-t border-ink-100 pt-5 sm:flex-row sm:justify-end">
        <Button variant="secondary" href="/portal/hilfe">Hilfe ansehen</Button>
        {pfad.abgeschlossen ? (
          <Button href={pfad.id === "backoffice" ? "/portal/admin" : "/portal"} pfeil>{pfad.id === "backoffice" ? "Zum Cockpit" : "Zur Übersicht"}</Button>
        ) : (
          <Button pfeil disabled={!!laeuft || pflichtOffen.length > 0} onClick={abschliessen}>{laeuft === "abschliessen" ? "Wird geprüft …" : "Einstieg abschließen"}</Button>
        )}
      </div>
    </div>
  );
}
