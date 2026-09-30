# Copyright (c) 2026, ÖkoInvest GmbH
#
# Staatliche eID (ID Austria, Online-Ausweis) – reine Regeln ohne Datenbank/Netz. Läuft mit Frappe-Stub auch ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_eid_kern -v
# Gleiche Fälle wie scripts/plattform-test-eid.mjs. Testschlüssel werden im Test erzeugt (reines Python, RSA 2048);
# zusätzlich ein mit Node (node:crypto) signiertes Token als Kreuzprüfung JS ↔ Python.

import json
import secrets
import sys
import types
import unittest

try:  # Bench vorhanden → echtes Frappe; sonst minimaler Stub (eid_kern importiert Frappe nicht)
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import eid_kern as ek

# Mit node:crypto erzeugt (öffentlicher Testschlüssel + signiertes Token, keine Geheimnisse)
NODE_VEKTOR = json.loads(r"""{"jwk":{"kty":"RSA","n":"zRyEj0A55B174sofPUbbLKiRgSfauWtc3RrZuL4-BlRnZZvQreZv95qlu9ZMJfFTeV7i7gC4hl2SBj7TjHl5rjLDq7U34O3T6CfC91GgNEJxZZo3XUhKMM2sQ2s5EKFnI42zdqYJJ2Z-HFYhWTVWt6buP_NJTVut4rqqR_5tp3qkPODX5alqbjgU0uMlhWLdWuqx3MX96QM0NsfkMe19bfbmIzxTZUR1w2UD9hMUM8Lr2yvAoGl7Oo7qnD6s3xA4RPnT1u_RGQPQepPN336qvu6-2zp3RwH4cSHMJBBIOi_nCwi9aVsDRzwVp4ceCNEpdHwrcbufnD3G_epPC0seow","e":"AQAB","kid":"node-1"},"token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Im5vZGUtMSJ9.eyJpc3MiOiJodHRwczovL2lkcC5yZWYuaWQtYXVzdHJpYS5ndi5hdCIsImF1ZCI6Imh0dHBzOi8vb2Vrb2ludmVzdC5leGFtcGxlL2VpZCIsImlhdCI6MTkwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMzAwLCJub25jZSI6Im4tbm9kZSIsImdpdmVuX25hbWUiOiJBbm5hIiwiZmFtaWx5X25hbWUiOiJNw7xsbGVyIiwiYmlydGhkYXRlIjoiMTk4MC0wMi0wMyIsInVybjpwdnBndmF0Om9pZGMuYnBrIjoiWEZOKzU0MTUwNWc6YWJjPSIsInVybjpwdnBndmF0Om9pZGMuZWlkX2NpdGl6ZW5fcWFhX2VpZGFzX2xldmVsIjoiaHR0cDovL2VpZGFzLmV1cm9wYS5ldS9Mb0EvaGlnaCJ9.Ln2ZXLhp7NpWisDSr4Es7cdfNuy5FkUL9NsPIAmvdq_2GSj_srMphzd4zbWl-mT9gGwK15dwwZisBpx4DCSCeMRIlYHjVXB5aliolQ4xVSzgt7P-jsDN3CbjLQ-sC16UV_2ZlqDyfJlVDttwiB9Dt7AGv5DPyt4ENe8o-EpfNMV9ttZJjXgwNBw94ZAAMUp68gapvuTql8ePzOjG7aaIWvZaXumxqY-48t7hxx03iSuFDAZdymCH9di68hRpS6oIVKqQhWzL7u1soDzyj7jP8bvbffBs05Us2c1n9ADZBEuOt-LH3hK9nPlk_oBZ5Vo9tDFQO9qunwbRCgOJHbsEEw"}""")

# ---------------------------------------------------------------- Test-RSA in reinem Python


def _ist_prim(n, runden=24):
	if n < 2:
		return False
	for p in (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37):
		if n % p == 0:
			return n == p
	d, r = n - 1, 0
	while d % 2 == 0:
		d //= 2
		r += 1
	for _ in range(runden):
		a = secrets.randbelow(n - 3) + 2
		x = pow(a, d, n)
		if x in (1, n - 1):
			continue
		for _ in range(r - 1):
			x = pow(x, 2, n)
			if x == n - 1:
				break
		else:
			return False
	return True


def _primzahl(bits):
	while True:
		k = secrets.randbits(bits) | (1 << (bits - 1)) | (1 << (bits - 2)) | 1
		if _ist_prim(k):
			return k


