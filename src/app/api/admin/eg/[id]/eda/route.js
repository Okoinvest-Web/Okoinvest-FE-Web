// /api/admin/eg/[id]/eda – EDA-Marktkommunikation einer Gemeinschaft (WP2, Backoffice Bereich „eg“; Kontext-Rechte prüft das Backend)
// GET  ohne Parameter          → Übersicht (Kennzahlen, Prozesse mit Fristen-Ampel, Teilnahmen, Lücken, Netzbetreiber-Anleitungen)
//      ?prozess=EDP-…          → Prozessdetail mit Nachrichten (Rohinhalt), Responsecode im Klartext, ggf. Abgleich Zählpunktliste
//      ?journal=1&richtung=&code=&q=&nachricht= → Nachrichtenjournal (SHA-256) bzw. eine Nachricht mit Rohinhalt
//      ?reklamation=1&nb=ENB-… → Befunde + Vorlage der Datenqualitäts-Reklamation · ?akte=EDP-… → Beschwerdeakte (Text)
// POST { aktion, … }: anmelden {teilnahmeIds[], offline?} · erneut {teilnahmeIds?} · erinnern {teilnahmeIds?} · tf {aenderungen[]}
//      abmelden {teilnahmeIds[], zum} · podlist · nachforderung {teilnahmeId, von, bis} · verteilschluessel {verteilschluesselId}
//      fristenlauf · eingang {xml} (manuell eingespielte EDA-Nachricht) · reklamation {reklamationAktion, …}
//      simulator {simulatorAktion: zustellen|energiedaten|status, alle?} · freigeben (nur Vorstand → im Backoffice 403)
import { route } from "@/lib/plattform/server/route";
import { egBackend } from "@/lib/plattform/backend/eg";
import { PlattformFehler } from "@/lib/plattform/fehler";

export const GET = route({ admin: true }, async ({ nutzer, params, suche }) => {
  const b = egBackend();
  const id = params.id;
  if (suche.get("prozess")) return { ok: true, ...(await b.edaProzess(nutzer, suche.get("prozess"))) };
  if (suche.get("journal")) return { ok: true, ...(await b.edaJournal(nutzer, id, { richtung: suche.get("richtung") || "", code: suche.get("code") || "", q: suche.get("q") || "", nachrichtId: suche.get("nachricht") || "", limit: Number(suche.get("limit")) || 200 })) };
  if (suche.get("akte")) {
    const akte = await b.edaReklamation(nutzer, id, { reklamationAktion: "akte", prozessId: suche.get("akte") });
    if (!suche.get("datei")) return { ok: true, ...akte };
    return new Response(akte.text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${String(akte.dateiname).replace(/"/g, "")}"`, "Cache-Control": "no-store" } });
  }
  if (suche.get("reklamation")) return { ok: true, ...(await b.edaReklamation(nutzer, id, { reklamationAktion: "vorschau", netzbetreiberId: suche.get("nb") || "" })) };
  return { ok: true, ...(await b.edaUebersicht(nutzer, id)) };
});

export const POST = route({ admin: true, maxBytes: 4.5 * 1024 * 1024 }, async ({ nutzer, params, body }) => {
  const b = egBackend();
  const id = params.id;
  const { aktion } = body;
  switch (aktion) {
    case "anmelden":
      return { ok: true, ...(await b.edaAnmelden(nutzer, id, { teilnahmeIds: body.teilnahmeIds, offline: !!body.offline })) };
    case "erneut":
      return { ok: true, ...(await b.edaErneutAnstossen(nutzer, id, { teilnahmeIds: body.teilnahmeIds || null })) };
    case "erinnern":
      return { ok: true, ...(await b.edaErinnern(nutzer, id, { teilnahmeIds: body.teilnahmeIds || null })) };
    case "tf":
      return { ok: true, ...(await b.edaTfAendern(nutzer, id, { aenderungen: body.aenderungen })) };
    case "abmelden":
      return { ok: true, ...(await b.edaAbmelden(nutzer, id, { teilnahmeIds: body.teilnahmeIds, zum: body.zum })) };
    case "freigeben":
      return { ok: true, ...(await b.edaFreigeben(nutzer, id, { prozessIds: body.prozessIds, entscheidung: body.entscheidung, grund: body.grund })) };
    case "podlist":
      return { ok: true, ...(await b.edaPodlistAnfordern(nutzer, id)) };
    case "nachforderung":
      return { ok: true, ...(await b.edaNachforderung(nutzer, { teilnahmeId: body.teilnahmeId, zaehlpunktId: body.zaehlpunktId, gemeinschaftId: id, von: body.von, bis: body.bis })) };
    case "verteilschluessel":
      return { ok: true, ...(await b.edaVerteilschluesselSenden(nutzer, body.verteilschluesselId)) };
    case "fristenlauf":
      return { ok: true, ...(await b.edaFristenLauf(nutzer, { gemeinschaftId: id })) };
    case "eingang":
      return { ok: true, ...(await b.edaNachrichtEingang(nutzer, { xml: body.xml, quelle: "manuell" })) };
    case "reklamation":
      return { ok: true, ...(await b.edaReklamation(nutzer, id, body)) };
    case "simulator":
      return { ok: true, ...(await b.edaSimulator(nutzer, id, { simulatorAktion: body.simulatorAktion, alle: !!body.alle })) };
    default:
      throw new PlattformFehler(422, "Unbekannte Aktion.");
  }
});
