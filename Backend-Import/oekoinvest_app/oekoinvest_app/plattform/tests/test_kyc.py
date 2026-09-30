# Copyright (c) 2026, ÖkoInvest GmbH
#
# KYC/KYB über die whitelisted Methoden (Spiegel von scripts/plattform-test-kyc.mjs): Upload-Typen, verschlüsselte
# Ablage, fremder Zugriff, Compliance-Workflow inkl. Vier-Augen, Sanktionstreffer → manuelle Prüfung, Gating bei
# Veröffentlichung/NDA/LOI/Auszahlung, Löschfrist. Nur auf einer Test-Site ausführen (bench run-tests --module …).

import base64

import frappe
from frappe.tests.utils import FrappeTestCase

from oekoinvest_app.plattform import kyc_kern as k
from oekoinvest_app.plattform.api import kyc
from oekoinvest_app.plattform.kyc_aufgaben import einrichten, fristen_laufen
from oekoinvest_app.plattform.tests.testdaten import PDF, aufruf, konto, vorbereiten

PNG = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cfc0f01f0005000201a5b1e0c50000000049454e44ae426082")


def b64(b):
	return base64.b64encode(b).decode()


def person(vorname, nachname, geb="1980-02-03"):
	return {"vorname": vorname, "nachname": nachname, "geburtsdatum": geb, "geburtsort": "Teststadt", "staatsangehoerigkeit": "DE", "adresse": {"strasse": "Testweg 1", "plz": "86842", "ort": "Teststadt", "land": "DE"}, "ausweis": {"art": "personalausweis", "nummer": "T22000129", "behoerde": "Stadt Teststadt", "gueltigBis": "2035-01-01"}}


