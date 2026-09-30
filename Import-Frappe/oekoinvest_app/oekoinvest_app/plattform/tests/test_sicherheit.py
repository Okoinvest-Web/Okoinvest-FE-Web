# Copyright (c) 2026, ÖkoInvest GmbH
# Login & Sicherheit: TOTP (RFC 6238), Zwei-Faktor mit Replay-Schutz, Wiederherstellungscodes, E-Mail-Link,
# Kontosperre mit Backoff, Sitzungen/Geräte, Datenexport ohne Geheimnisse.
# Eigene Testkonten mit Präfix „sich-“ (example.com), alles fiktiv.

import time

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_to_date, now_datetime

from oekoinvest_app.plattform import sicherheit as sh
from oekoinvest_app.plattform import totp
from oekoinvest_app.plattform.api import auth, flaeche
from oekoinvest_app.plattform.api import sicherheit as api
from oekoinvest_app.plattform.geraet import geraet_aus_user_agent, ip_grob, ort_grob
from oekoinvest_app.plattform.tests.testdaten import PASSWORT, aufruf, vorbereiten

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"
RFC_SCHLUESSEL = b"12345678901234567890"


def konto_sicherheit(rollen=("flaeche",)):
	"""Testkonto mit eigenem Präfix über auth.registrieren (E-Mail bestätigt)."""
	email = f"sich-{frappe.generate_hash(length=10).lower()}@example.com"
	ergebnis = aufruf(
		auth.registrieren,
		email=email,
		passwort=PASSWORT,
		vorname="Sicher",
		nachname="(Test)",
		rollen=list(rollen),
		basisUrl="https://plattform-test.example.com",
		ip="127.0.0.1",
	)
	kid = ergebnis["nutzer"]["id"]
	frappe.db.set_value("Plattform Konto", kid, "email_bestaetigt", 1)
	return kid, email


def zwei_faktor_aktivieren(kid):
	start = aufruf(api.zwei_faktor_starten, als_benutzer=kid)
	ergebnis = aufruf(api.zwei_faktor_bestaetigen, code=totp.totp(start["geheimnis"]), als_benutzer=kid)
	return start["geheimnis"], ergebnis["codes"]


