# Copyright (c) 2026, ÖkoInvest GmbH
#
# Onboarding-Assistenten – reine Logik ohne Frappe (onboarding_kern.py + onboarding_pfade.json):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_onboarding_kern
# Läuft auch unter `bench run-tests` (unittest.TestCase).

import unittest
from datetime import datetime, timedelta, timezone

from oekoinvest_app.plattform import onboarding_kern as ok


class TestDefinitionen(unittest.TestCase):
	def test_pfade_je_rolle(self):
		ids = lambda rollen: [p["id"] for p in ok.pfade_fuer(rollen)]  # noqa: E731
		self.assertEqual(ids(["investor"]), ["investor"])
		self.assertEqual(ids(["kommune"]), ["kommune"])
		self.assertEqual(ids(["landwirt", "mitglied"]), ["flaeche", "mitglied"])
		self.assertEqual(ids(["admin"]), ["backoffice"])
		self.assertEqual(ids([]), [])

	def test_eindeutige_schritte_und_kriterien(self):
		for p in ok.definitionen()["pfade"]:
			schritte = [s["id"] for s in p["schritte"]]
			self.assertEqual(len(schritte), len(set(schritte)), p["id"])
			for s in p["schritte"]:
				self.assertIsInstance(s.get("kriterium"), dict, f"{p['id']}.{s['id']}")
				for link in s.get("links") or []:
					self.assertTrue(link["href"].startswith("/"), link)


class TestAuswertung(unittest.TestCase):
	def test_investor_untertyp_und_pflicht(self):
		p = ok.pfad_nach_id("investor")
		a = ok.pfad_auswerten(p, {"name": True, "telefon": True}, {})
		self.assertIn("typ", a["pflichtOffen"])
		self.assertFalse(a["abschliessbar"])
		fakten = {"name": True, "telefon": True, "firma": False, "suchprofil": True, "suchprofilTicket": True, "kyc": {"angestossen": True}, "interessen": 1}
		a = ok.pfad_auswerten(p, fakten, {"untertyp": "privat"})
		self.assertEqual(a["pflichtOffen"], [])  # Privatinvestor braucht keine Firma
		a = ok.pfad_auswerten(p, fakten, {"untertyp": "fonds"})
		self.assertEqual(a["pflichtOffen"], ["profil"])  # Fonds: Firma Pflicht

	def test_verkaeufer_bestand_braucht_bestandsprojekt(self):
		p = ok.pfad_nach_id("verkaeufer")
		f = {"name": True, "telefon": True, "firma": True, "projekte": 1, "projekteBestand": 0, "provision": 1, "kyc": {"angestossen": True}}
		self.assertIn("projekt", ok.pfad_auswerten(p, f, {"untertyp": "bestand"})["pflichtOffen"])
		self.assertNotIn("projekt", ok.pfad_auswerten(p, f, {"untertyp": "projektentwickler"})["pflichtOffen"])

	def test_merker_nur_fuer_eigenen_schritt(self):
		p = ok.pfad_nach_id("kommune")
		a = ok.pfad_auswerten(p, {}, {"bestaetigt": ["bauleitplanung"]})
		erledigt = {s["id"]: s["erledigt"] for s in a["schritte"]}
		self.assertTrue(erledigt["bauleitplanung"])
		self.assertFalse(erledigt["beteiligung"])
		self.assertFalse(erledigt["gemeinde"])

	def test_backoffice_je_unterrolle(self):
		p = ok.pfad_nach_id("backoffice")
		ids = lambda u: [s["id"] for s in ok.pfad_auswerten(p, {}, {"untertyp": u})["schritte"]]  # noqa: E731
		self.assertIn("gebiete", ids("akquise"))
		self.assertNotIn("gebiete", ids("buchhaltung"))
		self.assertNotIn("aufgabe", ids("lesen"))
		self.assertIn("kyc", ids("compliance"))