class TestKyc(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		vorbereiten()
		einrichten()
		cls.comp1 = konto(["admin"], vorname="Compliance")
		cls.comp2 = konto(["admin"], vorname="Zweit")
		cls.leitung = konto(["admin"], vorname="Leitung")
		for c in (cls.comp1, cls.comp2):
			frappe.db.set_value("Plattform Konto", c, "backoffice_rollen", "compliance")
		doc = frappe.get_single(k.DT_EINST)
		doc.einstellungen_json = frappe.as_json({**k.einstellungen_standard(), "geltung": "alle"})  # Tests anderer Module: Standard „aus“
		doc.save(ignore_permissions=True)
		frappe.get_doc({"doctype": k.DT_LISTE, "eintrag_id": f"TEST-{frappe.generate_hash(length=6)}", "typ": "person", "namen": '["Viktor Fiktivow"]', "geburtsdaten": '["1961-04-12"]', "liste_stand": "test"}).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.set_user("Administrator")

	def _privat(self, kid, vorname, nachname, geb="1980-02-03", pep=False):
		aufruf(kyc.speichern, abschnitt="kontotyp", daten={"kontotyp": "privat"}, als_benutzer=kid)
		aufruf(kyc.speichern, abschnitt="person", daten=person(vorname, nachname, geb), als_benutzer=kid)
		aufruf(kyc.dokument_speichern, art="ausweis_vorne", name="vorne.pdf", inhaltBase64=b64(PDF), als_benutzer=kid)
		aufruf(kyc.dokument_speichern, art="ausweis_hinten", name="hinten.png", inhaltBase64=b64(PNG), als_benutzer=kid)
		aufruf(kyc.speichern, abschnitt="pep", daten={"istPep": pep, "naheStehend": False, "funktion": "Landtag (Test)" if pep else ""}, als_benutzer=kid)
		return aufruf(kyc.fall, als_benutzer=kid)["fall"]["id"]

	def _verifizieren(self, fid, pruefer=None):
		pruefer = pruefer or self.comp1
		f = aufruf(kyc.fall_detail, id=fid, als_benutzer=pruefer)
		for d in f["dokumente"]:
			if d["status"] != "ok":
				aufruf(kyc.aktion, id=fid, daten={"aktion": "pruefliste", "dokumentId": d["id"], "punkte": {p: True for p in d["pruefpunkte"]}, "ergebnis": "ok"}, als_benutzer=pruefer)
		return aufruf(kyc.aktion, id=fid, daten={"aktion": "entscheiden", "ergebnis": "verifiziert"}, als_benutzer=pruefer)

	def test_upload_typ_und_verschluesselung(self):
		kid = konto(["investor"])
		aufruf(kyc.speichern, abschnitt="kontotyp", daten={"kontotyp": "privat"}, als_benutzer=kid)
		with self.assertRaises(frappe.ValidationError):
			aufruf(kyc.dokument_speichern, art="ausweis_vorne", name="a.pdf", inhaltBase64=b64(b"nur Text"), als_benutzer=kid)
		meta = aufruf(kyc.dokument_speichern, art="ausweis_vorne", name="a.pdf", inhaltBase64=b64(PDF), als_benutzer=kid)
		d = frappe.get_doc(k.DT_DOK, meta["id"])
		datei = frappe.get_doc("File", d.datei_id)
		self.assertEqual(datei.is_private, 1)
		roh = datei.get_content()
		self.assertEqual(roh[:6], b"OIKYC1")
		self.assertNotIn(b"%PDF", roh)
		self.assertEqual(base64.b64decode(aufruf(kyc.dokument_lesen, id=meta["id"], als_benutzer=kid)["inhaltBase64"]), PDF)
		fremd = konto(["flaeche"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(kyc.dokument_lesen, id=meta["id"], als_benutzer=fremd)
		with self.assertRaises(frappe.PermissionError):
			aufruf(kyc.dokument_lesen, id=meta["id"], als_benutzer=self.leitung)
		self.assertTrue(aufruf(kyc.dokument_lesen, id=meta["id"], als_benutzer=self.comp1)["inhaltBase64"])
		self.assertTrue(frappe.db.exists("Plattform Aktivitaet", {"aktion": "kyc_zugriff_verweigert", "objekt_id": d.fall}))

	def test_iban(self):
		kid = konto(["flaeche"])
		aufruf(kyc.speichern, abschnitt="kontotyp", daten={"kontotyp": "privat"}, als_benutzer=kid)
		with self.assertRaises(frappe.ValidationError):
			aufruf(kyc.speichern, abschnitt="bank", daten={"iban": "DE89370400440532013001", "kontoinhaber": "X"}, als_benutzer=kid)
		r = aufruf(kyc.speichern, abschnitt="bank", daten={"iban": "DE89 3704 0044 0532 0130 00", "kontoinhaber": "Test (Test)"}, als_benutzer=kid)
		self.assertEqual(r["fall"]["bank"]["iban"], "DE89 3704 0044 0532 0130 00")

	def test_workflow_nachforderung_und_verifizierung(self):
		kid = konto(["investor"], vorname="Ines")
		fid = self._privat(kid, "Ines", "Test")
		aufruf(kyc.speichern, abschnitt="mittelherkunft", daten={"ticket": "bis250k", "quellen": ["eigenkapital"]}, als_benutzer=kid)
		aufruf(kyc.einreichen, als_benutzer=kid)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(kyc.speichern, abschnitt="person", daten=person("X", "Y"), als_benutzer=kid)
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(kyc.aktion, id=fid, daten={"aktion": "entscheiden", "ergebnis": "verifiziert"}, als_benutzer=self.comp1)
		aufruf(kyc.aktion, id=fid, daten={"aktion": "entscheiden", "ergebnis": "nachgefordert", "grund": "Bitte Rückseite erneut."}, als_benutzer=self.comp1)
		self.assertEqual(aufruf(kyc.fall, als_benutzer=kid)["fall"]["nachforderung"], "Bitte Rückseite erneut.")
		aufruf(kyc.einreichen, als_benutzer=kid)
		self.assertEqual(self._verifizieren(fid)["status"], "verifiziert")
		self.assertTrue(k.kyc_status(kid)["verifiziert"])
		with self.assertRaises(frappe.PermissionError):
			aufruf(kyc.fall_detail, id=fid, als_benutzer=self.leitung)

	def test_sanktionstreffer_und_vier_augen(self):
		kid = konto(["investor"], vorname="Viktor")
		fid = self._privat(kid, "Viktor", "Fiktivow", geb="1961-04-12")
		aufruf(kyc.speichern, abschnitt="mittelherkunft", daten={"ticket": "bis250k", "quellen": ["eigenkapital"]}, als_benutzer=kid)
		aufruf(kyc.einreichen, als_benutzer=kid)
		self.assertEqual(aufruf(kyc.fall, als_benutzer=kid)["fall"]["status"], "eingereicht")  # kein Hinweis an den Nutzer
		f = aufruf(kyc.fall_detail, id=fid, als_benutzer=self.comp1)
		self.assertEqual(f["sanktionenDetail"]["status"], "treffer_pruefen")
		self.assertEqual(f["risiko"], "hoch")
		with self.assertRaises(frappe.DuplicateEntryError):
			self._verifizieren(fid)
		t = f["sanktionenDetail"]["treffer"][0]
		aufruf(kyc.aktion, id=fid, daten={"aktion": "treffer", "eintragId": t["eintragId"], "prueflingName": t["prueflingName"], "bewertung": "ausgeschlossen", "begruendung": "Namensgleichheit, weitere Merkmale abweichend (Test)."}, als_benutzer=self.comp1)
		self.assertEqual(self._verifizieren(fid)["status"], "zweitpruefung")
		with self.assertRaises(frappe.DuplicateEntryError):
			aufruf(kyc.aktion, id=fid, daten={"aktion": "zweitfreigabe", "ergebnis": "verifiziert"}, als_benutzer=self.comp1)
		self.assertEqual(aufruf(kyc.aktion, id=fid, daten={"aktion": "zweitfreigabe", "ergebnis": "verifiziert"}, als_benutzer=self.comp2)["status"], "verifiziert")

	def test_gating_auszahlung(self):
		kid = konto(["flaeche"], vorname="Frida")
		fl = frappe.get_all("Plattform Flaeche", filters={"nutzer_id": kid}, pluck="name")
		from oekoinvest_app.plattform.tests.testdaten import flaeche_vollstaendig

		fid_flaeche = (fl or [flaeche_vollstaendig(kid)["id"]])[0]
		self.assertFalse(k.kyc_freigabe("auszahlung", kid, flaeche_id=fid_flaeche)["ok"])
		with self.assertRaises(frappe.ValidationError):
			k.kyc_sperre("auszahlung", konto_id=kid, flaeche_id=fid_flaeche)
		fid = self._privat(kid, "Frida", "Test")
		aufruf(kyc.speichern, abschnitt="bank", daten={"iban": "DE89370400440532013000", "kontoinhaber": "Frida Test"}, als_benutzer=kid)
		aufruf(kyc.dokument_speichern, art="eigentumsnachweis", flaecheId=fid_flaeche, name="gb.pdf", inhaltBase64=b64(PDF), als_benutzer=kid)
		aufruf(kyc.einreichen, als_benutzer=kid)
		self._verifizieren(fid)
		self.assertTrue(k.kyc_freigabe("auszahlung", kid, flaeche_id=fid_flaeche)["ok"])
		self.assertFalse(k.kyc_freigabe("auszahlung", kid, flaeche_id="F-26-ZZZZZZ")["ok"])

	def test_loeschfrist(self):
		kid = konto(["flaeche"])
		fid = self._privat(kid, "Lena", "Loesch")
		aufruf(kyc.einreichen, als_benutzer=kid)
		self._verifizieren(fid)
		aufruf(kyc.aktion, id=fid, daten={"aktion": "beziehungEnde", "datum": "2020-06-30"}, als_benutzer=self.comp1)
		self.assertEqual(str(frappe.db.get_value(k.DT_FALL, fid, "loeschen_ab")), "2026-01-01")
		r = fristen_laufen(stichtag="2026-01-02", fall_id=fid)
		self.assertEqual(r["geloescht"], 1)
		self.assertEqual(frappe.db.get_value(k.DT_FALL, fid, "status"), "geloescht")
		self.assertFalse(frappe.get_all(k.DT_DOK, filters={"fall": fid}))

	def test_ergebnis_anhaengen(self):
		kid = konto(["investor"])
		fid = self._privat(kid, "Erik", "Extern")
		r = k.ergebnis_anhaengen(fid, {"quelle": "test-ident", "art": "video_ident", "ergebnis": "ok", "zusammenfassung": "Identität bestätigt (Test)"})
		self.assertEqual(r["fallId"], fid)
		self.assertEqual(aufruf(kyc.fall_detail, id=fid, als_benutzer=self.comp1)["pruefergebnisse"][0]["quelle"], "test-ident")
