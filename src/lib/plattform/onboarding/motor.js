// src/lib/plattform/onboarding/motor.js
//
// Onboarding-Assistenten je Rolle und Untertyp – Auswertung der deklarativen Pfade (pfade/*.js).
// Rein, ohne Node-Importe: Server (Prüfung), Browser (Anzeige), Demo-Backend und Tests nutzen dieselbe Logik.
// Frappe spiegelt die Auswertung in plattform/onboarding_kern.py (Definitionen als JSON aus
// scripts/onboarding-pfade-export.mjs → plattform/onboarding_pfade.json).
//
// Kriterien (JSON-fähig, damit Python dieselben Definitionen auswertet):
//   { fakt: "telefon" }                     Fakt wahr bzw. Zahl > 0
//   { fakt: "flaechen", min: 2 }            Zahl ≥ min
//   { fakt: "kyc.status", in: ["…"] }       Wert in Liste
//   { merker: true }                        Schritt wurde im Assistenten bestätigt („Verstanden“)
//   { untertyp: ["privat"] }                gewählter Untertyp
//   { alle: [...] } · { eines: [...] } · { nicht: {...} }
//
// Zustand am Konto (Demo: nutzer.onboardingPfade, Frappe: Plattform Konto.onboarding_pfade, JSON):
//   { aktiv: pfadId, pfade: { [pfadId]: { untertyp, bestaetigt[], spaeter[], gestartetAm, abgeschlossenAm } },
//     tour: { aus, gesehen[] }, mails: { willkommen, erinnerung3, erinnerung7 }, auswertung: {…Snapshot}, aktualisiertAm }
// Wer was ändern darf, entscheidet aenderungPruefen() – der Server ruft sie vor jedem Speichern auf.

export const ID_MUSTER = /^[a-z][a-z0-9_]{0,39}$/;
export const TAG_MS = 24 * 3600 * 1000;
/** Erinnerungen an offene Pflichtschritte nach diesen Tagen (ab Registrierung) */
export const ERINNERUNG_TAGE = [3, 7];
/** Willkommensmail nur für Konten, die höchstens so alt sind (keine Mails an Bestandskonten) */
export const WILLKOMMEN_MAX_TAGE = 14;

const istZahl = (x) => typeof x === "number" && Number.isFinite(x);

/** Wert eines Fakts über Punktpfad („kyc.status“) */
export function faktWert(fakten, pfad) {
  let w = fakten;
  for (const teil of String(pfad || "").split(".")) {
    if (w === null || w === undefined || typeof w !== "object") return undefined;
    w = w[teil];
  }
  return w;
}

const wahr = (w) => (Array.isArray(w) ? w.length > 0 : istZahl(w) ? w > 0 : !!w);

/** Kriterium auswerten. kontext: { fakten, bestaetigt: Set|[], untertyp } */
export function kriteriumErfuellt(k, kontext, schrittId = null) {
  if (!k || typeof k !== "object") return false;
  const { fakten = {}, untertyp = null } = kontext;
  const bestaetigt = kontext.bestaetigt instanceof Set ? kontext.bestaetigt : new Set(kontext.bestaetigt || []);
  if (Array.isArray(k.alle)) return k.alle.every((x) => kriteriumErfuellt(x, kontext, schrittId));
  if (Array.isArray(k.eines)) return k.eines.some((x) => kriteriumErfuellt(x, kontext, schrittId));
  if (k.nicht) return !kriteriumErfuellt(k.nicht, kontext, schrittId);
  if (k.merker) return !!schrittId && bestaetigt.has(schrittId);
  if (Array.isArray(k.untertyp)) return !!untertyp && k.untertyp.includes(untertyp);
  if (typeof k.fakt === "string") {
    const w = faktWert(fakten, k.fakt);
    if (Array.isArray(k.in)) return k.in.includes(w);
    if (istZahl(k.min)) return istZahl(w) ? w >= k.min : false;
    return wahr(w);
  }
  return false;
}

/** Gilt ein Schritt für diesen Untertyp? (nurFuer: [untertypen]) */
export const schrittGilt = (s, untertyp) => !Array.isArray(s.nurFuer) || (!!untertyp && s.nurFuer.includes(untertyp)) || (!untertyp && s.nurFuer.includes("*"));

/** Pflicht für diesen Untertyp? (true | false | [untertypen]) */
export const schrittPflicht = (s, untertyp) => (Array.isArray(s.pflicht) ? !!untertyp && s.pflicht.includes(untertyp) : !!s.pflicht);