class TestTotp(FrappeTestCase):
	def test_rfc6238_vektoren(self):
		# RFC 6238, Anhang B (SHA1, 8 Stellen), Schlüssel "12345678901234567890"
		for zeit, erwartet in ((59, "94287082"), (1111111109, "07081804"), (1111111111, "14050471"), (1234567890, "89005924"), (2000000000, "69279037")):
			self.assertEqual(totp.hotp(RFC_SCHLUESSEL, zeit // totp.PERIODE_S, 8), erwartet)
		b32 = totp.base32(RFC_SCHLUESSEL)
		self.assertEqual(totp.base32_lesen(b32), RFC_SCHLUESSEL)
		self.assertEqual(totp.totp(b32, 59, 8), "94287082")

	def test_fenster_und_replay(self):
		g = totp.geheimnis_erzeugen()
		t = 1_800_000_000
		code = totp.totp(g, t)
		schritt = totp.totp_pruefen(g, code, zeit_s=t)
		self.assertEqual(schritt, t // 30)
		self.assertEqual(totp.totp_pruefen(g, code, zeit_s=t + 30), t // 30)  # ±1 Schritt Uhrabweichung
		self.assertIsNone(totp.totp_pruefen(g, code, zeit_s=t + 90))  # außerhalb des Fensters
		self.assertIsNone(totp.totp_pruefen(g, code, letzter_schritt=schritt, zeit_s=t))  # Replay
		self.assertIsNone(totp.totp_pruefen(g, "12345", zeit_s=t))
		self.assertIsNone(totp.totp_pruefen(g, "abcdef", zeit_s=t))

	def test_uri_und_codes(self):
		uri = totp.otpauth_uri("ABCDEF234567", "a@example.com")
		self.assertTrue(uri.startswith("otpauth://totp/%C3%96koInvest:a%40example.com?secret=ABCDEF234567&issuer=%C3%96koInvest"))
		codes = totp.codes_erzeugen()
		self.assertEqual(len(codes), 10)
		self.assertTrue(all(totp.ist_wiederherstellungscode(c) for c in codes))
		self.assertEqual(totp.code_hash(codes[0].lower()), totp.code_hash(codes[0].replace("-", "")))

	def test_geraet_grob(self):
		self.assertEqual(geraet_aus_user_agent(UA)["label"], "Chrome auf Windows")
		self.assertEqual(ip_grob("203.0.113.17"), "203.0.113.x")
		self.assertEqual(ip_grob("2001:db8:1:2::5"), "2001:db8:1::/48")
		self.assertEqual(ort_grob("192.168.1.5"), "Lokales Netz")
		self.assertEqual(ort_grob("203.0.113.17", "AT"), "Österreich · 203.0.113.x")


class TestSicherheit(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()

	def tearDown(self):
		frappe.set_user("Administrator")

	# ------------------------------------------------------------ Zwei-Faktor

	def test_zwei_faktor_code_richtig_falsch_replay(self):
		kid, _ = konto_sicherheit()
		geheimnis, codes = zwei_faktor_aktivieren(kid)
		self.assertEqual(len(codes), 10)
		status = aufruf(api.zwei_faktor_status, als_benutzer=kid)
		self.assertTrue(status["aktiv"])
		self.assertEqual(status["codesUebrig"], 10)
		# Schlüssel und Codes liegen nicht im Klartext in der Datenbank
		zeile = frappe.db.get_value("Plattform Zwei Faktor", {"nutzer_id": kid}, ["geheimnis", "codes"], as_dict=True)
		self.assertNotEqual(zeile.geheimnis, geheimnis)
		self.assertNotIn(codes[0], zeile.codes)

		# nächster Zeitschritt (Fenster +1) ist gültig …
		naechster = totp.totp(geheimnis, time.time() + 30)
		k = aufruf(api.zwei_faktor_pruefen, nutzerId=kid, code=naechster, ip="127.0.0.1", userAgent=UA)
		self.assertEqual(k["id"], kid)
		self.assertEqual(k["zweiFaktorMethode"], "totp")
		# … derselbe Code ein zweites Mal nicht (Replay)
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(api.zwei_faktor_pruefen, nutzerId=kid, code=naechster)
		# falscher Code
		falsch = totp.totp(geheimnis, time.time() - 3600)
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(api.zwei_faktor_pruefen, nutzerId=kid, code=falsch)
		self.assertTrue(frappe.db.exists("Plattform Anmeldung", {"nutzer_id": kid, "ok": 0, "grund": "2fa"}))

	def test_wiederherstellungscode_nur_einmal(self):
		kid, _ = konto_sicherheit()
		_, codes = zwei_faktor_aktivieren(kid)
		k = aufruf(api.zwei_faktor_pruefen, nutzerId=kid, code=codes[0].lower())
		self.assertEqual(k["zweiFaktorMethode"], "wiederherstellung")
		self.assertEqual(k["codesUebrig"], 9)
		with self.assertRaises(frappe.AuthenticationError):
			aufruf(api.zwei_faktor_pruefen, nutzerId=kid, code=codes[0])

	def test_deaktivieren_braucht_passwort_und_code(self):
		kid, _ = konto_sicherheit()
		geheimnis, _ = zwei_faktor_aktivieren(kid)
		with self.assertRaises(frappe.ValidationError):
			aufruf(api.zwei_faktor_deaktivieren, passwort="falsch-falsch-1", code=totp.totp(geheimnis), als_benutzer=kid)
		status = aufruf(api.zwei_faktor_deaktivieren, passwort=PASSWORT, code=totp.totp(geheimnis, time.time() + 30), als_benutzer=kid)
		self.assertFalse(status["aktiv"])

	def test_pflicht_2fa_nur_backoffice(self):
		kid, _ = konto_sicherheit()
		with self.assertRaises(frappe.PermissionError):
			aufruf(api.pflicht_speichern, rollen=["investor"], als_benutzer=kid)

	# ------------------------------------------------------------ E-Mail-Link

	def test_magic_link_einmalig_und_ablauf(self):
		kid, email = konto_sicherheit()
		self.assertEqual(aufruf(api.magic_link_anfordern, email="gibt-es-nicht@example.com", basisUrl=""), {"ok": True})
		self.assertEqual(aufruf(api.magic_link_anfordern, email=email, basisUrl=""), {"ok": True})
		self.assertTrue(frappe.db.exists("Plattform Token", {"nutzer_id": kid, "art": "magic", "benutzt": 0}))
		token = sh.token_anlegen("magic", kid, 15)
		k = aufruf(api.magic_link_einloesen, token=token)
		self.assertEqual(k["id"], kid)
		self.assertIn("zweiFaktorAktiv", k)
		with self.assertRaises(frappe.ValidationError):
			aufruf(api.magic_link_einloesen, token=token)  # nur einmal
		abgelaufen = sh.token_anlegen("magic", kid, 15)
		frappe.db.set_value("Plattform Token", {"hash": sh.sha256(abgelaufen)}, "ablauf", add_to_date(now_datetime(), minutes=-1))
		with self.assertRaises(frappe.ValidationError):
			aufruf(api.magic_link_einloesen, token=abgelaufen)

	# ------------------------------------------------------------ Kontosperre

	def test_kontosperre_backoff(self):
		self.assertEqual(sh.sperr_dauer(4), 0)
		self.assertEqual(sh.sperr_dauer(5), 30)
		self.assertEqual(sh.sperr_dauer(6), 60)
		self.assertEqual(sh.sperr_dauer(12), 3600)  # 30 · 2^7 = 3840 → höchstens 3600 s
		self.assertIn("30 Sekunden", sh.sperr_text(30))
		self.assertIn("2 Minuten", sh.sperr_text(61))

		kid, email = konto_sicherheit()
		for _ in range(5):
			self.assertIsNone(aufruf(auth.anmelden, email=email, passwort="falsch-falsch-1", ip="203.0.113.17", userAgent=UA))
		with self.assertRaises(frappe.TooManyRequestsError):
			aufruf(auth.anmelden, email=email, passwort=PASSWORT)  # auch mit richtigem Passwort
		self.assertEqual(frappe.db.get_value("Plattform Konto", kid, "fehlversuche"), 5)
		self.assertEqual(frappe.db.count("Plattform Anmeldung", {"nutzer_id": kid, "ok": 0}), 5)
		# eine erfolgreiche Anmeldung (Sitzung) setzt die Sperre zurück
		aufruf(api.sitzung_anlegen, ip="203.0.113.17", userAgent=UA, als_benutzer=kid)
		k = aufruf(auth.anmelden, email=email, passwort=PASSWORT)
		self.assertEqual(k["id"], kid)
		self.assertFalse(k["zweiFaktorAktiv"])

	# ------------------------------------------------------------ Sitzungen & Geräte

	def test_sitzung_widerrufen(self):
		kid, _ = konto_sicherheit()
		r = aufruf(api.sitzung_anlegen, ip="203.0.113.17", userAgent=UA, methode="passwort", als_benutzer=kid)
		sid = r["sitzung"]["id"]
		self.assertTrue(r["neuesGeraet"])
		self.assertTrue(r["geraetToken"])
		n = aufruf(auth.nutzer_fuer_sitzung, nutzerId=kid, sitzungId=sid)
		self.assertEqual(n["sitzung"]["id"], sid)
		self.assertIsNone(n["organisation"])
		self.assertIn("komfort", n)
		# gleiches Gerät (Cookie) → kein neues Token, kein neues Gerät
		r2 = aufruf(api.sitzung_anlegen, ip="203.0.113.17", userAgent=UA, geraetToken=r["geraetToken"], als_benutzer=kid)
		self.assertIsNone(r2["geraetToken"])
		self.assertFalse(r2["neuesGeraet"])
		self.assertEqual(len(aufruf(api.sitzungen, sitzungId=sid, als_benutzer=kid)), 2)
		# Sitzung beenden → Cookie ungültig
		self.assertEqual(aufruf(api.sitzung_beenden, id=sid, sitzungId=sid, als_benutzer=kid)["beendet"], 1)
		self.assertIsNone(aufruf(auth.nutzer_fuer_sitzung, nutzerId=kid, sitzungId=sid))
		# alle anderen beenden: Version + 1, aktuelle Sitzung bleibt gültig
		r3 = aufruf(api.sitzung_anlegen, ip="203.0.113.17", userAgent=UA, als_benutzer=kid)
		aufruf(api.sitzung_beenden, alleAnderen=True, sitzungId=r3["sitzung"]["id"], als_benutzer=kid)
		self.assertIsNone(aufruf(auth.nutzer_fuer_sitzung, nutzerId=kid, sitzungId=r2["sitzung"]["id"]))
		self.assertEqual(aufruf(auth.nutzer_fuer_sitzung, nutzerId=kid, sitzungId=r3["sitzung"]["id"])["sitzung"]["id"], r3["sitzung"]["id"])
		# fremde Sitzung kann nicht beendet werden
		fremd, _ = konto_sicherheit()
		with self.assertRaises(frappe.DoesNotExistError):
			aufruf(api.sitzung_beenden, id=r3["sitzung"]["id"], als_benutzer=fremd)

	# ------------------------------------------------------------ Datenexport

	def test_datenexport_nur_eigene_daten_ohne_geheimnisse(self):
		kid, email = konto_sicherheit()
		fremd, fremd_email = konto_sicherheit()
		eigen_f = aufruf(flaeche.anlegen, daten={"bezeichnung": "Eigene Wiese (Test)", "ha": 3}, ip="127.0.0.1", als_benutzer=kid)
		fremd_f = aufruf(flaeche.anlegen, daten={"bezeichnung": "Fremder Acker (Test)", "ha": 4}, ip="127.0.0.1", als_benutzer=fremd)
		geheimnis, codes = zwei_faktor_aktivieren(kid)
		r = aufruf(api.sitzung_anlegen, ip="203.0.113.17", userAgent=UA, als_benutzer=kid)
		export = aufruf(api.daten_export, als_benutzer=kid)
		text = frappe.as_json(export)
		self.assertEqual(export["export"]["format"], "oekoinvest-datenexport-1")
		self.assertEqual(export["konto"]["id"], kid)
		self.assertNotIn("sitzungVersion", export["konto"])
		self.assertEqual([f["id"] for f in export["flaechen"]], [eigen_f["id"]])
		self.assertNotIn(fremd_f["id"], text)
		self.assertNotIn(fremd_email, text)
		self.assertTrue(export["sicherheit"]["zweiFaktor"]["aktiv"])
		self.assertEqual(export["sicherheit"]["zweiFaktor"]["wiederherstellungscodesUebrig"], 10)
		# keine Geheimnisse: TOTP-Schlüssel, Wiederherstellungscodes/-Hashes, Geräte-Token/-Hash, Passwort
		self.assertNotIn(geheimnis, text)
		self.assertNotIn(codes[0], text)
		self.assertNotIn(totp.code_hash(codes[0]), text)
		self.assertNotIn(r["geraetToken"], text)
		self.assertNotIn(sh.sha256(r["geraetToken"]), text)
		self.assertNotIn(PASSWORT, text)
		self.assertNotIn('"hash"', text)
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", {"nutzer_id": kid, "aktion": "datenexport"}))

	def test_konto_loeschen(self):
		kid, email = konto_sicherheit()
		entwurf = aufruf(flaeche.anlegen, daten={"bezeichnung": "Entwurf (Test)"}, ip="127.0.0.1", als_benutzer=kid)
		with self.assertRaises(frappe.ValidationError):
			aufruf(api.konto_loeschen, passwort=PASSWORT, bestaetigung="ja", als_benutzer=kid)
		self.assertEqual(aufruf(api.konto_loeschen, passwort=PASSWORT, bestaetigung="löschen", als_benutzer=kid), {"ok": True})
		k = frappe.get_doc("Plattform Konto", kid)
		self.assertFalse(k.aktiv)
		self.assertTrue(k.email.endswith("@geloescht.invalid"))
		self.assertTrue(k.geloescht_am)
		self.assertFalse(frappe.db.exists("User", email))
		self.assertFalse(frappe.db.exists("Plattform Flaeche", entwurf["id"]))
		self.assertIsNone(aufruf(auth.anmelden, email=email, passwort=PASSWORT))
