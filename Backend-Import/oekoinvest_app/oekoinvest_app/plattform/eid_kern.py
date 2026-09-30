# Copyright (c) 2026, ÖkoInvest GmbH
#
# Staatliche eID (ID Austria, Online-Ausweis über einen eID-Service) – reine Regeln ohne Datenbank und ohne Netz.
# Gegenstück zu src/lib/plattform/dienste/eid/oidc.js + methoden.js (gleiche Prüfcodes, gleiche Logik).
#
#   PKCE (S256) · JWS-Prüfung · ID-Token-Prüfung (iss, aud/azp, exp/iat/nbf mit Toleranz, Höchstalter, nonce zeitkonstant,
#   Vertrauensniveau ≥ Minimum) · Vertrauensniveau-Abbildung (eIDAS/STORK) · bPK-Hash (HMAC) · Minimaldaten · Abgleich ·
#   Konfiguration aus site_config · Autorisierungs-URL.
#
# Kryptografie: RS256/384/512 in reiner Standardbibliothek (RSASSA-PKCS1-v1_5, Schlüssel ≥ 2048 Bit, JWK). PS*/ES* und
# PEM-/Zertifikats-Schlüssel über das Paket „cryptography“, das Frappe v15 selbst mitbringt (keine neue Abhängigkeit);
# fehlt es (Tests ohne Bench), liefern diese Verfahren den Code „alg“. HS* nur mit ausdrücklicher Freigabe (Demo).
#
# Tests: cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eid_kern -v

import base64
import hashlib
import hmac
import json
import re
import secrets
import time
import unicodedata
from urllib.parse import urlencode

# ====================================================================== Grundbausteine


def b64url(b):
	if isinstance(b, str):
		b = b.encode()
	return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def b64url_lesen(s):
	s = str(s or "")
	return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sha256_hex(s):
	return hashlib.sha256(s if isinstance(s, bytes) else str(s).encode()).hexdigest()


def zufall(n=32):
	return b64url(secrets.token_bytes(n))


def pkce_challenge(verifier):
	return b64url(hashlib.sha256(str(verifier).encode()).digest())


def pkce_paar():
	v = zufall(48)
	return {"verifier": v, "challenge": pkce_challenge(v), "methode": "S256"}


def gleich(a, b):
	a, b = str(a if a is not None else ""), str(b if b is not None else "")
	return bool(a) and len(a) == len(b) and hmac.compare_digest(a.encode(), b.encode())


# ====================================================================== Schlüssel und Signaturen

ALGS_STANDARD = ["RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512"]
RSA_MIN_BITS = 2048
_HASH = {"256": hashlib.sha256, "384": hashlib.sha384, "512": hashlib.sha512}
# DigestInfo-Präfixe (RFC 8017, Abschnitt 9.2, Hinweis 1)
_DIGEST_INFO = {
	"256": bytes.fromhex("3031300d060960864801650304020105000420"),
	"384": bytes.fromhex("3041300d060960864801650304020205000430"),
	"512": bytes.fromhex("3051300d060960864801650304020305000440"),
}
_KURVE = {"ES256": ("P-256", 64), "ES384": ("P-384", 96), "ES512": ("P-521", 132)}


def _int(s):
	return int.from_bytes(b64url_lesen(s), "big")


def _crypto():
	try:
		from cryptography.hazmat.primitives import hashes, serialization  # noqa: F401
		from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils  # noqa: F401

		return True
	except ImportError:
		return False


