# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC/KYB – reine Regeln (ohne Datenbank). Läuft mit Frappe-Stub auch ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_kyc_kern -v
# Gleiche Fälle wie scripts/plattform-test-kyc.mjs (IBAN, Sanktionsabgleich, Risiko, Fristen, Gating) und kyc.js.

import sys
import types
import unittest

try:  # Bench vorhanden → echtes Frappe; sonst minimaler Stub (kyc_kern importiert Frappe nur in Teil 2)
	import frappe  # noqa: F401
except ImportError:  # pragma: no cover
	sys.modules["frappe"] = types.ModuleType("frappe")

from oekoinvest_app.plattform import kyc_kern as k


class TestIban(unittest.TestCase):
	def test_gueltig_und_normalisiert(self):
		r = k.iban_pruefen("de89 3704 0044 0532 0130 00")
		self.assertTrue(r["ok"])
		self.assertEqual(r["iban"], "DE89370400440532013000")
		self.assertTrue(k.iban_pruefen("AT611904300234573201")["ok"])
		self.assertTrue(k.iban_pruefen("CH9300762011623852957")["ok"])

	def test_pruefziffer_und_laenge(self):
		self.assertIn("Prüfziffer", k.iban_pruefen("DE89370400440532013001")["fehler"])
		self.assertIn("20 Zeichen", k.iban_pruefen("AT61190430023457320")["fehler"])
		self.assertFalse(k.iban_pruefen("")["ok"])
		self.assertFalse(k.iban_pruefen("XX!!")["ok"])

	def test_maskiert(self):
		self.assertEqual(k.iban_maskiert("DE89370400440532013000"), "DE•• •••• 3000")


class TestNamen(unittest.TestCase):
	def test_kontoinhaber(self):
		self.assertTrue(k.kontoinhaber_passt("Max Mustermann", "Max", "Mustermann"))
		self.assertTrue(k.kontoinhaber_passt("Mustermann, Max Josef", "Max", "Mustermann"))
		self.assertFalse(k.kontoinhaber_passt("Erika Muster", "Max", "Mustermann"))
		self.assertTrue(k.kontoinhaber_passt("Demo Capital GmbH", firma="Demo Capital GmbH (fiktiv)"))
		self.assertFalse(k.kontoinhaber_passt("Andere Firma AG", firma="Demo Capital GmbH"))

	def test_normalisierung(self):
		self.assertEqual(k.name_normalisieren("Jörg Müßig-Straße (Demo)"), "joerg muessig strasse")


LISTE = [
	{"id": "DEMO-1", "euRef": "EU.DEMO.1", "typ": "person", "namen": ["Viktor Fiktivow", "Viktor Fiktivov"], "geburtsdaten": ["1961-04-12"], "programm": "DEMO"},
	{"id": "DEMO-3", "euRef": "EU.DEMO.3", "typ": "organisation", "namen": ["Schattenhandel Test Holding Ltd"], "geburtsdaten": [], "programm": "DEMO"},
]


