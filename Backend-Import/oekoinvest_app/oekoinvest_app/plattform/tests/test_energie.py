# Copyright (c) 2026, ÖkoInvest GmbH
# Energiebeschaffung (API, bench run-tests): Lieferant sieht nur eingeladene Ausschreibungen und nur eigene Angebote,
# Angebote nach Frist gesperrt, Vollmacht-Pflicht, Zuschlag nur mit Kundenfreigabe, keine Kundennamen an Lieferanten.
# Spiegel von Teil B in scripts/plattform-test-energie.mjs (reine Logik: test_energie_kern.py).

import json

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import add_days, now_datetime

from oekoinvest_app.plattform.api import energie
from oekoinvest_app.plattform.tests.testdaten import aufruf, konto, vorbereiten


def _iso(dt):
	return dt.strftime("%Y-%m-%dT%H:%M:%S.000Z")


class TestEnergie(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		frappe.local.conf.oekoinvest_kyc_gating = "aus"
		cls.admin = konto(["admin"])
		cls.kunde = konto(["unternehmen"])
		jahr = now_datetime().year
		for handelstag, typ, preis in ((f"{jahr}-09-29", "base", 100), (f"{jahr}-09-29", "peak", 112)):
			for p in (f"Cal-{str(jahr + 1)[2:]}", f"Cal-{str(jahr + 2)[2:]}"):
				aufruf(energie.termin_speichern, daten={"eintrag": {"handelstag": handelstag, "zone": "DE", "produkt": p, "typ": typ, "preisEurMwh": preis, "quelle": "Test"}}, als_benutzer=cls.admin)
		cls.lf = []
		for i in range(3):
			l = aufruf(energie.lieferant_speichern, daten={"name": f"Testversorger {i} {frappe.generate_hash(length=6)}", "land": "DE"}, als_benutzer=cls.admin)
			k = konto(["unternehmen"])
			doc = frappe.get_doc("Plattform Konto", k)
			doc.set("rollen", [{"rolle": "lieferant"}])
			doc.save(ignore_permissions=True)
			frappe.db.set_value("Plattform Lieferant", l["id"], "konten", json.dumps([k]))
			cls.lf.append((l["id"], k))

	def _ausschreibung(self):
		aufruf(energie.vertrag_speichern, daten={"lieferant": "Alt (Test)", "preisCt": 14, "vertragEnde": f"{now_datetime().year}-12-31", "jahresKwh": 500000, "lastprofil": "zweischicht"}, als_benutzer=self.kunde)
		if not energie._vollmacht_aktiv(self.kunde):
			aufruf(energie.vollmacht_erteilen, zustimmung=True, als_benutzer=self.kunde)
		return aufruf(energie.ausschreibung_anlegen, daten={"titel": "Test-Ausschreibung Strom", "kundenIds": [self.kunde], "zone": "DE", "lieferbeginn": f"{now_datetime().year + 1}-01", "produkte": [{"art": "fix", "laufzeitJahre": 1}], "lieferantIds": [self.lf[0][0], self.lf[1][0]], "starten": True, "frist": _iso(add_days(now_datetime(), 2))}, als_benutzer=self.admin)

	def test_vollmacht_pflicht(self):
		k2 = konto(["unternehmen"])
		with self.assertRaises(frappe.ValidationError):
			aufruf(energie.ausschreibung_anlegen, daten={"titel": "Ohne Vollmacht", "kundenIds": [k2], "lieferbeginn": f"{now_datetime().year + 1}-01", "produkte": [{"art": "fix"}], "lieferantIds": [self.lf[0][0], self.lf[1][0]], "starten": True, "frist": _iso(add_days(now_datetime(), 2))}, als_benutzer=self.admin)

	def test_sichtbarkeit_und_zuschlag(self):
		a = self._ausschreibung()
		pb = {"positionen": [{"produktId": "P1", "arbeitspreisCt": 11.2, "grundpreisEurMonat": 50}], "bindefristBis": _iso(add_days(now_datetime(), 20)), "zahlungszielTage": 14, "sicherheit": "keine"}
		# nicht eingeladener Versorger
		liste = aufruf(energie.ausschreibungen, als_benutzer=self.lf[2][1])
		self.assertFalse(any(x["id"] == a["id"] for x in liste))
		with self.assertRaises(frappe.ValidationError):
			aufruf(energie.ausschreibung, id=a["id"], als_benutzer=self.lf[2][1])
		# eingeladener Versorger: anonym, nur eigene Angebote
		g1 = aufruf(energie.angebot_abgeben, id=a["id"], daten=pb, als_benutzer=self.lf[0][1])
		aufruf(energie.angebot_abgeben, id=a["id"], daten={**pb, "positionen": [{"produktId": "P1", "arbeitspreisCt": 10.9, "grundpreisEurMonat": 50}]}, als_benutzer=self.lf[1][1])
		sicht = aufruf(energie.ausschreibung, id=a["id"], als_benutzer=self.lf[0][1])["ausschreibung"]
		text = json.dumps(sicht)
		self.assertEqual(len(sicht["eigeneAngebote"]), 1)
		self.assertNotIn("10.9", text)
		self.assertNotIn(self.kunde, text)
		self.assertNotIn(frappe.db.get_value("Plattform Konto", self.kunde, "email"), text)
		# Frist → gesperrt
		aufruf(energie.ausschreibung_aktion, id=a["id"], daten={"aktion": "beenden"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(energie.angebot_abgeben, id=a["id"], daten=pb, als_benutzer=self.lf[0][1])
		# Zuschlag nur mit Kundenfreigabe
		aufruf(energie.ausschreibung_aktion, id=a["id"], daten={"aktion": "zuschlagVorschlag", "angebotId": g1["id"], "produktId": "P1"}, als_benutzer=self.admin)
		with self.assertRaises(frappe.ValidationError):
			aufruf(energie.ausschreibung_aktion, id=a["id"], daten={"aktion": "zuschlag"}, als_benutzer=self.admin)
		r = aufruf(energie.freigabe, id=a["id"], daten={"entscheidung": "freigegeben"}, als_benutzer=self.kunde)
		self.assertTrue(r["zuschlag"])
		self.assertEqual(frappe.db.get_value("Plattform Lieferantenangebot", g1["id"], "status"), "zuschlag")
		self.assertTrue(frappe.db.exists("Plattform Energie Vertrag", {"kunde_id": self.kunde, "quelle": "zuschlag"}))

	def test_normierung(self):
		a = self._ausschreibung()
		aufruf(energie.angebot_abgeben, id=a["id"], daten={"positionen": [{"produktId": "P1", "arbeitspreisCt": 12, "grundpreisEurMonat": 100}], "bindefristBis": _iso(add_days(now_datetime(), 20)), "zahlungszielTage": 14, "sicherheit": "keine"}, als_benutzer=self.lf[0][1])
		d = aufruf(energie.ausschreibung, id=a["id"], als_benutzer=self.admin)["ausschreibung"]
		z = d["vergleich"]["zeilen"][0]
		self.assertAlmostEqual(z["eurJahr"], d["vergleich"]["ctx"]["kwh"] * 12 / 100 + 1200, delta=2)
