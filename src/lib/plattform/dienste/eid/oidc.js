// src/lib/plattform/dienste/eid/oidc.js
//
// OpenID-Connect-Bausteine für die staatlichen eID-Verfahren (ID Austria, Online-Ausweis über einen eID-Service).
// NUR serverseitig, nur node:crypto – keine Fremdpakete. Reine Funktionen (ohne Netz, ohne Datenbank) → testbar.
//
//   PKCE (S256) · Zufallswerte für state/nonce · JWS-Prüfung (RS/PS/ES 256|384|512; „none“ und HS* nur, wenn
//   ausdrücklich erlaubt) · ID-Token-Prüfung (Aussteller, Audience/azp, exp/iat/nbf mit Toleranz, Höchstalter,
//   nonce zeitkonstant, Vertrauensniveau ≥ Minimum) · Vertrauensniveau-Abbildung (eIDAS/STORK) · bPK-Hash (HMAC,
//   nie Klartext speichern) · Minimaldaten (Name, Geburtsdatum, Niveau, Transaktions-ID).
//
// Python-Gegenstück: Backend-Import/oekoinvest_app/oekoinvest_app/plattform/eid_kern.py (gleiche Regeln, gleiche Codes).

import { X509Certificate, createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";

export const b64url = (x) => Buffer.from(x).toString("base64url");
export const b64urlLesen = (s) => Buffer.from(String(s || ""), "base64url");
export const sha256Hex = (s) => createHash("sha256").update(String(s)).digest("hex");

/** Zufallswert (Standard 256 Bit) als base64url – für state, nonce, Bindung an die Browser-Sitzung */
export const zufall = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** PKCE nach RFC 7636 (nur S256) */
export const pkceChallenge = (verifier) => createHash("sha256").update(String(verifier)).digest("base64url");
export function pkcePaar() {
  const verifier = zufall(48); // 64 Zeichen, im erlaubten Bereich 43–128
  return { verifier, challenge: pkceChallenge(verifier), methode: "S256" };
}

/** Zeitkonstanter Vergleich zweier Zeichenketten (unterschiedliche Längen → false) */
export function gleich(a, b) {
  const x = Buffer.from(String(a ?? ""), "utf8");
  const y = Buffer.from(String(b ?? ""), "utf8");
  if (!x.length || x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

// ---------------------------------------------------------------- Algorithmen und Schlüssel

const ALG = {
  RS256: { art: "rsa", hash: "sha256" }, RS384: { art: "rsa", hash: "sha384" }, RS512: { art: "rsa", hash: "sha512" },
  PS256: { art: "pss", hash: "sha256" }, PS384: { art: "pss", hash: "sha384" }, PS512: { art: "pss", hash: "sha512" },
  ES256: { art: "ec", hash: "sha256", kurve: "prime256v1", laenge: 64 }, ES384: { art: "ec", hash: "sha384", kurve: "secp384r1", laenge: 96 },
  ES512: { art: "ec", hash: "sha512", kurve: "secp521r1", laenge: 132 },
  HS256: { art: "hmac", hash: "sha256" }, HS384: { art: "hmac", hash: "sha384" }, HS512: { art: "hmac", hash: "sha512" },
};
/** Standard: nur asymmetrische Verfahren. HS* nur mit ausdrücklicher Konfiguration (Schlüssel = client_secret). */
export const EID_ALGS_STANDARD = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"];
export const RSA_MIN_BITS = 2048;

/**
 * Öffentliche Schlüssel aus JWKS (JSON-Objekt/Text), einzelnem JWK, PEM-Schlüssel oder PEM-Zertifikat laden.
 * Liefert [{ kid, alg, key: KeyObject }]. Schlüssel mit use=enc werden ignoriert. Fehlerhafte Einträge werden übersprungen.
 */
export function schluesselLaden(quelle) {
  if (!quelle) return [];
  if (typeof quelle === "string") {
    const t = quelle.trim();
    if (t.startsWith("-----BEGIN")) {
      const bloecke = t.match(/-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----/g) || [];
      return bloecke.flatMap((pem) => {
        try {
          const key = /CERTIFICATE/.test(pem) ? new X509Certificate(pem).publicKey : createPublicKey(pem);
          return [{ kid: null, alg: null, key }];
        } catch {
          return [];
        }
      });
    }
    try {
      return schluesselLaden(JSON.parse(t));
    } catch {
      return [];
    }
  }
  const liste = Array.isArray(quelle?.keys) ? quelle.keys : Array.isArray(quelle) ? quelle : [quelle];
  const aus = [];
  for (const jwk of liste) {
    if (!jwk || typeof jwk !== "object" || jwk.use === "enc") continue;
    try {
      let key;
      if (Array.isArray(jwk.x5c) && jwk.x5c[0] && !jwk.n && !jwk.x) key = new X509Certificate(Buffer.from(jwk.x5c[0], "base64")).publicKey;
      else if (["RSA", "EC"].includes(jwk.kty)) {
        const { kty, n, e, crv, x, y } = jwk;
        key = createPublicKey({ key: kty === "RSA" ? { kty, n, e } : { kty, crv, x, y }, format: "jwk" });
      } else continue;
      aus.push({ kid: jwk.kid ? String(jwk.kid) : null, alg: jwk.alg ? String(jwk.alg) : null, key });
    } catch {
      /* ungültiger Schlüssel → überspringen */
    }
  }
  return aus;
}

function passtZuAlg(key, def) {
  const typ = key.asymmetricKeyType;
  const d = key.asymmetricKeyDetails || {};
  if (def.art === "rsa" || def.art === "pss") return (typ === "rsa" || typ === "rsa-pss") && (d.modulusLength || 0) >= RSA_MIN_BITS;
  if (def.art === "ec") return typ === "ec" && d.namedCurve === def.kurve;
  return false;
}

/**
 * JWS (Compact Serialization) prüfen.
 * optionen: { schluessel: [{kid,alg,key}], algs = EID_ALGS_STANDARD, hmacGeheimnis? }
 * Liefert { ok, grund, header, claims }. grund ∈ format | verschluesselt | json | alg | crit | schluessel | signatur
 */
export function jwsPruefen(token, { schluessel = [], algs = EID_ALGS_STANDARD, hmacGeheimnis = "" } = {}) {
  const teile = String(token || "").split(".");
  if (teile.length === 5) return { ok: false, grund: "verschluesselt" }; // JWE – vorher entschlüsseln (nicht unterstützt)
  if (teile.length !== 3 || !teile[0] || !teile[1]) return { ok: false, grund: "format" };
  let header;
  let claims;
  try {
    header = JSON.parse(b64urlLesen(teile[0]).toString("utf8"));
    claims = JSON.parse(b64urlLesen(teile[1]).toString("utf8"));
  } catch {
    return { ok: false, grund: "json" };
  }
  if (!header || typeof header !== "object" || !claims || typeof claims !== "object" || Array.isArray(claims)) return { ok: false, grund: "json" };
  const alg = String(header.alg || "");
  const def = ALG[alg];
  if (!def || !algs.includes(alg)) return { ok: false, grund: "alg" };
  if (header.crit !== undefined) return { ok: false, grund: "crit" }; // keine kritischen Erweiterungen unterstützt
  const daten = Buffer.from(`${teile[0]}.${teile[1]}`, "ascii");
  const sig = b64urlLesen(teile[2]);
  if (!sig.length) return { ok: false, grund: "signatur" };

  if (def.art === "hmac") {
    if (!hmacGeheimnis) return { ok: false, grund: "schluessel" };
    const soll = createHmac(def.hash, hmacGeheimnis).update(daten).digest();
    return soll.length === sig.length && timingSafeEqual(soll, sig) ? { ok: true, grund: "", header, claims } : { ok: false, grund: "signatur" };
  }

  const kandidaten = schluessel.filter((s) => (!header.kid || !s.kid || s.kid === String(header.kid)) && (!s.alg || s.alg === alg) && passtZuAlg(s.key, def));
  if (!kandidaten.length) return { ok: false, grund: "schluessel" };
  if (def.art === "ec" && sig.length !== def.laenge) return { ok: false, grund: "signatur" };
  for (const s of kandidaten) {
    let ok = false;
    try {
      if (def.art === "rsa") ok = verify(def.hash, daten, s.key, sig);
      else if (def.art === "pss") ok = verify(def.hash, daten, { key: s.key, padding: 6 /* RSA_PKCS1_PSS_PADDING */, saltLength: -1 /* RSA_PSS_SALTLEN_DIGEST */ }, sig);
      else ok = verify(def.hash, daten, { key: s.key, dsaEncoding: "ieee-p1363" }, sig);
    } catch {
      ok = false;
    }
    if (ok) return { ok: true, grund: "", header, claims, kid: s.kid };
  }
  return { ok: false, grund: "signatur" };
}

// ---------------------------------------------------------------- Vertrauensniveau (Level of Assurance)

export const LOA = { niedrig: 1, substanziell: 2, hoch: 3 };
export const LOA_LABEL = { niedrig: "niedrig", substanziell: "substanziell", hoch: "hoch", "": "unbekannt" };

/**
 * Wert eines LoA-Claims → niedrig | substanziell | hoch | "".
 * eIDAS: http://eidas.europa.eu/LoA/{low|substantial|high}; STORK-QAA 1–4 (…/citizenQAALevel/4 bzw. „4“ → hoch,
 * 3 → substanziell); Klartext (hoch/high …). Unbekannte Werte → "" (gilt als unter jedem Minimum).
 */
export function loaStufe(wert) {
  const s = String(Array.isArray(wert) ? wert[0] ?? "" : wert ?? "").trim().toLowerCase();
  if (!s || s.includes("notnotified")) return ""; // nicht notifizierte Systeme zählen nicht
  if (/(^|[/:#_\s-])(high|hoch)$/.test(s) || s === "high" || s === "hoch") return "hoch";
  if (/(^|[/:#_\s-])(substantial|substanziell|substantiell)$/.test(s)) return "substanziell";
  if (/(^|[/:#_\s-])(low|niedrig)$/.test(s)) return "niedrig";
  const q = s.match(/(?:citizenqaalevel\/|qaa[-_ ]?level[-_ ]?|^)([1-4])$/);
  if (q) return q[1] === "4" ? "hoch" : q[1] === "3" ? "substanziell" : "niedrig";
  return "";
}
export const loaErfuellt = (ist, min) => (LOA[ist] || 0) >= (LOA[min] || LOA.hoch);

/** Ersten vorhandenen Claim aus einer Namensliste lesen */
export function claimLesen(claims, namen = []) {
  for (const n of namen) {
    const w = claims?.[n];
    if (w !== undefined && w !== null && w !== "") return w;
  }
  return undefined;
}

// ---------------------------------------------------------------- ID-Token

/**
 * ID-Token vollständig prüfen (Signatur + Claims) – OIDC Core 1.0, Abschnitt 3.1.3.7.
 * optionen: { issuer, clientId, nonce | nonceHash (sha256 hex), schluessel, algs, hmacGeheimnis, jetztS, toleranzS=120,
 *             maxAlterS=900, loaClaims=[…], loaMin="hoch", loaStandard="" (falls der Dienst kein Niveau liefert) }
 * Liefert { ok, grund, claims, loa }. grund zusätzlich: iss | aud | azp | exp | iat | nbf | alter | nonce | loa
 */
export function idTokenPruefen(token, o = {}) {
  const j = jwsPruefen(token, { schluessel: o.schluessel || [], algs: o.algs || EID_ALGS_STANDARD, hmacGeheimnis: o.hmacGeheimnis || "" });
  if (!j.ok) return { ok: false, grund: j.grund };
  const c = j.claims;
  const jetztS = Math.floor(o.jetztS ?? Date.now() / 1000);
  const tol = o.toleranzS ?? 120;
  if (!o.issuer || c.iss !== o.issuer) return { ok: false, grund: "iss", claims: c };
  const aud = Array.isArray(c.aud) ? c.aud.map(String) : c.aud !== undefined ? [String(c.aud)] : [];
  if (!o.clientId || !aud.includes(String(o.clientId))) return { ok: false, grund: "aud", claims: c };
  if ((aud.length > 1 || c.azp !== undefined) && String(c.azp || "") !== String(o.clientId)) return { ok: false, grund: "azp", claims: c };
  if (typeof c.exp !== "number" || c.exp + tol < jetztS) return { ok: false, grund: "exp", claims: c };
  if (typeof c.iat !== "number" || c.iat - tol > jetztS) return { ok: false, grund: "iat", claims: c };
  if (jetztS - c.iat > (o.maxAlterS ?? 900) + tol) return { ok: false, grund: "alter", claims: c };
  if (c.nbf !== undefined && (typeof c.nbf !== "number" || c.nbf - tol > jetztS)) return { ok: false, grund: "nbf", claims: c };
  const nonceOk = o.nonceHash ? typeof c.nonce === "string" && gleich(sha256Hex(c.nonce), o.nonceHash) : o.nonce ? gleich(c.nonce, o.nonce) : false;
  if (!nonceOk) return { ok: false, grund: "nonce", claims: c };
  const roh = claimLesen(c, o.loaClaims || ["acr"]);
  const loa = loaStufe(roh) || loaStufe(o.loaStandard);
  if (!loaErfuellt(loa, o.loaMin || "hoch")) return { ok: false, grund: "loa", claims: c, loa };
  return { ok: true, grund: "", claims: c, loa, kid: j.kid || null, alg: j.header.alg };
}

/** Lesbare Meldung zu einem Prüfcode (ohne Token-Inhalte – darf ins Protokoll) */
export const PRUEF_GRUND = {
  format: "Token-Format ungültig", verschluesselt: "Verschlüsseltes Token (JWE) wird nicht unterstützt", json: "Token nicht lesbar",
  alg: "Signaturverfahren nicht zugelassen", crit: "Nicht unterstützte kritische Kopfzeile", schluessel: "Kein passender Signaturschlüssel",
  signatur: "Signatur ungültig", iss: "Falscher Aussteller", aud: "Token nicht für diese Anwendung ausgestellt", azp: "Falsche berechtigte Partei (azp)",
  exp: "Token abgelaufen", iat: "Ausstellungszeitpunkt in der Zukunft", alter: "Anmeldung zu alt", nbf: "Token noch nicht gültig",
  nonce: "Nonce passt nicht (Wiederholung oder fremde Anmeldung)", loa: "Vertrauensniveau zu niedrig", replay: "Token wurde bereits verwendet",
  bindung: "Anmeldung gehört nicht zu dieser Browser-Sitzung", abgelaufen: "Anmeldevorgang abgelaufen", abbruch: "Vom Nutzer abgebrochen",
  token: "Token-Austausch fehlgeschlagen", pkce: "PKCE-Prüfung fehlgeschlagen", code: "Autorisierungscode ungültig",
};

// ---------------------------------------------------------------- Minimaldaten, bPK, Abgleich

/** bPK (bzw. Pseudonym) nie im Klartext speichern: HMAC-SHA256 mit geheimem Pfeffer, hex */
export function bpkHash(bpk, pfeffer) {
  const w = String(bpk || "").trim();
  if (!w || !pfeffer) return null;
  return createHmac("sha256", String(pfeffer)).update(w).digest("hex");
}

const kurz = (s, max = 120) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);

/** Geburtsdatum normalisieren → YYYY-MM-DD (akzeptiert auch YYYYMMDD, DD.MM.YYYY; teilweise Angaben „1980-00-00“ bleiben erhalten) */
export function datumNormal(w) {
  const s = String(w ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s.slice(0, 10);
}

/**
 * Minimaldaten aus geprüften Claims. claimNamen: { vorname:[], nachname:[], geburtsdatum:[], bpk:[], land:[], txn:[] }
 * Liefert { vorname, nachname, geburtsdatum, bpkHash, land, transaktionsId } – KEIN Klartext-bPK, keine weiteren Claims.
 */
export function minimaldaten(claims, claimNamen = {}, { pfeffer = "", tokenHash = "" } = {}) {
  const txn = claimLesen(claims, claimNamen.txn || ["txn", "jti", "sid"]);
  return {
    vorname: kurz(claimLesen(claims, claimNamen.vorname || ["given_name"])),
    nachname: kurz(claimLesen(claims, claimNamen.nachname || ["family_name"])),
    geburtsdatum: datumNormal(claimLesen(claims, claimNamen.geburtsdatum || ["birthdate"])),
    bpkHash: bpkHash(claimLesen(claims, claimNamen.bpk || []), pfeffer),
    land: kurz(claimLesen(claims, claimNamen.land || []), 8).toUpperCase(),
    transaktionsId: kurz(txn, 120) || (tokenHash ? `T-${tokenHash.slice(0, 24)}` : ""),
  };
}

/** Namen für den Abgleich vereinheitlichen (Umlaute, Akzente, Bindestriche) */
export function nameEinheitlich(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]+/g, " ")
    .trim();
}

/**
 * eID-Daten mit den Angaben im Konto/KYC-Fall abgleichen. soll: { vorname, nachname, geburtsdatum }
 * name: true/false/null (null = keine Vergleichsdaten), geburtsdatum: true/false/null
 */
export function eidAbgleich(ist, soll = {}) {
  const n = (x) => nameEinheitlich(x).split(" ").filter(Boolean);
  let name = null;
  if (soll.nachname && ist.nachname) {
    const nachOk = n(ist.nachname).join(" ") === n(soll.nachname).join(" ");
    const vIst = n(ist.vorname);
    const vSoll = n(soll.vorname);
    const vorOk = !vSoll.length || !vIst.length || vSoll.some((t) => vIst.includes(t));
    name = nachOk && vorOk;
  }
  const geburtsdatum = soll.geburtsdatum && ist.geburtsdatum ? datumNormal(soll.geburtsdatum) === datumNormal(ist.geburtsdatum) : null;
  return { name, geburtsdatum };
}