def rsa_schluessel(bits=2048):
	e = 65537
	while True:
		p, q = _primzahl(bits // 2), _primzahl(bits // 2)
		n = p * q
		phi = (p - 1) * (q - 1)
		if p != q and n.bit_length() == bits and phi % e:
			return n, e, pow(e, -1, phi)


def _b(i):
	return ek.b64url(i.to_bytes((i.bit_length() + 7) // 8, "big"))


def rs256(claims, n, d, kid="py-1", alg="RS256", kopf_extra=None):
	kopf = {"alg": alg, "typ": "JWT", "kid": kid, **(kopf_extra or {})}
	e = f"{ek.b64url(json.dumps(kopf))}.{ek.b64url(json.dumps(claims))}"
	bits = alg[2:]
	k = (n.bit_length() + 7) // 8
	t = ek._DIGEST_INFO[bits] + ek._HASH[bits](e.encode()).digest()
	em = b"\x00\x01" + b"\xff" * (k - len(t) - 3) + b"\x00" + t
	return f"{e}.{ek.b64url(pow(int.from_bytes(em, 'big'), d, n).to_bytes(k, 'big'))}"


JETZT = 1_900_000_000
BASIS = {"iss": "https://idp.ref.id-austria.gv.at", "aud": "https://oekoinvest.example/eid", "iat": JETZT - 5, "exp": JETZT + 300, "nonce": "n-123",
	"given_name": "Anna", "family_name": "Muster", "birthdate": "1980-02-03", "urn:pvpgvat:oidc.bpk": "XFN+541505g:abcdEFGH=",
	"urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": "http://eidas.europa.eu/LoA/high"}


class TestEidKern(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls.n, cls.e, cls.d = rsa_schluessel(2048)
		cls.n2, _, cls.d2 = rsa_schluessel(2048)
		cls.jwks = {"keys": [{"kty": "RSA", "n": _b(cls.n), "e": _b(cls.e), "kid": "py-1", "use": "sig"}, {"kty": "RSA", "n": _b(cls.n2), "e": _b(cls.e), "kid": "enc", "use": "enc"}]}
		cls.schluessel = ek.schluessel_laden(json.dumps(cls.jwks))
		cls.opt = {"issuer": BASIS["iss"], "client_id": BASIS["aud"], "nonce": "n-123", "schluessel": cls.schluessel, "jetzt_s": JETZT,
			"loa_claims": ek.METHODEN["id_austria"]["loa_claims"], "loa_min": "hoch"}

	def tok(self, **ueber):
		return rs256({**BASIS, **ueber}, self.n, self.d)

	def test_pkce(self):
		p = ek.pkce_paar()
		self.assertEqual(p["methode"], "S256")
		self.assertTrue(43 <= len(p["verifier"]) <= 128)
		self.assertEqual(ek.pkce_challenge("abc"), "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0")

	def test_jwks_ohne_enc(self):
		self.assertEqual(len(self.schluessel), 1)

	def test_rs256_gueltig_und_manipulation(self):
		r = ek.id_token_pruefen(self.tok(), **self.opt)
		self.assertTrue(r["ok"], r)
		self.assertEqual(r["loa"], "hoch")
		h, _, s = self.tok().split(".")
		self.assertEqual(ek.jws_pruefen(f"{h}.{ek.b64url(json.dumps({'a': 2}))}.{s}", self.schluessel)["grund"], "signatur")
		self.assertEqual(ek.jws_pruefen(rs256(BASIS, self.n2, self.d2), self.schluessel)["grund"], "signatur")
		self.assertEqual(ek.jws_pruefen(rs256(BASIS, self.n, self.d, kid="x"), self.schluessel)["grund"], "schluessel")

	def test_kreuzpruefung_node(self):
		r = ek.id_token_pruefen(NODE_VEKTOR["token"], issuer=BASIS["iss"], client_id=BASIS["aud"], nonce="n-node", schluessel=ek.schluessel_laden(NODE_VEKTOR["jwk"]),
			jetzt_s=JETZT, loa_claims=ek.METHODEN["id_austria"]["loa_claims"])
		self.assertTrue(r["ok"], r)
		self.assertEqual(r["claims"]["family_name"], "Müller")

	def test_algorithmen_abgelehnt(self):
		none = f"{ek.b64url(json.dumps({'alg': 'none'}))}.{ek.b64url('{}')}."
		self.assertEqual(ek.jws_pruefen(none, self.schluessel)["grund"], "alg")
		hs = ek.hs_signieren({"a": 1}, "geheim")
		self.assertEqual(ek.jws_pruefen(hs, self.schluessel)["grund"], "alg")  # Algorithmus-Verwechslung
		self.assertTrue(ek.jws_pruefen(hs, algs=["HS256"], hmac_geheimnis="geheim")["ok"])
		self.assertEqual(ek.jws_pruefen("a.b.c.d.e")["grund"], "verschluesselt")
		self.assertEqual(ek.jws_pruefen(rs256(BASIS, self.n, self.d, kopf_extra={"crit": ["x"]}), self.schluessel)["grund"], "crit")
		self.assertEqual(ek.jws_pruefen("kaputt")["grund"], "format")

	def test_rsa_zu_kurz(self):
		n, e, d = rsa_schluessel(1024)
		k = ek.schluessel_laden({"keys": [{"kty": "RSA", "n": _b(n), "e": _b(e)}]})
		self.assertEqual(ek.jws_pruefen(rs256(BASIS, n, d, kid=None), k)["grund"], "schluessel")

	def test_claims(self):
		o = self.opt
		self.assertTrue(ek.id_token_pruefen(self.tok(), **{**o, "nonce": None, "nonce_hash": ek.sha256_hex("n-123")})["ok"])
		self.assertEqual(ek.id_token_pruefen(self.tok(iss="https://boese.example"), **o)["grund"], "iss")
		self.assertEqual(ek.id_token_pruefen(self.tok(aud="fremd"), **o)["grund"], "aud")
		self.assertEqual(ek.id_token_pruefen(self.tok(aud=[BASIS["aud"], "x"]), **o)["grund"], "azp")
		self.assertTrue(ek.id_token_pruefen(self.tok(aud=[BASIS["aud"], "x"], azp=BASIS["aud"]), **o)["ok"])
		self.assertEqual(ek.id_token_pruefen(self.tok(exp=JETZT - 200), **o)["grund"], "exp")
		self.assertTrue(ek.id_token_pruefen(self.tok(exp=JETZT - 60), **o)["ok"])
		self.assertEqual(ek.id_token_pruefen(self.tok(iat=JETZT + 600), **o)["grund"], "iat")
		self.assertEqual(ek.id_token_pruefen(self.tok(iat=JETZT - 3600, exp=JETZT + 60), **o)["grund"], "alter")
		self.assertEqual(ek.id_token_pruefen(self.tok(nbf=JETZT + 600), **o)["grund"], "nbf")
		self.assertEqual(ek.id_token_pruefen(self.tok(nonce="n-999"), **o)["grund"], "nonce")
		self.assertEqual(ek.id_token_pruefen(rs256({k: v for k, v in BASIS.items() if k != "nonce"}, self.n, self.d), **o)["grund"], "nonce")

	def test_vertrauensniveau(self):
		subst = self.tok(**{"urn:pvpgvat:oidc.eid_citizen_qaa_eidas_level": "http://eidas.europa.eu/LoA/substantial"})
		self.assertEqual(ek.id_token_pruefen(subst, **self.opt)["grund"], "loa")
		self.assertTrue(ek.id_token_pruefen(subst, **{**self.opt, "loa_min": "substanziell"})["ok"])
		ohne = rs256({k: v for k, v in BASIS.items() if "qaa" not in k}, self.n, self.d)
		self.assertEqual(ek.id_token_pruefen(ohne, **self.opt)["grund"], "loa")
		self.assertTrue(ek.id_token_pruefen(ohne, **{**self.opt, "loa_standard": "hoch"})["ok"])
		faelle = {"http://eidas.europa.eu/LoA/high": "hoch", "http://eidas.europa.eu/LoA/substantial": "substanziell", "http://eidas.europa.eu/LoA/low": "niedrig",
			"http://www.stork.gov.eu/1.0/citizenQAALevel/4": "hoch", "3": "substanziell", "http://eidas.europa.eu/NotNotified/LoA/high": "", "irgendwas": "", None: ""}
		for w, erwartet in faelle.items():
			self.assertEqual(ek.loa_stufe(w), erwartet, w)

	def test_minimaldaten_und_bpk(self):
		md = ek.minimaldaten(BASIS, ek.METHODEN["id_austria"]["claims"], pfeffer="test-pfeffer-1234567890", token_hash="ab" * 32)
		self.assertEqual((md["vorname"], md["nachname"], md["geburtsdatum"]), ("Anna", "Muster", "1980-02-03"))
		self.assertEqual(md["bpkHash"], ek.bpk_hash("XFN+541505g:abcdEFGH=", "test-pfeffer-1234567890"))
		self.assertNotIn("abcdEFGH", json.dumps(md))
		self.assertEqual(md["transaktionsId"], "T-" + "ab" * 12)
		self.assertIsNone(ek.bpk_hash("x", ""))
		self.assertEqual(ek.datum_normal("19800203"), "1980-02-03")
		self.assertEqual(ek.datum_normal("3.2.1980"), "1980-02-03")

	def test_abgleich(self):
		self.assertTrue(ek.eid_abgleich({"vorname": "Anna Maria", "nachname": "Müller", "geburtsdatum": "1980-02-03"}, {"vorname": "Anna", "nachname": "Mueller", "geburtsdatum": "1980-02-03"})["name"])
		a = ek.eid_abgleich({"vorname": "Erika", "nachname": "Mustermann", "geburtsdatum": "1964-08-12"}, {"vorname": "Anna", "nachname": "Muster", "geburtsdatum": "1980-02-03"})
		self.assertEqual((a["name"], a["geburtsdatum"]), (False, False))
		self.assertIsNone(ek.eid_abgleich({"nachname": "B"}, {})["name"])

	def test_konfiguration(self):
		leer = lambda k: None  # noqa: E731
		self.assertFalse(ek.konfig("id_austria", leer, demo_erlaubt=False)["aktiv"])
		self.assertEqual(ek.verfuegbar(leer, demo_erlaubt=False), [])
		d = ek.konfig("id_austria", leer, demo_erlaubt=True)
		self.assertTrue(d["demo"] and d["aktiv"] and d["auth_url"] == "/portal/eid/demo")
		conf = {"oekoinvest_eid_at_client_id": "https://oekoinvest.example/eid", "oekoinvest_eid_at_client_secret": "nur-test", "oekoinvest_eid_bpk_pepper": "pfeffer-nur-fuer-den-test"}
		k = ek.konfig("id_austria", conf.get)
		self.assertTrue(k["aktiv"] and not k["demo"])
		self.assertEqual(k["issuer"], "https://idp.id-austria.gv.at")
		self.assertEqual(ek.konfig("id_austria", {**conf, "oekoinvest_eid_at_umgebung": "referenz"}.get)["issuer"], "https://idp.ref.id-austria.gv.at")
		self.assertFalse(ek.konfig("id_austria", {**conf, "oekoinvest_eid_bpk_pepper": "kurz"}.get)["aktiv"])
		de = {"oekoinvest_eid_de_client_id": "x", "oekoinvest_eid_de_client_secret": "y", "oekoinvest_eid_bpk_pepper": "pfeffer-nur-fuer-den-test"}
		self.assertFalse(ek.konfig("online_ausweis", de.get)["aktiv"])  # ohne Aussteller
		kd = ek.konfig("online_ausweis", {**de, "oekoinvest_eid_de_issuer": "https://eid.dienst.example", "oekoinvest_eid_de_claim_pseudonym": "rid", "oekoinvest_eid_de_loa_standard": "hoch"}.get)
		self.assertTrue(kd["aktiv"])
		self.assertEqual(kd["claims"]["bpk"], ["rid"])
		url = ek.autorisierungs_url(k, "S", "N", "C", ek.redirect_uri(k, "https://oekoinvest.example"))
		self.assertIn("code_challenge_method=S256", url)
		self.assertIn("redirect_uri=https%3A%2F%2Foekoinvest.example%2Fapi%2Fdienste%2Feid%2Frueckkehr", url)
		self.assertNotIn("nur-test", url)
		self.assertEqual(ek.eid_client_url("https://x.example/tc?a=1"), "http://127.0.0.1:24727/eID-Client?tcTokenURL=https%3A%2F%2Fx.example%2Ftc%3Fa%3D1")

	def test_demo_token_hs256(self):
		k = ek.konfig("id_austria", lambda _k: None, demo_erlaubt=True)
		t = ek.hs_signieren({**BASIS, "iss": k["issuer"], "aud": k["client_id"]}, "demo-geheimnis")
		r = ek.id_token_pruefen(t, issuer=k["issuer"], client_id=k["client_id"], nonce="n-123", algs=k["algs"], hmac_geheimnis="demo-geheimnis", jetzt_s=JETZT, loa_claims=ek.METHODEN["id_austria"]["loa_claims"])
		self.assertTrue(r["ok"], r)
		self.assertEqual(ek.id_token_pruefen(t, issuer=k["issuer"], client_id=k["client_id"], nonce="n-123", algs=k["algs"], hmac_geheimnis="anderes", jetzt_s=JETZT)["grund"], "signatur")


if __name__ == "__main__":
	unittest.main()