/** Text/Punkte je Untertyp auflösen */
function aufloesen(s, untertyp) {
  const t = (s.texte && untertyp && s.texte[untertyp]) || s.text || "";
  const punkte = [...(s.punkte || []), ...((s.punkteJe && untertyp && s.punkteJe[untertyp]) || [])];
  const links = [...((s.linksJe && untertyp && s.linksJe[untertyp]) || []), ...(s.links || [])];
  return { text: t, punkte, links };
}

/** Leerer Zustand */
export function pfadZustandLeer() {
  return { aktiv: null, pfade: {}, tour: { aus: false, gesehen: [] }, mails: {}, auswertung: null, aktualisiertAm: null };
}

const idListe = (x, max = 60) => (Array.isArray(x) ? [...new Set(x.filter((y) => typeof y === "string" && ID_MUSTER.test(y)))].slice(0, max) : []);
const zeit = (x) => (typeof x === "string" && x.length <= 40 && !Number.isNaN(Date.parse(x)) ? x : null);

/** Gespeicherten Zustand bereinigen (Positivliste, Format – Server und Browser) */
export function pfadZustandBereinigen(roh) {
  const o = roh && typeof roh === "object" && !Array.isArray(roh) ? roh : {};
  const z = pfadZustandLeer();
  z.aktiv = typeof o.aktiv === "string" && ID_MUSTER.test(o.aktiv) ? o.aktiv : null;
  for (const [id, p] of Object.entries(o.pfade && typeof o.pfade === "object" ? o.pfade : {}).slice(0, 12)) {
    if (!ID_MUSTER.test(id) || !p || typeof p !== "object") continue;
    z.pfade[id] = {
      untertyp: typeof p.untertyp === "string" && ID_MUSTER.test(p.untertyp) ? p.untertyp : null,
      bestaetigt: idListe(p.bestaetigt),
      spaeter: idListe(p.spaeter),
      gestartetAm: zeit(p.gestartetAm),
      abgeschlossenAm: zeit(p.abgeschlossenAm),
    };
  }
  const t = o.tour && typeof o.tour === "object" ? o.tour : {};
  z.tour = { aus: t.aus === true, gesehen: idListe(t.gesehen, 80) };
  const m = o.mails && typeof o.mails === "object" ? o.mails : {};
  z.mails = Object.fromEntries(["willkommen", "erinnerung3", "erinnerung7"].filter((k) => zeit(m[k])).map((k) => [k, m[k]]));
  const a = o.auswertung && typeof o.auswertung === "object" ? o.auswertung : null;
  z.auswertung = a && typeof a.pfad === "string" && ID_MUSTER.test(a.pfad)
    ? { pfad: a.pfad, untertyp: typeof a.untertyp === "string" && ID_MUSTER.test(a.untertyp) ? a.untertyp : null, erledigt: istZahl(a.erledigt) ? a.erledigt : 0, gesamt: istZahl(a.gesamt) ? a.gesamt : 0, pflichtOffen: idListe(a.pflichtOffen), quote: istZahl(a.quote) ? a.quote : 0, abgeschlossen: a.abgeschlossen === true, am: zeit(a.am) }
    : null;
  z.aktualisiertAm = zeit(o.aktualisiertAm);
  return z;
}

/**
 * Pfad für Anzeige und Prüfung auswerten.
 * @param pfad     Definition (pfade/*.js)
 * @param fakten   Fakten aus echten Daten (server/onboarding.js bzw. Frappe)
 * @param zustand  Pfad-Zustand ({ untertyp, bestaetigt, spaeter, abgeschlossenAm })
 * @param optionen { untertypVorschlag, legacyMerker: [ids] } – Vorschlag aus Daten (z. B. Investorentyp im Suchprofil)
 */
