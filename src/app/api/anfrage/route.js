// POST /api/anfrage – öffentliches Anfrageformular aller Zielgruppen (Vertrag: docs/BRIEFING.md, docs/API.md)
// Erzeugt einen Vorgang; bei typ flaeche/agri zusätzlich einen Flächen-Entwurf.
//
// Paket C (Welle 1):
//  - Keine Pflicht-Einwilligung mehr: Die Bearbeitung stützt sich auf Art. 6 Abs. 1 lit. b DSGVO, das Formular
//    zeigt dazu einen Hinweis (Text, Version und Hash werden beim Vorgang gespeichert). Optionale, getrennte
//    Einwilligungen (body.einwilligungen = { werbeanruf, newsletter, … } nur true/false) werden je Eintrag mit
//    Version und Text-Hash protokolliert. Texte: src/lib/anfrage/hinweise.js (ENTWURF, Strang R).
//    Ältere Clients mit body.einwilligung = true funktionieren weiter.
//  - Rückruf ausdrücklich gewählt (body.rueckruf = true) → Telefon ist Pflicht (serverseitig geprüft).
//  - Server-Zähler ohne Kennung (src/lib/anfrage/zaehler.js): versuch / angelegt / abgelehnt / honeypot.
//
// Welle 2:
//  - Paket GRP: Der Kanal wird serverseitig neu berechnet (herkunftBereinigen, src/lib/gruppe/kanal.js); eine
//    Partner-/Gruppenkennung wird nur übernommen, wenn sie im Register wirksam ist.
//  - Paket B3: Land (Pflicht, sonst „unbekannt“), Routing, Score, SLA-Klasse, getrennte Personendaten und das
//    Einwilligungsprotokoll entstehen im Backend (anfrageAnlegen → demo/leadkette.js bzw. Frappe einwilligung.py).
//    Personendaten stehen nie in Logs oder Fehlermeldungen dieser Route.

import { createHash } from "node:crypto";
import { route } from "@/lib/plattform/server/route";
import { PlattformFehler } from "@/lib/plattform/fehler";
import { HINWEIS, einwilligungenAufbereiten, hinweisText } from "@/lib/anfrage/hinweise";
import { anfrageLand } from "@/lib/anfrage/laender";
import { anfrageZaehlen } from "@/lib/anfrage/zaehler";
import { herkunftBereinigen } from "@/lib/gruppe/kanal";

const sha256 = (s) => createHash("sha256").update(String(s)).digest("hex");
const objekt = (x) => (x && typeof x === "object" && !Array.isArray(x) ? x : {});

export const POST = route({ auth: "optional", limit: "anfrage", maxBytes: 48 * 1024 }, async ({ body, backend, ip, nutzer }) => {
  const kontakt = objekt(body.kontakt);
  const daten = objekt(body.daten);
  const herkunftRoh = objekt(body.herkunft);
  const { kanal, partnerKennung } = herkunftBereinigen(herkunftRoh); // GRP: Kanal nie vom Browser übernehmen
  const herkunft = { ...herkunftRoh, kanal, partnerKennung };
  const merkmale = { typ: body.typ, land: anfrageLand(kontakt, daten), kanal };

  if (body.website) {
    anfrageZaehlen({ ...merkmale, ereignis: "honeypot" });
    return { ok: true, id: "", vorgang: null }; // Honeypot: still verwerfen
  }
  anfrageZaehlen({ ...merkmale, ereignis: "versuch" });

  try {
    const telefon = typeof kontakt.telefon === "string" ? kontakt.telefon.trim() : "";
    const rueckruf = body.rueckruf === true;
    if (rueckruf && !telefon) throw new PlattformFehler(422, "Für einen Rückruf brauchen wir Ihre Telefonnummer.");
    const am = new Date().toISOString();
    const sprache = daten.sprache === "en" ? "en" : "de"; // /en-Formulare zeigen den englischen Wortlaut
    const ergebnis = await backend.anfrageAnlegen({
      typ: body.typ,
      kontakt,
      daten: { ...daten, rueckrufGewuenscht: rueckruf },
      herkunft,
      ip,
      einwilligungText: hinweisText(sprache),
      hinweis: { id: HINWEIS.id, version: HINWEIS.version, rechtsgrundlage: HINWEIS.rechtsgrundlage, textHash: sha256(hinweisText(sprache)) },
      einwilligungen: einwilligungenAufbereiten(body.einwilligungen, { hash: sha256, am, telefon, sprache }),
      nutzer,
    });
    anfrageZaehlen({ ...merkmale, land: ergebnis.vorgang?.land || merkmale.land, ereignis: "angelegt" });
    return { ok: true, id: ergebnis.id, vorgang: ergebnis.vorgang };
  } catch (e) {
    anfrageZaehlen({ ...merkmale, ereignis: "abgelehnt" });
    throw e;
  }
});