class TestSanktionen(unittest.TestCase):
	def test_treffer_auch_bei_tippfehler_und_reihenfolge(self):
		t = k.sanktions_abgleich({"name": "Viktor Fiktiwow", "geburtsdatum": "1961-04-12", "art": "person"}, LISTE)
		self.assertEqual(t[0]["eintragId"], "DEMO-1")
		self.assertEqual(t[0]["geburtsdatum"], "gleich")
		self.assertTrue(k.sanktions_abgleich({"name": "Fiktivow, Viktor", "art": "person"}, LISTE))

	def test_kein_treffer(self):
		self.assertEqual(k.sanktions_abgleich({"name": "Max Mustermann", "geburtsdatum": "1961-04-12", "art": "person"}, LISTE), [])
		self.assertEqual(k.sanktions_abgleich({"name": "Viktor Fischer", "art": "person"}, LISTE), [])

	def test_abweichendes_geburtsdatum_senkt(self):
		mit = k.sanktions_abgleich({"name": "Viktor Fiktivow", "geburtsdatum": "1961-04-12", "art": "person"}, LISTE)[0]["score"]
		ohne = k.sanktions_abgleich({"name": "Viktor Fiktivow", "geburtsdatum": "1990-01-01", "art": "person"}, LISTE)
		self.assertTrue(not ohne or ohne[0]["score"] < mit)

	def test_organisation(self):
		t = k.sanktions_abgleich({"name": "Schattenhandel Test Holding", "art": "organisation"}, LISTE)
		self.assertEqual(t[0]["eintragId"], "DEMO-3")

	def test_prueflinge(self):
		f = {"kontotyp": "unternehmen", "person": {"vorname": "A", "nachname": "B"}, "firma": {"name": "X GmbH"}, "ubos": [{"vorname": "A", "nachname": "B"}], "vertreter": []}
		self.assertEqual([p["rolle"] for p in k.prueflinge_aus_fall(f)], ["Person", "Unternehmen"])  # Dublette entfernt

	def test_eu_xml_und_csv(self):
		xml = '<export xmlns="http://eu.europa.ec/fpi/fsd/export"><sanctionEntity logicalId="13" euReferenceNumber="EU.27.28"><regulation programme="TEST"/><subjectType code="person"/><nameAlias firstName="Ab" lastName="Cd" wholeName="Ab Cd &amp; Söhne"/><birthdate birthdate="1937-04-28" countryIso2Code="IQ"/></sanctionEntity></export>'
		e = k.eu_xml_lesen(xml)[0]
		self.assertEqual((e["id"], e["euRef"], e["typ"], e["namen"], e["geburtsdaten"], e["laender"], e["programm"]), ("13", "EU.27.28", "person", ["Ab Cd & Söhne"], ["1937-04-28"], ["IQ"], "TEST"))
		csv_text = "fileGenerationDate;Entity_LogicalId;Entity_EU_ReferenceNumber;Entity_SubjectType;NameAlias_WholeName;BirthDate_BirthDate\n2026;13;EU.1;person;Ab Cd;1937-04-28\n2026;13;EU.1;person;A. Cd;\n"
		e = k.eu_csv_lesen(csv_text)[0]
		self.assertEqual(e["namen"], ["Ab Cd", "A. Cd"])
		self.assertEqual(e["geburtsdaten"], ["1937-04-28"])
		with self.assertRaises(ValueError):
			k.eu_csv_lesen("a;b\n1;2\n")