export function pfadAuswerten(pfad, fakten = {}, zustand = {}, { untertypVorschlag = null, legacyMerker = [] } = {}) {
  const untertypen = pfad.untertypen || null;
  const gewaehlt = zustand?.untertyp && untertypen?.[zustand.untertyp] ? zustand.untertyp : null;
  const vorschlag = untertypVorschlag && untertypen?.[untertypVorschlag] ? untertypVorschlag : null;
  const untertyp = gewaehlt || vorschlag || null;
  const bestaetigt = new Set([...(zustand?.bestaetigt || []), ...legacyMerker]);
  const spaeter = new Set(zustand?.spaeter || []);
  const kontext = { fakten: { ...fakten, untertyp }, bestaetigt, untertyp };
  const schritte = pfad.schritte
    .filter((s) => schrittGilt(s, untertyp))
    .map((s) => {
      const erledigt = kriteriumErfuellt(s.kriterium, kontext, s.id);
      const { text, punkte, links } = aufloesen(s, untertyp);
      return {
        id: s.id, titel: s.titel, kurz: s.kurz || s.titel, art: s.art || "info", formular: s.formular || null, text, punkte, links,
        begriff: s.begriff || null, firmaLabel: s.firmaLabel || null, pflicht: schrittPflicht(s, untertyp), bestaetigbar: !!s.bestaetigbar, bestaetigenText: s.bestaetigenText || null,
        erledigt, spaeter: !erledigt && spaeter.has(s.id),
      };
    });
  const erledigtAnzahl = schritte.filter((s) => s.erledigt).length;
  const pflichtOffen = schritte.filter((s) => s.pflicht && !s.erledigt).map((s) => s.id);
  return {
    id: pfad.id, titel: pfad.titel, text: pfad.text, gruppe: pfad.gruppe || "extern",
    untertyp, untertypGewaehlt: !!gewaehlt, untertypen: untertypen ? Object.entries(untertypen).map(([id, u]) => ({ id, label: u.label, text: u.text || "" })) : [],
    schritte, erledigt: erledigtAnzahl, gesamt: schritte.length, quote: schritte.length ? Math.round((erledigtAnzahl / schritte.length) * 100) : 100,
    pflichtOffen, abschliessbar: pflichtOffen.length === 0, abgeschlossen: !!zustand?.abgeschlossenAm && pflichtOffen.length === 0,
    abgeschlossenAm: zustand?.abgeschlossenAm || null, naechster: (schritte.find((s) => !s.erledigt && !s.spaeter) || schritte.find((s) => !s.erledigt) || null)?.id || null,
  };
}

/** Kurz-Snapshot einer Auswertung (für Team-Sicht und Erinnerungen) */
export function auswertungSnapshot(a, am) {
  return { pfad: a.id, untertyp: a.untertyp, erledigt: a.erledigt, gesamt: a.gesamt, pflichtOffen: a.pflichtOffen, quote: a.quote, abgeschlossen: a.abgeschlossen, am };
}

/**
 * Änderung prüfen und anwenden (Server). Wirft { status, meldung } als Fehlerobjekt über `fehler(status, meldung)`.
 * aktion: { aktion: pfad|untertyp|bestaetigen|spaeter|fortsetzen|abschliessen|tour, pfad?, untertyp?, schritt?, aus?, gesehen? }
 * erlaubt: { pfade: [Definitionen, die das Konto nutzen darf], untertypErlaubt?: (pfad, untertyp) => bool, auswertung?: (pfadId) => Auswertung, touren: {id:…} }
 */
export function aenderungPruefen(zustandRoh, aktion, erlaubt, fehler, am = new Date().toISOString()) {
  const z = pfadZustandBereinigen(zustandRoh);
  const a = aktion && typeof aktion === "object" ? aktion : {};
  const art = String(a.aktion || "");
  const pfadDef = (id) => erlaubt.pfade.find((p) => p.id === id) || null;
  const pz = (id) => (z.pfade[id] ||= { untertyp: null, bestaetigt: [], spaeter: [], gestartetAm: am, abgeschlossenAm: null });

  if (art === "tour") {
    if (a.aus !== undefined) {
      if (typeof a.aus !== "boolean") throw fehler(422, "Ungültige Angabe zur Tour.");
      z.tour.aus = a.aus;
    }
    if (a.gesehen !== undefined) {
      if (typeof a.gesehen !== "string" || !erlaubt.touren?.[a.gesehen]) throw fehler(422, "Unbekannter Tour-Hinweis.");
      if (!z.tour.gesehen.includes(a.gesehen)) z.tour.gesehen.push(a.gesehen);
    }
    z.aktualisiertAm = am;
    return z;
  }

  const def = pfadDef(String(a.pfad || ""));
  if (!def) throw fehler(403, "Dieser Einstieg passt nicht zu Ihren Rollen.");
  const p = pz(def.id);

  if (art === "pfad") {
    z.aktiv = def.id;
  } else if (art === "untertyp") {
    const u = String(a.untertyp || "");
    if (!def.untertypen?.[u] || (erlaubt.untertypErlaubt && !erlaubt.untertypErlaubt(def, u))) throw fehler(422, "Diese Auswahl ist für Ihr Konto nicht möglich.");
    p.untertyp = u;
    z.aktiv = def.id;
  } else if (art === "bestaetigen" || art === "spaeter" || art === "fortsetzen") {
    const schritt = String(a.schritt || "");
    const auswertung = erlaubt.auswertung ? erlaubt.auswertung(def.id, p) : null;
    const s = auswertung ? auswertung.schritte.find((x) => x.id === schritt) : def.schritte.find((x) => x.id === schritt);
    if (!s) throw fehler(422, "Diesen Schritt gibt es in Ihrem Einstieg nicht.");
    if (art === "bestaetigen") {
      if (!s.bestaetigbar) throw fehler(422, "Dieser Schritt wird automatisch erledigt, sobald die Angaben vorliegen.");
      if (!p.bestaetigt.includes(schritt)) p.bestaetigt.push(schritt);
      p.spaeter = p.spaeter.filter((x) => x !== schritt);
    } else if (art === "spaeter") {
      if (!p.spaeter.includes(schritt)) p.spaeter.push(schritt);
    } else {
      p.spaeter = p.spaeter.filter((x) => x !== schritt);
    }
    z.aktiv ||= def.id;
  } else if (art === "abschliessen") {
    const auswertung = erlaubt.auswertung ? erlaubt.auswertung(def.id, p) : null;
    if (!auswertung) throw fehler(503, "Der Stand kann gerade nicht geprüft werden.");
    if (auswertung.pflichtOffen.length) {
      const titel = auswertung.schritte.filter((s) => auswertung.pflichtOffen.includes(s.id)).map((s) => s.kurz);
      throw fehler(409, `Noch offen: ${titel.join(", ")}.`);
    }
    p.abgeschlossenAm ||= am;
  } else {
    throw fehler(422, "Unbekannte Aktion.");
  }
  z.aktualisiertAm = am;
  return z;
}