def schluessel_laden(quelle):
	"""JWKS (dict/JSON-Text), einzelner JWK oder PEM (Schlüssel/Zertifikat, nur mit „cryptography“) → Liste von JWK-Dicts.
	Einträge mit use=enc und unbekannte Typen werden übersprungen."""
	if not quelle:
		return []
	if isinstance(quelle, str):
		t = quelle.strip()
		if t.startswith("-----BEGIN"):
			return _pem_laden(t)
		try:
			quelle = json.loads(t)
		except ValueError:
			return []
	liste = quelle.get("keys") if isinstance(quelle, dict) and isinstance(quelle.get("keys"), list) else quelle if isinstance(quelle, list) else [quelle]
	aus = []
	for j in liste:
		if not isinstance(j, dict) or j.get("use") == "enc":
			continue
		if j.get("kty") == "RSA" and j.get("n") and j.get("e"):
			aus.append({"kty": "RSA", "n": j["n"], "e": j["e"], "kid": j.get("kid"), "alg": j.get("alg")})
		elif j.get("kty") == "EC" and j.get("x") and j.get("y") and j.get("crv"):
			aus.append({"kty": "EC", "crv": j["crv"], "x": j["x"], "y": j["y"], "kid": j.get("kid"), "alg": j.get("alg")})
	return aus