class TestStruktur(unittest.TestCase):
	def test_fremder_pfad_verboten(self):
		neu = {"pfade": {"backoffice": {"untertyp": "leitung"}}}
		with self.assertRaises(ok.OnboardingFehler) as e:
			ok.struktur_pruefen(["investor"], {"aktion": "untertyp", "pfad": "backoffice", "untertyp": "leitung"}, {}, neu)
		self.assertEqual(e.exception.status, 403)

	def test_nicht_bestaetigbarer_schritt(self):
		with self.assertRaises(ok.OnboardingFehler) as e:
			ok.struktur_pruefen(["investor"], {"aktion": "bestaetigen", "pfad": "investor", "schritt": "kyc"}, {}, {"pfade": {"investor": {"bestaetigt": ["kyc"]}}})
		self.assertEqual(e.exception.status, 422)
		neu = ok.struktur_pruefen(["investor"], {"aktion": "bestaetigen", "pfad": "investor", "schritt": "nda"}, {}, {"pfade": {"investor": {"bestaetigt": ["nda"]}}})
		self.assertEqual(neu["pfade"]["investor"]["bestaetigt"], ["nda"])

	def test_backoffice_nur_eigene_unterrolle(self):
		with self.assertRaises(ok.OnboardingFehler):
			ok.struktur_pruefen(["admin"], {"aktion": "untertyp", "pfad": "backoffice", "untertyp": "leitung"}, {}, {"pfade": {"backoffice": {"untertyp": "leitung"}}}, ["akquise"])

	def test_abschluss_nur_ohne_offene_pflicht(self):
		neu = {"pfade": {"mitglied": {"abgeschlossenAm": "2026-09-30T10:00:00Z"}}}
		with self.assertRaises(ok.OnboardingFehler) as e:
			ok.struktur_pruefen(["mitglied"], {"aktion": "abschliessen", "pfad": "mitglied"}, {}, neu, auswertung={"pfad": "mitglied", "pflichtOffen": ["beteiligung"]})
		self.assertEqual(e.exception.status, 409)
		ok.struktur_pruefen(["mitglied"], {"aktion": "abschliessen", "pfad": "mitglied"}, {}, neu, auswertung={"pfad": "mitglied", "pflichtOffen": []})

	def test_snapshot_ohne_aktion_aendert_nichts_anderes(self):
		alt = {"pfade": {"investor": {"bestaetigt": []}}}
		with self.assertRaises(ok.OnboardingFehler):
			ok.struktur_pruefen(["investor"], None, alt, {"pfade": {"investor": {"bestaetigt": ["nda"]}}})
		ok.struktur_pruefen(["investor"], None, alt, {**alt, "auswertung": {"pfad": "investor", "erledigt": 1, "gesamt": 10}})


class TestMails(unittest.TestCase):
	def test_willkommen_und_erinnerungen(self):
		jetzt = datetime(2026, 9, 30, 12, tzinfo=timezone.utc)
		iso = lambda tage: (jetzt - timedelta(days=tage)).isoformat()  # noqa: E731
		z = ok.zustand_leer()
		self.assertEqual(ok.faellige_mail(iso(1), False, z, jetzt), "willkommen")
		self.assertIsNone(ok.faellige_mail(iso(30), False, z, jetzt))
		z["mails"] = {"willkommen": iso(4)}
		z["auswertung"] = {"pfad": "investor", "pflichtOffen": ["kyc"], "abgeschlossen": False}
		self.assertEqual(ok.faellige_mail(iso(4), False, z, jetzt), "erinnerung3")
		self.assertIsNone(ok.faellige_mail(iso(4), True, z, jetzt))  # Checkliste ausgeblendet
		z["mails"]["erinnerung3"] = iso(1)
		self.assertIsNone(ok.faellige_mail(iso(4), False, z, jetzt))
		self.assertEqual(ok.faellige_mail(iso(8), False, z, jetzt), "erinnerung7")
		z["auswertung"]["pflichtOffen"] = []
		self.assertIsNone(ok.faellige_mail(iso(8), False, z, jetzt))

	def test_mail_ohne_vertrauliches(self):
		m = ok.mail_inhalt("erinnerung3", "Einstieg für Investoren", 2)
		self.assertIn("2 Pflichtschritte", m["text"])
		self.assertEqual(m["pfad"], "/portal/willkommen")


if __name__ == "__main__":
	unittest.main()
