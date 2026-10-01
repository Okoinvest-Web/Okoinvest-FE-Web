"use client";

// Organisationen & Teams: anlegen, Mitglieder einladen und verwalten, Rollen, Objekte zuordnen, austreten/löschen.

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Building2, Crown, Link2, Loader2, LogOut, MailPlus, Plus, Trash2, UserMinus, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { senden } from "@/lib/plattform/client";
import { EINLADUNG_ROLLEN, ORGANISATION_ARTEN, TEAM_ROLLEN, darfTeamSchreiben, darfTeamVerwalten, teamRolleLabel } from "@/lib/plattform/organisation";
import { auswahlfeld, eingabe, Feld, FehlerBox, ErfolgBox, Chip } from "@/components/Portal/felder";
import { Badge } from "@/components/Portal/ui";
import { datum, name as nameVon } from "@/lib/plattform/format";
import { cn } from "@/components/ui/cn";
import { bestaetigen } from "@/components/ui/Rueckfrage";

const OBJEKT_ART = { flaeche: "Fläche", projekt: "Projekt", interesse: "Projektinteresse" };

function useAktion() {
  const router = useRouter();
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  async function los(schluessel, fn, text) {
    setLaeuft(schluessel);
    setFehler("");
    setErfolg("");
    try {
      const r = await fn();
      if (text) setErfolg(typeof text === "function" ? text(r) : text);
      router.refresh();
      return r;
    } catch (e) {
      setFehler(e.message);
      return null;
    } finally {
      setLaeuft("");
    }
  }
  return { laeuft, fehler, erfolg, los, router };
}

export function OrganisationAnlegen({ offen: startOffen = false }) {
  const id = useId();
  const a = useAktion();
  const [offen, setOffen] = useState(startOffen);
  const [name, setName] = useState("");
  const [art, setArt] = useState("investmenthaus");
  if (!offen) {
    return <Button type="button" icon={Plus} onClick={() => setOffen(true)}>Organisation anlegen</Button>;
  }
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        a.los("anlegen", async () => {
          await senden("/api/portal/organisation", { body: { name, art } });
          setName("");
          setOffen(startOffen);
        }, "Organisation angelegt – Sie arbeiten jetzt in ihrem Kontext.");
      }}
    >
      <Feld id={`${id}-n`} label="Name der Organisation" pflicht>
        <input id={`${id}-n`} required minLength={2} maxLength={120} autoComplete="organization" className={eingabe} value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Muster Energie GmbH" />
      </Feld>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Art</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(ORGANISATION_ARTEN).map(([k, o]) => (
            <label key={k} className={cn("flex cursor-pointer flex-col rounded-2xl p-3.5 ring-1 ring-inset transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", art === k ? "bg-ov-50 ring-ov-300" : "bg-white ring-ink-200 hover:ring-ink-300")}>
              <input type="radio" name={`${id}-art`} value={k} checked={art === k} onChange={() => setArt(k)} className="sr-only" />
              <span className="text-[14.5px] font-semibold text-ink-900">{o.label}</span>
              <span className="mt-0.5 text-[13px] leading-snug text-ink-600">{o.text}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" icon={a.laeuft ? Loader2 : Building2} disabled={!!a.laeuft}>Anlegen</Button>
        {!startOffen && <Button type="button" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>}
      </div>
    </form>
  );
}

function Einladen({ org }) {
  const id = useId();
  const a = useAktion();
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("mitglied");
  const erlaubt = EINLADUNG_ROLLEN.filter((r) => TEAM_ROLLEN[r].stufe <= TEAM_ROLLEN[org.rolle].stufe);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        a.los("einladen", async () => {
          const r = await senden(`/api/portal/organisation/${org.id}/einladungen`, { body: { email, rolle } });
          setEmail("");
          return r;
        }, (r) => `Einladung an ${r?.einladung?.email} gesendet (7 Tage gültig).`);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Feld id={`${id}-e`} label="E-Mail-Adresse">
          <input id={`${id}-e`} type="email" required className={eingabe} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kollegin@firma.de" />
        </Feld>
        <Feld id={`${id}-r`} label="Teamrolle">
          <select id={`${id}-r`} className={auswahlfeld} value={rolle} onChange={(e) => setRolle(e.target.value)}>
            {erlaubt.map((r) => <option key={r} value={r}>{teamRolleLabel(r)}</option>)}
          </select>
        </Feld>
      </div>
      <p className="text-[12.5px] text-ink-500">{TEAM_ROLLEN[rolle]?.text}</p>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
      <Button type="submit" size="sm" icon={a.laeuft ? Loader2 : MailPlus} disabled={!!a.laeuft}>Einladung senden</Button>
    </form>
  );
}