class TestRegeln(unittest.TestCase):
	def test_risiko(self):
		self.assertEqual(k.risiko({"kontotyp": "privat", "pep": {"istPep": True}})["stufe"], "hoch")
		self.assertEqual(k.risiko({"kontotyp": "privat", "person": {"staatsangehoerigkeit": "DE", "adresse": {"land": "DE"}}})["stufe"], "niedrig")
		self.assertEqual(k.risiko({"kontotyp": "privat", "person": {"adresse": {"land": "US"}}})["stufe"], "mittel")
		self.assertEqual(k.risiko({"kontotyp": "privat", "person": {"adresse": {"land": "IR"}}})["stufe"], "hoch")
		self.assertEqual(k.risiko({"kontotyp": "unternehmen", "ubos": [{"kontrolleArt": "fiktiv"}]})["stufe"], "mittel")
		self.assertEqual(k.risiko({"kontotyp": "privat", "sanktionen": {"status": "treffer_pruefen"}})["stufe"], "hoch")

	def test_anforderungen_und_fortschritt(self):
		self.assertEqual(k.fortschritt(k.anforderungen(None))["quote"], 0)
		f = {
			"kontotyp": "privat", "pep": {"istPep": False, "naheStehend": False},
			"person": {"vorname": "A", "nachname": "B", "geburtsdatum": "1980-01-01", "geburtsort": "X", "staatsangehoerigkeit": "DE", "adresse": {"strasse": "S 1", "plz": "1", "ort": "O", "land": "DE"}, "ausweis": {"art": "personalausweis", "nummer": "1", "behoerde": "B", "gueltigBis": "2099-01-01"}},
			"dokumente": [{"art": "ausweis_vorne", "status": "neu"}, {"art": "ausweis_hinten", "status": "neu"}],
		}
		self.assertEqual(k.fortschritt(k.anforderungen(f))["quote"], 100)
		fi = k.anforderungen(f, rollen=["investor"])
		self.assertIn("mittelherkunft", [x["id"] for x in k.fortschritt(fi)["fehlend"]])
		f["person"]["ausweis"]["gueltigBis"] = "2000-01-01"
		self.assertIn("ausweis_angaben", [x["id"] for x in k.fortschritt(k.anforderungen(f))["fehlend"]])

	def test_fristen(self):
		self.assertEqual(k.loeschen_ab("2020-06-30"), "2026-01-01")
		self.assertEqual(k.loeschen_ab("2026-12-31", 5), "2032-01-01")
		self.assertEqual(k.monate_spaeter("2026-01-31", 1), "2026-02-28")
		self.assertEqual(k.tage_bis("2026-10-10", "2026-09-30"), 10)

	def test_automat(self):
		self.assertTrue(k.uebergang_erlaubt("offen", "eingereicht", "nutzer"))
		self.assertFalse(k.uebergang_erlaubt("offen", "verifiziert", "compliance"))
		self.assertTrue(k.uebergang_erlaubt("zweitpruefung", "verifiziert", "compliance"))
		self.assertFalse(k.uebergang_erlaubt("in_pruefung", "verifiziert", "nutzer"))

	def test_gating(self):
		e = k.einstellungen_standard()
		self.assertTrue(k.schritt_aktiv("nda", "U-1", e, None))  # Standard: an, für alle
		self.assertFalse(k.schritt_aktiv("nda", "U-1", {**e, "gating": {"nda": False}}, None))
		self.assertFalse(k.schritt_aktiv("nda", "U-1", e, "aus"))
		self.assertTrue(k.schritt_aktiv("nda", "U-1", {**e, "pilotKonten": ["U-1"]}, "pilot"))
		self.assertFalse(k.schritt_aktiv("nda", "U-2", {**e, "pilotKonten": ["U-1"]}, "pilot"))
		self.assertFalse(k.freigabe("loi", {"verifiziert": False})["ok"])
		ok = {"verifiziert": True, "bank": {"geprueft": True}, "eigentum": ["F-1"]}
		self.assertTrue(k.freigabe("auszahlung", ok, flaeche_id="F-1")["ok"])
		r = k.freigabe("auszahlung", ok, flaeche_id="F-2")
		self.assertFalse(r["ok"])
		self.assertIn("Eigentumsnachweis", " ".join(r["gruende"]))
		self.assertFalse(k.freigabe("auszahlung", {"verifiziert": True, "bank": {"geprueft": False}})["ok"])
		self.assertTrue(k.freigabe("nda", {"verifiziert": False}, aktiv=False)["ok"])

	def test_mime(self):
		self.assertEqual(k.mime_aus_bytes(b"%PDF-1.4"), "application/pdf")
		self.assertEqual(k.mime_aus_bytes(b"\x89PNG\r\n\x1a\nxx"), "image/png")
		self.assertEqual(k.mime_aus_bytes(b"MZ\x90"), "")


class TestVerschluesselung(unittest.TestCase):
	def test_format_wie_website(self):
		try:
			import cryptography  # noqa: F401
		except ImportError:  # pragma: no cover
			self.skipTest("cryptography nicht installiert")
		schluessel = bytes(range(32))
		klar = b"%PDF-1.4 KLARTEXT"
		ct = k.verschluesseln(klar, "KD-26-ABCDEF", schluessel=schluessel)
		self.assertEqual(ct[:6], b"OIKYC1")
		self.assertNotIn(b"KLARTEXT", ct)
		self.assertEqual(k.entschluesseln(ct, "KD-26-ABCDEF", schluessel=schluessel), klar)
		with self.assertRaises(Exception):
			k.entschluesseln(ct, "KD-26-ANDERS", schluessel=schluessel)  # AAD = Dokument-ID
		with self.assertRaises(Exception):
			k.entschluesseln(ct[:-1] + bytes([ct[-1] ^ 1]), "KD-26-ABCDEF", schluessel=schluessel)


if __name__ == "__main__":
	unittest.main()
