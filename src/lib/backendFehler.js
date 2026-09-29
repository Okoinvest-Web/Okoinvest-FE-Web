// src/lib/backendFehler.js
//
// Turns a failed Frappe response into a short German message the visitor can understand.
// Only validation messages (written by the backend for users) are passed on –
// tracebacks, module paths and other internals stay in the server log.
//
// Result codes for the browser:
//   409 vergeben    – appointment slot was booked in the meantime
//   422 validierung – the backend rejected an input (message says which)
//   429 zu_viele    – rate limit
//   502 backend     – backend not reachable / internal error

export const NICHT_ERREICHBAR = "Der Server ist vorübergehend nicht erreichbar";

const ZU_VIELE = "Zu viele Anfragen in kurzer Zeit – bitte warten Sie einen Moment";

/** Human-readable message of a Frappe ValidationError, or "" */
function validierungsText(daten) {
  if (!/ValidationError|MandatoryError/.test(String(daten?.exc_type || ""))) return "";

  let text = "";
  try {
    const liste = JSON.parse(daten._server_messages || "[]");
    text = JSON.parse(liste[0] || "{}").message || "";
  } catch {
    // _server_messages missing or not JSON – fall back to the exception line
  }
  if (!text && typeof daten.exception === "string") {
    text = daten.exception.replace(/^[\w.]*Error:\s*/, "");
  }
  return text.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
}

/**
 * Reads the error body once (JSON or text), logs it on the server and returns
 * { status, body } for NextResponse.json(body, { status }).
 */
export async function backendFehler(response, kontext) {
  const text = await response.text().catch(() => "");
  let daten;
  try {
    daten = JSON.parse(text);
  } catch {
    daten = { message: text.slice(0, 500) };
  }
  console.error(`${kontext}: backend returned ${response.status}`, daten);

  const hinweis = validierungsText(daten);
  if (/nicht mehr verfügbar/i.test(hinweis)) {
    return { status: 409, body: { error: hinweis, code: "vergeben" } };
  }
  if (hinweis) {
    return { status: 422, body: { error: hinweis, code: "validierung" } };
  }
  if (response.status === 429) {
    return { status: 429, body: { error: ZU_VIELE, code: "zu_viele" } };
  }
  return { status: 502, body: { error: NICHT_ERREICHBAR, code: "backend" } };
}
