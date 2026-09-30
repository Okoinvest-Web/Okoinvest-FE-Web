// src/lib/plattform/ki/index.js
//
// Ablauf eines Assistenten-Aufrufs (nur serverseitig):
//   1. Anwendungsfall + Rolle prüfen, Rate-Limit je Konto und IP
//   2. Eingaben prüfen (Länge, Typ)
//   3. Kontext bauen – die Rechteprüfung passiert DABEI im Backend (fremdes Objekt → 403/404,
//      bevor irgendein Inhalt zusammengestellt ist)
//   4. Tages-Kontingent prüfen
//   5. KI-Modus (Claude API) – oder regelbasiert, wenn kein Schlüssel gesetzt ist bzw. der Dienst
//      ausfällt. Nie ein Fehler nur wegen fehlender KI.
//   6. Nutzung protokollieren (ohne Inhalte)
//
// Antwort (JSON): { ok, fall, modus: "ki"|"regel", ergebnis, quellen, hinweis, kontingent }
// Streaming (NDJSON, nur Textfälle im KI-Modus): {t:"start",…} {t:"text",text} … {t:"ende"} | {t:"ersetzen",…}

import { PlattformFehler } from "../fehler";
import { rateLimit } from "../server/rateLimit";
import { ANWENDUNGSFAELLE, kiAktiv, RATE_IP, RATE_KONTO, rateFaktor } from "./konfig";
import { erstellen, streamen, KiFehler } from "./client";
import * as P from "./prompts";
import { kontextExpose, kontextFlaeche, kontextFrage, kontextNachricht, kontextTriage } from "./kontext";
import { regelExpose, regelFlaeche, regelFrage, regelNachricht, regelTriage } from "./regeln";
import { kontingent, kontingentPruefen, protokollieren } from "./nutzung";
import { suchen, wissensBlock } from "./wissen";

export { kiAktiv } from "./konfig";
export { kontingent } from "./nutzung";

const HINWEIS_REGEL = "Regelbasierter Vorschlag – der KI-Assistent ist auf dieser Plattform nicht aktiviert.";
const HINWEIS_AUSFALL = "Der KI-Dienst ist gerade nicht erreichbar – hier ein regelbasierter Vorschlag.";

/** Darf dieser Nutzer den Anwendungsfall nutzen? (Admin darf alles) */
export function darfFall(fall, n) {
  const f = ANWENDUNGSFAELLE[fall];
  if (!f || !n) return false;
  const admin = n.rollen?.includes("admin");
  if (admin) return true;
  if (f.admin) return false;
  if (!f.rollen) return true;
  return f.rollen.some((r) => n.rollen?.includes(r));
}

export function erlaubteFaelle(n) {
  return Object.keys(ANWENDUNGSFAELLE).filter((f) => darfFall(f, n));
}