/** Tour-Hinweis für einen Portalpfad (erster Treffer, längster Präfix zuerst) */
export function tourFuer(touren, pfadname, rollen = []) {
  const kandidaten = Object.entries(touren)
    .filter(([, t]) => (t.exakt ? pfadname === t.pfad : pfadname === t.pfad || pfadname.startsWith(t.pfad + "/")))
    .filter(([, t]) => !t.rollen || t.rollen.some((r) => rollen.includes(r)))
    .sort((a, b) => b[1].pfad.length - a[1].pfad.length);
  return kandidaten.length ? { id: kandidaten[0][0], ...kandidaten[0][1] } : null;
}

/**
 * Fällige Onboarding-Mail eines Kontos (Willkommen bzw. Erinnerung nach 3/7 Tagen) – oder null.
 * konto: { erstelltAm, checklisteAus }, zustand: bereinigter Pfad-Zustand (mit auswertung-Snapshot)
 */
export function faelligeMail(konto, zustand, jetztMs = Date.now()) {
  const erstellt = Date.parse(konto?.erstelltAm || "");
  if (!Number.isFinite(erstellt)) return null;
  const alterTage = (jetztMs - erstellt) / TAG_MS;
  const m = zustand.mails || {};
  const a = zustand.auswertung;
  if (!m.willkommen) return alterTage <= WILLKOMMEN_MAX_TAGE ? "willkommen" : null;
  if (!a || a.abgeschlossen || !a.pflichtOffen.length || konto.checklisteAus) return null;
  for (const t of [...ERINNERUNG_TAGE].reverse()) {
    const k = `erinnerung${t}`;
    if (alterTage >= t && !m[k]) return alterTage < t + 7 ? k : null; // nur im Zeitfenster – keine Nachholflut
  }
  return null;
}

/** Text einer Onboarding-Mail – ohne vertrauliche Inhalte, nur Anzahl offener Punkte und Link ins Portal */
export function mailInhalt(art, { pfadTitel = "Ihr Einstieg", offen = 0 } = {}) {
  if (art === "willkommen") {
    return {
      betreff: "Willkommen im Portal – ÖkoInvest",
      text: `vielen Dank für Ihre Registrierung. Ihr geführter Einstieg („${pfadTitel}“) zeigt Schritt für Schritt, was für ein arbeitsfähiges Konto nötig ist – jeder Schritt lässt sich auf später verschieben. Sie finden ihn jederzeit auf der Übersicht unter „Erste Schritte“.`,
      link: "/portal/willkommen", linkText: "Einstieg fortsetzen",
    };
  }
  return {
    betreff: "Ihr Einstieg im Portal – noch offene Schritte",
    text: `in Ihrem Einstieg („${pfadTitel}“) ${offen === 1 ? "ist noch 1 Pflichtschritt" : `sind noch ${offen} Pflichtschritte`} offen. Erst danach ist Ihr Konto vollständig arbeitsfähig. Sie können direkt dort weitermachen, wo Sie aufgehört haben. Diese Erinnerung erhalten Sie nicht mehr, wenn Sie die Checkliste auf der Übersicht ausblenden.`,
    link: "/portal/willkommen", linkText: "Einstieg fortsetzen",
  };
}