def _pem_laden(text):
	if not _crypto():
		return []
	from cryptography import x509
	from cryptography.hazmat.primitives import serialization
	from cryptography.hazmat.primitives.asymmetric import ec, rsa

	aus = []
	for pem in re.findall(r"-----BEGIN [A-Z ]+-----[\s\S]+?-----END [A-Z ]+-----", text):
		try:
			key = x509.load_pem_x509_certificate(pem.encode()).public_key() if "CERTIFICATE" in pem else serialization.load_pem_public_key(pem.encode())
		except ValueError:
			continue
		if isinstance(key, rsa.RSAPublicKey):
			z = key.public_numbers()
			aus.append({"kty": "RSA", "n": b64url(z.n.to_bytes((z.n.bit_length() + 7) // 8, "big")), "e": b64url(z.e.to_bytes((z.e.bit_length() + 7) // 8, "big")), "kid": None, "alg": None})
		elif isinstance(key, ec.EllipticCurvePublicKey):
			z = key.public_numbers()
			crv = {"secp256r1": "P-256", "secp384r1": "P-384", "secp521r1": "P-521"}.get(key.curve.name)
			laenge = {"P-256": 32, "P-384": 48, "P-521": 66}.get(crv)
			if crv:
				aus.append({"kty": "EC", "crv": crv, "x": b64url(z.x.to_bytes(laenge, "big")), "y": b64url(z.y.to_bytes(laenge, "big")), "kid": None, "alg": None})
	return aus


def rsa_pkcs1_pruefen(jwk, daten, sig, bits="256"):
	"""RSASSA-PKCS1-v1_5-Verifikation (RFC 8017, 8.2.2) in reiner Standardbibliothek. Schlüssel < 2048 Bit → False."""
	n, e = _int(jwk["n"]), _int(jwk["e"])
	if n.bit_length() < RSA_MIN_BITS or e < 3:
		return False
	k = (n.bit_length() + 7) // 8
	if len(sig) != k:
		return False
	s = int.from_bytes(sig, "big")
	if s >= n:
		return False
	em = pow(s, e, n).to_bytes(k, "big")
	t = _DIGEST_INFO[bits] + _HASH[bits](daten).digest()
	if k < len(t) + 11:
		return False
	soll = b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t
	return hmac.compare_digest(em, soll)


def _crypto_pruefen(alg, jwk, daten, sig):
	from cryptography.exceptions import InvalidSignature
	from cryptography.hazmat.primitives import hashes
	from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils

	h = {"256": hashes.SHA256(), "384": hashes.SHA384(), "512": hashes.SHA512()}[alg[2:]]
	try:
		if alg.startswith("PS"):
			key = rsa.RSAPublicNumbers(_int(jwk["e"]), _int(jwk["n"])).public_key()
			if key.key_size < RSA_MIN_BITS:
				return False
			key.verify(sig, daten, padding.PSS(mgf=padding.MGF1(h), salt_length=h.digest_size), h)
			return True
		kurve = {"P-256": ec.SECP256R1(), "P-384": ec.SECP384R1(), "P-521": ec.SECP521R1()}[jwk["crv"]]
		key = ec.EllipticCurvePublicNumbers(_int(jwk["x"]), _int(jwk["y"]), kurve).public_key()
		haelfte = len(sig) // 2
		key.verify(utils.encode_dss_signature(int.from_bytes(sig[:haelfte], "big"), int.from_bytes(sig[haelfte:], "big")), daten, ec.ECDSA(h))
		return True
	except (InvalidSignature, ValueError, KeyError):
		return False


def _passt(jwk, alg):
	if alg[:2] in ("RS", "PS"):
		return jwk.get("kty") == "RSA" and _int(jwk["n"]).bit_length() >= RSA_MIN_BITS
	if alg[:2] == "ES":
		return jwk.get("kty") == "EC" and jwk.get("crv") == _KURVE[alg][0]
	return False


def jws_pruefen(token, schluessel=None, algs=None, hmac_geheimnis=""):
	"""JWS (Compact) prüfen → {ok, grund, header, claims}. grund: format|verschluesselt|json|alg|crit|schluessel|signatur"""
	algs = algs or ALGS_STANDARD
	teile = str(token or "").split(".")
	if len(teile) == 5:
		return {"ok": False, "grund": "verschluesselt"}
	if len(teile) != 3 or not teile[0] or not teile[1]:
		return {"ok": False, "grund": "format"}
	try:
		header = json.loads(b64url_lesen(teile[0]))
		claims = json.loads(b64url_lesen(teile[1]))
		sig = b64url_lesen(teile[2])
	except (ValueError, TypeError):
		return {"ok": False, "grund": "json"}
	if not isinstance(header, dict) or not isinstance(claims, dict):
		return {"ok": False, "grund": "json"}
	alg = str(header.get("alg") or "")
	if alg not in algs or not re.fullmatch(r"(RS|PS|ES|HS)(256|384|512)", alg):
		return {"ok": False, "grund": "alg"}
	if "crit" in header:
		return {"ok": False, "grund": "crit"}
	if not sig:
		return {"ok": False, "grund": "signatur"}
	daten = f"{teile[0]}.{teile[1]}".encode("ascii")
	if alg.startswith("HS"):
		if not hmac_geheimnis:
			return {"ok": False, "grund": "schluessel"}
		soll = hmac.new(str(hmac_geheimnis).encode(), daten, _HASH[alg[2:]]).digest()
		return {"ok": True, "grund": "", "header": header, "claims": claims} if hmac.compare_digest(soll, sig) else {"ok": False, "grund": "signatur"}
	if alg[:2] in ("PS", "ES") and not _crypto():
		return {"ok": False, "grund": "alg"}
	kid = header.get("kid")
	kandidaten = [j for j in (schluessel or []) if (not kid or not j.get("kid") or j.get("kid") == str(kid)) and (not j.get("alg") or j.get("alg") == alg) and _passt(j, alg)]
	if not kandidaten:
		return {"ok": False, "grund": "schluessel"}
	if alg.startswith("ES") and len(sig) != _KURVE[alg][1]:
		return {"ok": False, "grund": "signatur"}
	for j in kandidaten:
		ok = rsa_pkcs1_pruefen(j, daten, sig, alg[2:]) if alg.startswith("RS") else _crypto_pruefen(alg, j, daten, sig)
		if ok:
			return {"ok": True, "grund": "", "header": header, "claims": claims, "kid": j.get("kid")}
	return {"ok": False, "grund": "signatur"}


def hs_signieren(claims, geheimnis, alg="HS256", kid=None):
	"""Nur Demo-Simulator: ID-Token mit HMAC signieren (Schlüssel je Vorgang zufällig)."""
	kopf = {"alg": alg, "typ": "JWT", **({"kid": kid} if kid else {})}
	e = f"{b64url(json.dumps(kopf, separators=(',', ':')))}.{b64url(json.dumps(claims, separators=(',', ':'), ensure_ascii=False))}"
	return f"{e}.{b64url(hmac.new(str(geheimnis).encode(), e.encode(), _HASH[alg[2:]]).digest())}"


# ====================================================================== Vertrauensniveau

LOA = {"niedrig": 1, "substanziell": 2, "hoch": 3}
LOA_LABEL = {"niedrig": "niedrig", "substanziell": "substanziell", "hoch": "hoch", "": "unbekannt"}


def loa_stufe(wert):
	if isinstance(wert, list):
		wert = wert[0] if wert else ""
	s = str(wert if wert is not None else "").strip().lower()
	if not s or "notnotified" in s:
		return ""
	if re.search(r"(^|[/:#_\s-])(high|hoch)$", s):
		return "hoch"
	if re.search(r"(^|[/:#_\s-])(substantial|substanziell|substantiell)$", s):
		return "substanziell"
	if re.search(r"(^|[/:#_\s-])(low|niedrig)$", s):
		return "niedrig"
	q = re.search(r"(?:citizenqaalevel/|qaa[-_ ]?level[-_ ]?|^)([1-4])$", s)
	if q:
		return "hoch" if q.group(1) == "4" else "substanziell" if q.group(1) == "3" else "niedrig"
	return ""


def loa_erfuellt(ist, minimum):
	return LOA.get(ist or "", 0) >= LOA.get(minimum or "hoch", 3)


def claim_lesen(claims, namen):
	for n in namen or []:
		w = (claims or {}).get(n)
		if w not in (None, ""):
			return w
	return None


# ====================================================================== ID-Token


def id_token_pruefen(token, issuer=None, client_id=None, nonce=None, nonce_hash=None, schluessel=None, algs=None, hmac_geheimnis="", jetzt_s=None,
		toleranz_s=120, max_alter_s=900, loa_claims=None, loa_min="hoch", loa_standard=""):
	"""OIDC Core 1.0, 3.1.3.7 → {ok, grund, claims, loa}. Zusätzliche Codes: iss|aud|azp|exp|iat|alter|nbf|nonce|loa"""
	j = jws_pruefen(token, schluessel, algs, hmac_geheimnis)
	if not j["ok"]:
		return {"ok": False, "grund": j["grund"]}
	c = j["claims"]
	jetzt = int(jetzt_s if jetzt_s is not None else time.time())
	if not issuer or c.get("iss") != issuer:
		return {"ok": False, "grund": "iss", "claims": c}
	aud = c.get("aud")
	aud = [str(x) for x in aud] if isinstance(aud, list) else ([str(aud)] if aud is not None else [])
	if not client_id or str(client_id) not in aud:
		return {"ok": False, "grund": "aud", "claims": c}
	if (len(aud) > 1 or "azp" in c) and str(c.get("azp") or "") != str(client_id):
		return {"ok": False, "grund": "azp", "claims": c}
	zahl = lambda x: isinstance(x, (int, float)) and not isinstance(x, bool)  # noqa: E731
	if not zahl(c.get("exp")) or c["exp"] + toleranz_s < jetzt:
		return {"ok": False, "grund": "exp", "claims": c}
	if not zahl(c.get("iat")) or c["iat"] - toleranz_s > jetzt:
		return {"ok": False, "grund": "iat", "claims": c}
	if jetzt - c["iat"] > max_alter_s + toleranz_s:
		return {"ok": False, "grund": "alter", "claims": c}
	if "nbf" in c and (not zahl(c["nbf"]) or c["nbf"] - toleranz_s > jetzt):
		return {"ok": False, "grund": "nbf", "claims": c}
	n = c.get("nonce")
	nonce_ok = (isinstance(n, str) and gleich(sha256_hex(n), nonce_hash)) if nonce_hash else (gleich(n, nonce) if nonce else False)
	if not nonce_ok:
		return {"ok": False, "grund": "nonce", "claims": c}
	loa = loa_stufe(claim_lesen(c, loa_claims or ["acr"])) or loa_stufe(loa_standard)
	if not loa_erfuellt(loa, loa_min):
		return {"ok": False, "grund": "loa", "claims": c, "loa": loa}
	return {"ok": True, "grund": "", "claims": c, "loa": loa, "alg": j["header"].get("alg")}


PRUEF_GRUND = {
	"format": "Token-Format ungültig", "verschluesselt": "Verschlüsseltes Token (JWE) wird nicht unterstützt", "json": "Token nicht lesbar",
	"alg": "Signaturverfahren nicht zugelassen", "crit": "Nicht unterstützte kritische Kopfzeile", "schluessel": "Kein passender Signaturschlüssel",
	"signatur": "Signatur ungültig", "iss": "Falscher Aussteller", "aud": "Token nicht für diese Anwendung ausgestellt", "azp": "Falsche berechtigte Partei (azp)",
	"exp": "Token abgelaufen", "iat": "Ausstellungszeitpunkt in der Zukunft", "alter": "Anmeldung zu alt", "nbf": "Token noch nicht gültig",
	"nonce": "Nonce passt nicht (Wiederholung oder fremde Anmeldung)", "loa": "Vertrauensniveau zu niedrig", "replay": "Token wurde bereits verwendet",
	"bindung": "Anmeldung gehört nicht zu dieser Browser-Sitzung", "abgelaufen": "Anmeldevorgang abgelaufen", "abbruch": "Vom Nutzer abgebrochen",
	"token": "Token-Austausch fehlgeschlagen", "pkce": "PKCE-Prüfung fehlgeschlagen", "code": "Autorisierungscode ungültig",
}


# ====================================================================== Minimaldaten, bPK, Abgleich


def bpk_hash(bpk, pfeffer):
	w = str(bpk or "").strip()
	if not w or not pfeffer:
		return None
	return hmac.new(str(pfeffer).encode(), w.encode(), hashlib.sha256).hexdigest()


def _kurz(s, n=120):
	return re.sub(r"[\x00-\x1f]", " ", str(s if s is not None else "")).strip()[:n]


def datum_normal(w):
	s = str(w if w is not None else "").strip()
	m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", s)
	if m:
		return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
	m = re.match(r"^(\d{4})(\d{2})(\d{2})$", s)
	if m:
		return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
	m = re.match(r"^(\d{1,2})\.(\d{1,2})\.(\d{4})$", s)
	if m:
		return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
	return s[:10]


def minimaldaten(claims, claim_namen, pfeffer="", token_hash=""):
	cn = claim_namen or {}
	txn = _kurz(claim_lesen(claims, cn.get("txn") or ["txn", "jti", "sid"]))
	return {
		"vorname": _kurz(claim_lesen(claims, cn.get("vorname") or ["given_name"])),
		"nachname": _kurz(claim_lesen(claims, cn.get("nachname") or ["family_name"])),
		"geburtsdatum": datum_normal(claim_lesen(claims, cn.get("geburtsdatum") or ["birthdate"])),
		"bpkHash": bpk_hash(claim_lesen(claims, cn.get("bpk") or []), pfeffer),
		"land": _kurz(claim_lesen(claims, cn.get("land") or []), 8).upper(),
		"transaktionsId": txn or (f"T-{token_hash[:24]}" if token_hash else ""),
	}


def name_einheitlich(s):
	s = str(s or "").lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
	s = "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))
	return re.sub(r"[^a-z]+", " ", s).strip()


def eid_abgleich(ist, soll=None):
	soll = soll or {}
	t = lambda x: [w for w in name_einheitlich(x).split(" ") if w]  # noqa: E731
	name = None
	if soll.get("nachname") and ist.get("nachname"):
		nach_ok = " ".join(t(ist["nachname"])) == " ".join(t(soll["nachname"]))
		v_ist, v_soll = t(ist.get("vorname")), t(soll.get("vorname"))
		vor_ok = not v_soll or not v_ist or any(w in v_ist for w in v_soll)
		name = nach_ok and vor_ok
	geb = datum_normal(soll["geburtsdatum"]) == datum_normal(ist["geburtsdatum"]) if soll.get("geburtsdatum") and ist.get("geburtsdatum") else None
	return {"name": name, "geburtsdatum": geb}


# ====================================================================== Methoden und Konfiguration

REDIRECT_PFAD = "/api/dienste/eid/rueckkehr"
VORGANG_MINUTEN = 10
DEMO_PFEFFER = "oekoinvest-demo-eid-pfeffer-nur-entwicklung"

ID_AUSTRIA_UMGEBUNGEN = {
	"produktion": {"issuer": "https://idp.id-austria.gv.at", "auth_url": "https://idp.id-austria.gv.at/auth/idp/profile/oidc/authorize",
		"token_url": "https://idp.id-austria.gv.at/auth/idp/profile/oidc/token", "jwks_url": "https://idp.id-austria.gv.at/auth/idp/profile/oidc/keyset"},
	"referenz": {"issuer": "https://idp.ref.id-austria.gv.at", "auth_url": "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/authorize",
		"token_url": "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/token", "jwks_url": "https://idp.ref.id-austria.gv.at/auth/idp/profile/oidc/keyset"},
}

METHODEN = {
	"id_austria": {"label": "ID Austria", "land": "AT", "kuerzel": "at", "scope": "openid profile",
		"kurz": "Mit ID Austria am Smartphone bestätigen – in wenigen Minuten, ohne Ausweiskopie.",
		"claims": {"vorname": ["given_name", "urn:pvpgvat:oidc.given_name"], "nachname": ["family_name", "urn:pvpgvat:oidc.family_name"],
			"geburtsdatum": ["birthdate", "urn:pvpgvat:oidc.birthdate"], "bpk": ["urn:pvpgvat:oidc.bpk", "bpk"], "land": ["urn:pvpgvat:oidc.eid_issuing_nation"], "txn": ["txn", "jti", "sid"]},
		"loa_claims": ["urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level", "acr"]},
	"online_ausweis": {"label": "Online-Ausweis", "land": "DE", "kuerzel": "de", "scope": "openid profile",
		"kurz": "Mit Personalausweis, eAT oder EU-eID-Karte und der AusweisApp – Karte ans Smartphone halten, PIN eingeben.",
		"claims": {"vorname": ["given_name", "GivenNames", "givenNames"], "nachname": ["family_name", "FamilyNames", "familyNames"],
			"geburtsdatum": ["birthdate", "DateOfBirth", "dateOfBirth"], "bpk": ["restricted_id", "RestrictedID", "pseudonym", "sub"],
			"land": ["IssuingState", "issuing_state", "nationality"], "txn": ["txn", "jti", "sid"]},
		"loa_claims": ["acr", "loa", "level_of_assurance"]},
}


def _liste(s):
	return [x.strip() for x in str(s or "").split(",") if x.strip()]


def konfig(methode, conf, demo_erlaubt=False, produktion=True):
	"""Konfiguration einer Methode. conf: Funktion (schlüssel) → Wert (site_config). Schlüssel: oekoinvest_eid_<at|de>_*,
	oekoinvest_eid_bpk_pepper. Ohne vollständige Konfiguration und mit demo_erlaubt → Simulator (demo=True)."""
	m = METHODEN.get(methode)
	if not m:
		return None
	p = lambda k: str(conf(f"oekoinvest_eid_{m['kuerzel']}_{k}") or "").strip()  # noqa: E731
	basis = {"issuer": "", "auth_url": "", "token_url": "", "jwks_url": ""}
	if methode == "id_austria":
		umg = p("umgebung")
		basis = ID_AUSTRIA_UMGEBUNGEN["produktion" if umg == "produktion" or (produktion and umg != "referenz") else "referenz"]
	claims = dict(m["claims"])
	for feld, k in (("vorname", "claim_vorname"), ("nachname", "claim_nachname"), ("geburtsdatum", "claim_geburtsdatum"), ("bpk", "claim_pseudonym")):
		if p(k):
			claims[feld] = _liste(p(k))
	pfeffer = str(conf("oekoinvest_eid_bpk_pepper") or "")
	k = {
		"methode": methode, "label": m["label"], "land": m["land"], "scope": p("scope") or m["scope"], "claims": claims,
		"loa_claims": _liste(p("claim_loa")) or m["loa_claims"],
		"loa_min": p("loa_min") if p("loa_min") in ("hoch", "substanziell") else "hoch",
		"loa_standard": p("loa_standard") if methode == "online_ausweis" and p("loa_standard") in ("hoch", "substanziell") else "",
		"algs": [a for a in _liste(p("algs")) if a in ALGS_STANDARD] or list(ALGS_STANDARD),
		"issuer": p("issuer") or basis["issuer"], "auth_url": p("auth_url") or basis["auth_url"], "token_url": p("token_url") or basis["token_url"],
		"jwks_url": p("jwks_url") or basis["jwks_url"], "jwks_fest": p("jwks"), "client_id": p("client_id"), "client_secret": p("client_secret"),
		"redirect_uri": p("redirect_uri"), "pfeffer": pfeffer if len(pfeffer) >= 16 else "", "demo": False,
	}
	echt = bool(k["client_id"] and k["client_secret"] and k["issuer"] and k["pfeffer"] and (k["auth_url"] or methode == "online_ausweis"))
	if not echt:
		if not demo_erlaubt:
			return {**k, "aktiv": False, "grund": "nicht_konfiguriert"}
		return {**k, "demo": True, "aktiv": True, "issuer": f"https://demo-eid.oekoinvest.invalid/{methode}", "client_id": "oekoinvest-demo", "client_secret": "",
			"auth_url": "/portal/eid/demo", "token_url": "", "jwks_url": "", "jwks_fest": "", "algs": ["HS256"], "pfeffer": k["pfeffer"] or DEMO_PFEFFER}
	return {**k, "aktiv": True}


def verfuegbar(conf, demo_erlaubt=False, produktion=True):
	aus = []
	for mid, m in METHODEN.items():
		k = konfig(mid, conf, demo_erlaubt, produktion)
		if k and k.get("aktiv"):
			aus.append({"id": mid, "label": m["label"], "land": m["land"], "kurz": m["kurz"], "icon": "BadgeCheck" if mid == "id_austria" else "IdCard", "demo": k["demo"], "aktiv": True, "loaMin": k["loa_min"]})
	return aus


def redirect_uri(k, basis_url=""):
	return k.get("redirect_uri") or f"{str(basis_url or '').rstrip('/')}{REDIRECT_PFAD}"


def autorisierungs_url(k, state, nonce, challenge, redirect):
	q = {"response_type": "code", "client_id": k["client_id"], "redirect_uri": redirect, "scope": k["scope"], "state": state, "nonce": nonce,
		"code_challenge": challenge, "code_challenge_method": "S256"}
	if k.get("demo"):
		q["methode"] = k["methode"]
	return f"{k['auth_url']}?{urlencode(q)}"


def eid_client_url(tc_token_url, mobil=False):
	"""eID-Client-URL nach BSI TR-03124-1 (AusweisApp) – nur bei direkter eID-Server-Anbindung (tcToken)."""
	from urllib.parse import quote

	return f"{'eid' if mobil else 'http'}://127.0.0.1:24727/eID-Client?tcTokenURL={quote(tc_token_url, safe='')}"