function text(wert, { min = 0, max, feld }) {
  if (wert === undefined || wert === null) wert = "";
  if (typeof wert !== "string") throw new PlattformFehler(422, `${feld}: ungültige Eingabe.`);
  const t = wert.replace(/\r/g, "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  if (t.length < min) throw new PlattformFehler(422, min > 1 ? `${feld}: bitte mindestens ${min} Zeichen.` : `${feld} fehlt.`);
  if (t.length > max) throw new PlattformFehler(422, `${feld}: höchstens ${max} Zeichen.`);
  return t;
}

const liste = (x, max, laenge) => (Array.isArray(x) ? x : []).map((s) => String(s || "").trim()).filter(Boolean).slice(0, max).map((s) => (s.length > laenge ? `${s.slice(0, laenge - 1).trimEnd()}…` : s));

// ------------------------------------------------------------------ Anwendungsfälle

const FAELLE = {
  expose: {
    async kontext(b, n, body) {
      return kontextExpose(b, n, { projektId: body.projektId });
    },
    json: true,
    ki: (k) => ({ system: [P.BASIS, P.EXPOSE], nachricht: P.nachrichtExpose(k.daten), schema: P.EXPOSE_SCHEMA, effort: "medium", maxTokens: 6000 }),
    bereinigen: (j) => ({ beschreibung: String(j.beschreibung || "").trim().slice(0, 4000), highlights: liste(j.highlights, 6, 90), risiken: liste(j.risiken, 6, 300), fehlendeAngaben: liste(j.fehlendeAngaben, 12, 200) }),
    regel: (k) => regelExpose(k),
  },
  triage: {
    async kontext(b, n, body) {
      return kontextTriage(b, n, { vorgangId: body.vorgangId });
    },
    json: true,
    ki: (k) => ({ system: [P.BASIS, P.TRIAGE], nachricht: P.nachrichtTriage(k.daten), schema: P.TRIAGE_SCHEMA, effort: "low", maxTokens: 4000 }),
    bereinigen: (j, k) => ({
      zusammenfassung: String(j.zusammenfassung || "").slice(0, 1500),
      typVorschlag: j.typVorschlag || k.meta.vorgang.typ,
      prioritaet: ["hoch", "mittel", "niedrig"].includes(j.prioritaet) ? j.prioritaet : "mittel",
      begruendung: String(j.begruendung || "").slice(0, 500),
      fehlendeAngaben: liste(j.fehlendeAngaben, 10, 200),
      naechsterSchritt: String(j.naechsterSchritt || "").slice(0, 500),
      antwortEntwurf: String(j.antwortEntwurf || "").slice(0, 4000),
    }),
    regel: (k) => regelTriage(k),
  },
  frage: {
    eingaben: (body) => ({ frage: text(body.frage, { min: 3, max: 800, feld: "Frage" }) }),
    async kontext(b, n, body) {
      return kontextFrage(b, n, { projektId: body.projektId });
    },
    quellen: (k) => k.quellen.map((q) => ({ id: q.id, titel: q.titel, text: q.text.slice(0, 400) })),
    ki: (k, e) => ({ system: [P.BASIS, P.FRAGE], nachricht: P.nachrichtFrage({ projekttitel: k.daten.projekttitel, quellen: k.quellen, frage: e.frage }), effort: "medium", maxTokens: 4000 }),
    regel: (k, e) => {
      const r = regelFrage(k, e.frage);
      return { text: r.text };
    },
  },
  flaeche: {
    eingaben: (body) => ({ frage: text(body.frage, { max: 800, feld: "Frage" }) }),
    async kontext(b, n, body) {
      return kontextFlaeche(b, n, { flaecheId: body.flaecheId });
    },
    quellen: (k, e) => (e.frage ? suchen(e.frage, { anzahl: 3 }) : suchen(`${k.meta.flaeche.agri ? "agri-pv" : "pacht"} solarpark fläche`, { anzahl: 2 })).map((t) => ({ titel: t.titel, href: t.href })),
    ki: (k, e) => ({ system: [P.BASIS, P.FLAECHE, wissensBlock()], nachricht: P.nachrichtFlaeche(k.daten, e.frage), effort: "low", maxTokens: 3000 }),
    regel: (k, e) => ({ text: regelFlaeche(k, e.frage).text }),
  },
  nachricht: {
    eingaben: (body) => ({ stichpunkte: text(body.stichpunkte, { max: 1500, feld: "Stichpunkte" }) }),
    async kontext(b, n, body) {
      return kontextNachricht(b, n, { bezugArt: body.bezugArt, bezugId: body.bezugId });
    },
    ki: (k, e) => ({ system: [P.BASIS, P.NACHRICHT], nachricht: P.nachrichtEntwurf(k.daten, e.stichpunkte), effort: "low", maxTokens: 2000 }),
    regel: (k, e) => ({ text: regelNachricht(k, e.stichpunkte) }),
  },
};

function limitieren(n, ip) {
  const f = rateFaktor();
  rateLimit(`ki-konto:${n.id}`, Math.max(1, Math.round(RATE_KONTO[0] * f)), RATE_KONTO[1]);
  rateLimit(`ki-ip:${ip || "ohne-ip"}`, Math.max(1, Math.round(RATE_IP[0] * f)), RATE_IP[1]);
}

const zeile = (o) => `${JSON.stringify(o)}\n`;

/**
 * Führt einen Anwendungsfall aus. Liefert ein JSON-Objekt oder eine Streaming-Response.
 * `stream` (Body) = true wünscht Streaming; nur für Textfälle im KI-Modus.
 */
export async function ausfuehren({ fall, nutzer: n, body = {}, backend: b, ip = "" }) {
  const def = FAELLE[fall];
  if (!def) throw new PlattformFehler(404, "Unbekannter Anwendungsfall.");
  if (!darfFall(fall, n)) throw new PlattformFehler(403, "Dieser Assistent steht Ihrer Rolle nicht zur Verfügung.");
  limitieren(n, ip);
  const eingaben = def.eingaben ? def.eingaben(body) : {};

  // Rechteprüfung passiert hier – bei fremden Objekten wird ein 403/404 geworfen, bevor Kontext entsteht
  const k = await def.kontext(b, n, body);
  const kont = await kontingentPruefen(n);
  const quellen = def.quellen ? def.quellen(k, eingaben) : [];
  const basis = { ok: true, fall, quellen, kontingent: { limit: kont.limit, rest: Math.max(0, kont.rest - 1) } };
  const prot = { fall, objektArt: k.objektArt, objektId: k.objektId };

  const regelAntwort = async (hinweis, ergebnis = "ok") => {
    await protokollieren(n, { ...prot, modus: "regel", ergebnis });
    return { ...basis, modus: "regel", ergebnis: def.regel(k, eingaben), hinweis };
  };

  if (!kiAktiv()) return regelAntwort(HINWEIS_REGEL);

  const anfrage = def.ki(k, eingaben);

  // Strukturierte Fälle (Exposé, Triage): eine Anfrage, JSON-Schema
  if (def.json) {
    try {
      const r = await erstellen(anfrage);
      await protokollieren(n, { ...prot, modus: "ki", tokensEin: r.nutzung.ein, tokensAus: r.nutzung.aus });
      return { ...basis, modus: "ki", ergebnis: def.bereinigen(r.json, k), hinweis: "" };
    } catch (e) {
      if (!(e instanceof KiFehler)) throw e;
      return regelAntwort(e.art === "abgelehnt" ? "Der KI-Dienst hat diese Anfrage nicht bearbeitet – hier ein regelbasierter Vorschlag." : HINWEIS_AUSFALL, `ki-${e.art}`);
    }
  }

  // Textfälle: ohne Streaming-Wunsch eine normale Anfrage
  if (body.stream !== true) {
    try {
      const r = await erstellen(anfrage);
      await protokollieren(n, { ...prot, modus: "ki", tokensEin: r.nutzung.ein, tokensAus: r.nutzung.aus });
      return { ...basis, modus: "ki", ergebnis: { text: r.text.trim() }, hinweis: "" };
    } catch (e) {
      if (!(e instanceof KiFehler)) throw e;
      return regelAntwort(HINWEIS_AUSFALL, `ki-${e.art}`);
    }
  }

  // Streaming: Verbindung (inkl. Wiederholungen) VOR dem Antworten aufbauen – scheitert sie, Regelmodus als JSON
  let strom;
  try {
    strom = await streamen(anfrage);
  } catch (e) {
    if (!(e instanceof KiFehler)) throw e;
    return regelAntwort(HINWEIS_AUSFALL, `ki-${e.art}`);
  }

  const encoder = new TextEncoder();
  const lesbar = new ReadableStream({
    async start(controller) {
      const senden = (o) => controller.enqueue(encoder.encode(zeile(o)));
      let nutzung = { ein: 0, aus: 0 };
      let ergebnis = "ok";
      senden({ t: "start", ...basis, modus: "ki", hinweis: "" });
      try {
        for await (const e of strom.ereignisse()) {
          if (e.typ === "text") senden({ t: "text", text: e.text });
          else if (e.typ === "abgelehnt") {
            ergebnis = "ki-abgelehnt";
            senden({ t: "ersetzen", modus: "regel", ergebnis: def.regel(k, eingaben), hinweis: "Der KI-Dienst hat diese Anfrage nicht bearbeitet – hier ein regelbasierter Vorschlag." });
          } else if (e.typ === "ende") {
            nutzung = e.nutzung;
            if (e.stopReason === "max_tokens") senden({ t: "hinweis", hinweis: "Die Antwort wurde gekürzt." });
          }
        }
        senden({ t: "ende" });
      } catch (err) {
        ergebnis = "ki-abbruch";
        console.error("[plattform-ki] Stream abgebrochen:", err?.message);
        senden({ t: "ersetzen", modus: "regel", ergebnis: def.regel(k, eingaben), hinweis: HINWEIS_AUSFALL });
        senden({ t: "ende" });
      } finally {
        await protokollieren(n, { ...prot, modus: "ki", ergebnis, tokensEin: nutzung.ein, tokensAus: nutzung.aus });
        controller.close();
      }
    },
  });
  return new Response(lesbar, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

/** Status für die Oberfläche */
export async function status(n) {
  const k = await kontingent(n);
  return { ok: true, aktiv: kiAktiv(), faelle: erlaubteFaelle(n), kontingent: { limit: k.limit, rest: k.rest } };
}