function Mitglieder({ org }) {
  const a = useAktion();
  const verwalten = darfTeamVerwalten(org.rolle);
  const eigeneStufe = TEAM_ROLLEN[org.rolle]?.stufe || 0;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100">
        {org.mitglieder.map((m) => {
          const aendernErlaubt = verwalten && !m.ich && m.rolle !== "inhaber" && TEAM_ROLLEN[m.rolle].stufe <= eigeneStufe;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-900">
                  <span className="min-w-0 break-words">{nameVon(m.nutzer)}</span>
                  {m.ich && <Badge ton="ok">Sie</Badge>}
                  {m.rolle === "inhaber" && <Badge ton="dunkel"><Crown aria-hidden="true" className="h-3 w-3" /> Inhaber</Badge>}
                </p>
                <p className="mt-0.5 break-all text-[13px] text-ink-500">{m.nutzer?.email} · seit {datum(m.seit)}</p>
              </div>
              {aendernErlaubt ? (
                <label className="flex items-center gap-2">
                  <span className="sr-only">Teamrolle von {nameVon(m.nutzer)}</span>
                  <select
                    className={cn(auswahlfeld, "h-10 w-[150px] text-[14px]")}
                    value={m.rolle}
                    disabled={!!a.laeuft}
                    onChange={(e) => a.los(m.id, () => senden(`/api/portal/organisation/${org.id}/mitglieder/${m.id}`, { method: "PATCH", body: { rolle: e.target.value } }), "Teamrolle geändert.")}
                  >
                    {EINLADUNG_ROLLEN.filter((r) => TEAM_ROLLEN[r].stufe <= eigeneStufe).map((r) => <option key={r} value={r}>{teamRolleLabel(r)}</option>)}
                  </select>
                </label>
              ) : (
                m.rolle !== "inhaber" && <Badge>{teamRolleLabel(m.rolle)}</Badge>
              )}
              {org.rolle === "inhaber" && !m.ich && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={Crown}
                  disabled={!!a.laeuft}
                  aria-label={`Inhaberschaft an ${nameVon(m.nutzer)} übertragen`}
                  onClick={async () => (await bestaetigen({ titel: `Inhaberschaft an ${nameVon(m.nutzer)} übertragen?`, text: "Sie werden danach Admin und verlieren die Inhaberrechte.", bestaetigenText: "Inhaberschaft übertragen", gefahr: true })) && a.los(m.id, () => senden(`/api/portal/organisation/${org.id}/mitglieder/${m.id}`, { method: "PATCH", body: { rolle: "inhaber" } }), "Inhaberschaft übertragen.")}
                >
                  <span className="hidden sm:inline">Übertragen</span>
                </Button>
              )}
              {aendernErlaubt && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  icon={UserMinus}
                  disabled={!!a.laeuft}
                  aria-label={`${nameVon(m.nutzer)} entfernen`}
                  onClick={async () => (await bestaetigen({ titel: `${nameVon(m.nutzer)} aus dem Team entfernen?`, text: "Die Person verliert den Zugriff auf die Objekte der Organisation.", bestaetigenText: "Mitglied entfernen", gefahr: true })) && a.los(m.id, () => senden(`/api/portal/organisation/${org.id}/mitglieder/${m.id}`, { method: "DELETE" }), "Mitglied entfernt.")}
                >
                  <span className="hidden sm:inline">Entfernen</span>
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

function Einladungen({ org }) {
  const a = useAktion();
  if (!org.einladungen.length) return <p className="text-[14px] text-ink-500">Keine offenen Einladungen.</p>;
  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100">
        {org.einladungen.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <div className="min-w-0 flex-1">
              <p className="break-all text-[14px] font-semibold text-ink-900">{e.email}</p>
              <p className="text-[12.5px] text-ink-500">{teamRolleLabel(e.rolle)} · von {e.eingeladenVon} · {e.abgelaufen ? "abgelaufen" : `gültig bis ${datum(e.ablauf)}`}</p>
            </div>
            <Button type="button" size="sm" variant="ghost" icon={X} disabled={!!a.laeuft} aria-label={`Einladung an ${e.email} widerrufen`} onClick={() => a.los(e.id, () => senden(`/api/portal/organisation/${org.id}/einladungen/${e.id}`, { method: "DELETE" }), "Einladung widerrufen.")}>
              Widerrufen
            </Button>
          </li>
        ))}
      </ul>
      <FehlerBox>{a.fehler}</FehlerBox>
    </div>
  );
}

function Objekte({ org }) {
  const a = useAktion();
  const [auswahl, setAuswahl] = useState([]);
  return (
    <div className="space-y-4">
      {org.objekte.liste.length ? (
        <ul className="divide-y divide-ink-100">
          {org.objekte.liste.map((o) => (
            <li key={`${o.art}-${o.id}`} className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0 last:pb-0">
              <Badge>{OBJEKT_ART[o.art]}</Badge>
              <Link href={o.link} className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink-900 hover:text-ov-700">{o.titel}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-ink-500">Noch keine Objekte. Neue Flächen, Projekte und Interessen, die Sie im Kontext dieser Organisation anlegen, gehören automatisch dem Team.</p>
      )}
      {org.zuordenbar.length > 0 && (
        <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <p className="text-[14px] font-semibold text-ink-900">Eigene Objekte übernehmen</p>
          <p className="mt-0.5 text-[13px] text-ink-600">Ausgewählte persönliche Objekte sehen danach alle Mitglieder gemäß ihrer Rolle. Sie bleiben Eigentümer.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {org.zuordenbar.map((o) => {
              const k = `${o.art}:${o.id}`;
              return (
                <Chip key={k} value={k} checked={auswahl.includes(k)} onChange={() => setAuswahl((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>
                  {OBJEKT_ART[o.art]}: {o.titel}
                </Chip>
              );
            })}
          </div>
          <Button
            type="button"
            size="sm"
            className="mt-3"
            icon={a.laeuft ? Loader2 : ArrowRightLeft}
            disabled={!auswahl.length || !!a.laeuft}
            onClick={() =>
              a.los("zuordnen", async () => {
                for (const k of auswahl) {
                  const [art, id] = k.split(":");
                  await senden("/api/portal/organisation/zuordnen", { body: { art, id, organisationId: org.id } });
                }
                setAuswahl([]);
              }, `${auswahl.length} Objekt(e) übernommen.`)
            }
          >
            In die Organisation übernehmen
          </Button>
        </div>
      )}
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

function Stammdaten({ org }) {
  const id = useId();
  const a = useAktion();
  const [name, setName] = useState(org.name);
  const [art, setArt] = useState(org.art);
  const eigenesMitglied = org.mitglieder.find((m) => m.ich);
  return (
    <div className="space-y-5">
      {darfTeamVerwalten(org.rolle) && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            a.los("stamm", () => senden(`/api/portal/organisation/${org.id}`, { method: "PATCH", body: { name, art } }), "Gespeichert.");
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id={`${id}-n`} label="Name">
              <input id={`${id}-n`} required className={eingabe} value={name} onChange={(e) => setName(e.target.value)} />
            </Feld>
            <Feld id={`${id}-a`} label="Art">
              <select id={`${id}-a`} className={auswahlfeld} value={art} onChange={(e) => setArt(e.target.value)}>
                {Object.entries(ORGANISATION_ARTEN).map(([k, o]) => <option key={k} value={k}>{o.label}</option>)}
              </select>
            </Feld>
          </div>
          <Button type="submit" size="sm" variant="secondary" disabled={!!a.laeuft}>Speichern</Button>
        </form>
      )}
      <div className="flex flex-wrap gap-2 border-t border-ink-100 pt-4">
        {org.rolle !== "inhaber" && eigenesMitglied && (
          <Button type="button" size="sm" variant="ghost" icon={LogOut} disabled={!!a.laeuft} onClick={async () => (await bestaetigen({ titel: "Organisation verlassen?", text: "Sie verlieren den Zugriff auf die Objekte der Organisation.", details: [{ label: "Organisation", wert: org.name }], bestaetigenText: "Organisation verlassen", gefahr: true })) && a.los("austreten", () => senden(`/api/portal/organisation/${org.id}/mitglieder/${eigenesMitglied.id}`, { method: "DELETE" }), "Sie haben die Organisation verlassen.")}>
            Organisation verlassen
          </Button>
        )}
        {org.rolle === "inhaber" && (
          <Button type="button" size="sm" variant="ghost" icon={Trash2} className="text-danger-700 hover:bg-danger-50" disabled={!!a.laeuft} onClick={async () => (await bestaetigen({ titel: `„${org.name}“ löschen?`, text: "Objekte werden wieder persönlich, Mitgliedschaften enden.", bestaetigenText: "Organisation löschen", gefahr: true })) && a.los("loeschen", () => senden(`/api/portal/organisation/${org.id}`, { method: "DELETE" }), "Organisation gelöscht.")}>
            Organisation löschen
          </Button>
        )}
      </div>
      <FehlerBox>{a.fehler}</FehlerBox>
      <ErfolgBox>{a.erfolg}</ErfolgBox>
    </div>
  );
}

/** Verwaltung einer Organisation (Mitglieder, Einladungen, Objekte, Stammdaten) */
export function OrganisationVerwaltung({ org }) {
  const verwalten = darfTeamVerwalten(org.rolle);
  const karte = "min-w-0 rounded-3xl bg-white ring-1 ring-ink-200/70";
  const kopf = (t, u, extra) => (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4 md:px-6">
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-bold text-ink-900">{t}</h2>
        {u && <p className="mt-0.5 text-[13.5px] text-ink-500">{u}</p>}
      </div>
      {extra}
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className={karte}>
          {kopf("Mitglieder", `${org.mitglieder.length} Person(en)`, <Badge ton="info">Ihre Rolle: {teamRolleLabel(org.rolle)}</Badge>)}
          <div className="p-5 md:p-6"><Mitglieder org={org} /></div>
        </section>
        <section className={karte}>
          {kopf("Mitglied einladen", "Einladungslink per E-Mail", <Link2 aria-hidden="true" className="h-5 w-5 text-ink-400" />)}
          <div className="p-5 md:p-6">
            {verwalten ? <Einladen org={org} /> : <p className="text-[14px] text-ink-500">Einladen können Admins und der Inhaber.</p>}
            {verwalten && (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <p className="mb-3 text-[13.5px] font-semibold text-ink-700">Offene Einladungen</p>
                <Einladungen org={org} />
              </div>
            )}
          </div>
        </section>
      </div>
      <section className={karte}>
        {kopf("Objekte der Organisation", `${org.objekte.flaechen} Flächen · ${org.objekte.projekte} Projekte · ${org.objekte.interessen} Interessen`)}
        <div className="p-5 md:p-6">
          {darfTeamSchreiben(org.rolle) || org.objekte.liste.length ? <Objekte org={org} /> : <p className="text-[14px] text-ink-500">Keine Objekte.</p>}
        </div>
      </section>
      <section className={karte}>
        {kopf("Einstellungen", null)}
        <div className="p-5 md:p-6"><Stammdaten org={org} /></div>
      </section>
    </div>
  );
}

/** Kontextwechsel direkt auf der Organisationsseite */
export function KontextKnopf({ org, aktiv }) {
  const a = useAktion();
  if (aktiv) return <Badge ton="ok">Aktiver Kontext</Badge>;
  return (
    <Button type="button" size="sm" variant="secondary" icon={ArrowRightLeft} disabled={!!a.laeuft} onClick={() => a.los("wechsel", () => senden("/api/portal/organisation/wechseln", { body: { organisationId: org.id } }))}>
      In diese Organisation wechseln
    </Button>
  );
}
