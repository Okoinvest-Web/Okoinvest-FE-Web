# Copyright (c) 2026, ÖkoInvest GmbH
#
# Dokumente, Signatur, Termine, Service & HR – reine Regeln (ohne Datenbank). Läuft ohne Bench:
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_service_rein -v
# Gleiche Fälle wie scripts/plattform-test-service.mjs (Reihenfolge, Code, Hash/Präfix, Slots/Doppelbuchung, Vertretung, SLA, ICS).

import base64
import struct
import unittest
import zlib
from datetime import datetime, timedelta, timezone

from oekoinvest_app.plattform.hr import vertretung as hr
from oekoinvest_app.plattform.service import sla
from oekoinvest_app.plattform.signatur import kern as sk
from oekoinvest_app.plattform.termine import ics as ics_modul
from oekoinvest_app.plattform.termine import slots as sl


def _png(leer=False, w=60, h=20):
	roh = b""
	for y in range(h):
		zeile = b"\x00"
		for x in range(w):
			alpha = 0 if leer or abs(y - 10) > 1 else 255
			zeile += bytes([4, 29, 66, alpha])
		roh += zeile

	def chunk(t, d):
		return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)

	ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
	return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(roh)) + chunk(b"IEND", b"")


class TestSignatur(unittest.TestCase):
	def test_reihenfolge(self):
		liste = [{"position": 1, "status": "offen"}, {"position": 2, "status": "offen"}]
		self.assertEqual(sk.unterzeichner_status("laufend", True, liste, liste[0]), "offen")
		self.assertEqual(sk.unterzeichner_status("laufend", True, liste, liste[1]), "wartet")
		self.assertFalse(sk.darf_jetzt("laufend", True, liste, liste[1]))
		self.assertTrue(sk.darf_jetzt("laufend", False, liste, liste[1]))  # beliebige Reihenfolge
		liste[0]["status"] = "unterschrieben"
		self.assertTrue(sk.darf_jetzt("laufend", True, liste, liste[1]))
		self.assertFalse(sk.darf_jetzt("widerrufen", True, liste, liste[1]))
		liste[1]["status"] = "unterschrieben"
		self.assertTrue(sk.alle_unterschrieben(liste))

	def test_code(self):
		code = sk.neuer_code()
		self.assertRegex(code, r"^\d{6}$")
		h = sk.code_hash("SV-26-AAAAAA", "row1", code)
		self.assertTrue(sk.code_gleich(h, "SV-26-AAAAAA", "row1", f" {code[:3]} {code[3:]} "))
		self.assertFalse(sk.code_gleich(h, "SV-26-AAAAAA", "row2", code))  # anderer Unterzeichner
		self.assertFalse(sk.code_gleich(h, "SV-26-AAAAAA", "row1", "12345"))
		self.assertFalse(sk.code_gleich("", "SV-26-AAAAAA", "row1", code))

	def test_praefix_und_hash(self):
		original = b"%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n"
		signiert = original + b"2 0 obj<<>>endobj\nxref\n..."
		self.assertTrue(sk.ist_pdf(original))
		self.assertTrue(sk.beginnt_mit_original(signiert, original))
		self.assertFalse(sk.beginnt_mit_original(original, original))  # nichts angehängt
		self.assertFalse(sk.beginnt_mit_original(b"%PDF-1.4\nX" + signiert[10:], original))  # verändert
		self.assertNotEqual(sk.sha256(original), sk.sha256(signiert))
		self.assertTrue(sk.ist_verschluesselt(b"%PDF-1.4 ... trailer << /Encrypt 5 0 R >>"))

	def test_bild_und_name(self):
		gut = "data:image/png;base64," + base64.b64encode(_png()).decode()
		leer = "data:image/png;base64," + base64.b64encode(_png(leer=True)).decode()
		self.assertIsNotNone(sk.png_aus_data_url(gut))
		self.assertTrue(sk.png_hat_inhalt(sk.png_aus_data_url(gut)))
		self.assertFalse(sk.png_hat_inhalt(sk.png_aus_data_url(leer)))
		self.assertIsNone(sk.png_aus_data_url("data:image/jpeg;base64,AAAA"))
		self.assertIsNone(sk.png_aus_data_url("data:image/png;base64," + base64.b64encode(b"kein png").decode()))
		self.assertTrue(sk.getippter_name_gueltig("Anna Müller-Lüdenscheidt"))
		self.assertFalse(sk.getippter_name_gueltig("A"))
		self.assertFalse(sk.getippter_name_gueltig("<script>"))

	def test_kennzeichnung(self):
		self.assertIn("Art. 3 Nr. 10", sk.KENNZEICHNUNG)
		self.assertIn("keine qualifizierte", sk.KENNZEICHNUNG.replace("keine fortgeschrittene und keine qualifizierte", "keine qualifizierte"))
		self.assertEqual(sk.ip_maskiert("198.51.100.23"), "198.51.100.x")


class TestSlots(unittest.TestCase):
	JETZT = datetime(2026, 10, 1, 6, 0, tzinfo=timezone.utc)  # Donnerstag 08:00 Wien

	def test_arbeitszeit_und_raster(self):
		s = sl.freie_slots(dauer=60, von_tag="2026-10-05", bis_tag="2026-10-05", jetzt=self.JETZT)  # Montag
		self.assertEqual(s[0]["start"], "2026-10-05T07:00:00.000Z")  # 09:00 Wien (MESZ)
		self.assertTrue(all(sl.aus_iso(x["ende"]) - sl.aus_iso(x["start"]) == timedelta(hours=1) for x in s))
		self.assertFalse(any(x["start"] == "2026-10-05T10:30:00.000Z" for x in s))  # 12:30 Mittagspause

	def test_doppelbuchung_und_puffer(self):
		belegt = [{"start": "2026-10-05T07:00:00.000Z", "ende": "2026-10-05T08:00:00.000Z"}]
		param = {"dauer": 60, "puffer": 30, "belegt": belegt, "jetzt": self.JETZT}
		self.assertFalse(sl.slot_frei("2026-10-05T07:00:00.000Z", **param))  # gleicher Beginn
		self.assertFalse(sl.slot_frei("2026-10-05T08:00:00.000Z", **param))  # Puffer 30 min
		self.assertTrue(sl.slot_frei("2026-10-05T08:30:00.000Z", **param))
		self.assertFalse(sl.slot_frei("2026-10-05T08:15:00.000Z", **param))  # nicht im Raster

	def test_abwesenheit_feiertag_vorlauf(self):
		self.assertEqual(sl.freie_slots(von_tag="2026-10-05", bis_tag="2026-10-05", abwesenheiten=[{"von": "2026-10-05", "bis": "2026-10-09"}], jetzt=self.JETZT), [])
		self.assertEqual(sl.freie_slots(von_tag="2026-10-26", bis_tag="2026-10-26", feiertage=["2026-10-26"], jetzt=self.JETZT), [])
		self.assertEqual(sl.freie_slots(von_tag="2026-10-01", bis_tag="2026-10-01", vorlauf_stunden=48, jetzt=self.JETZT), [])
		self.assertEqual(sl.freie_slots(von_tag="2026-10-03", bis_tag="2026-10-04", jetzt=self.JETZT), [])  # Wochenende

	def test_winterzeit(self):
		s = sl.freie_slots(dauer=30, von_tag="2026-11-02", bis_tag="2026-11-02", jetzt=self.JETZT)
		self.assertEqual(s[0]["start"], "2026-11-02T08:00:00.000Z")  # 09:00 Wien (MEZ)


class TestIcs(unittest.TestCase):
	def test_ics(self):
		t = {"id": "TE-26-ABC123", "art": "beratung_video", "start": "2026-10-05T07:00:00.000Z", "ende": "2026-10-05T07:45:00.000Z", "status": "gebucht", "sequenz": 2, "kanal": "video", "mitarbeiterName": "Anna Akquise (Demo)", "ort": "Online; Video, Link folgt"}
		text = ics_modul.ics_erstellen(t, jetzt=datetime(2026, 10, 1, tzinfo=timezone.utc))
		self.assertTrue(text.startswith("BEGIN:VCALENDAR\r\n"))
		self.assertIn("UID:TE-26-ABC123@termine.oekoinvest", text)
		self.assertIn("DTSTART:20261005T070000Z", text)
		self.assertIn("SEQUENCE:2", text)
		self.assertIn("METHOD:PUBLISH", text)
		self.assertIn("LOCATION:Online\\; Video\\, Link folgt", text)
		self.assertTrue(all(len(z.encode()) <= 75 for z in text.split("\r\n")))
		abgesagt = ics_modul.ics_erstellen({**t, "status": "storniert"}, organisator={"name": "ÖkoInvest", "email": "termine@example.com"})
		self.assertIn("METHOD:CANCEL", abgesagt)
		self.assertIn("STATUS:CANCELLED", abgesagt)


class TestVertretung(unittest.TestCase):
	ABW = [{"mitarbeiterId": "U-A", "von": "2026-10-05", "bis": "2026-10-09", "vertretungId": None, "status": "genehmigt"},
	       {"mitarbeiterId": "U-B", "von": "2026-10-07", "bis": "2026-10-07", "vertretungId": "U-C", "status": "genehmigt"}]
	MA = {"U-A": {"vertretungId": "U-B"}, "U-B": {"vertretungId": "U-A"}, "U-C": {}}

	def test_kette(self):
		self.assertEqual(hr.vertretung_finden("U-A", "2026-10-02", self.ABW, self.MA)["grund"], "anwesend")
		self.assertEqual(hr.vertretung_finden("U-A", "2026-10-06", self.ABW, self.MA)["id"], "U-B")
		r = hr.vertretung_finden("U-A", "2026-10-07", self.ABW, self.MA)  # B ebenfalls abwesend → C
		self.assertEqual((r["id"], r["kette"]), ("U-C", ["U-A", "U-B", "U-C"]))

	def test_zyklus_und_niemand(self):
		ma = {"U-A": {"vertretungId": "U-B"}, "U-B": {"vertretungId": "U-A"}}
		abw = [{"mitarbeiterId": "U-A", "von": "2026-10-05", "bis": "2026-10-05"}, {"mitarbeiterId": "U-B", "von": "2026-10-05", "bis": "2026-10-05"}]
		self.assertIsNone(hr.vertretung_finden("U-A", "2026-10-05", abw, ma))

	def test_auslastung_und_zeiten(self):
		self.assertEqual(hr.auslastung(40, 600, 10, 4, 0)["prozent"], 65)
		self.assertEqual(hr.auslastung(40, 0, 0, 0, 0, abwesende_tage=5)["stundenKapazitaet"], 0)
		s = hr.zeiten_summieren([{"projektId": "P-1", "stunden": 2.5, "taetigkeit": "planung"}, {"projektId": "P-1", "stunden": 1, "taetigkeit": "netz"}, {"erpProjekt": "PROJ-0002", "stunden": 4, "taetigkeit": "akquise"}])
		self.assertEqual(s[0]["stunden"], 4)
		self.assertEqual(s[1]["taetigkeiten"], {"planung": 2.5, "netz": 1})
		self.assertEqual(hr.wissen_treffer({"titel": "NDA prüfen", "inhalt": "Datenraum"}, "nda datenraum"), 4)
		self.assertEqual(hr.wissen_treffer({"titel": "NDA", "inhalt": ""}, "gutachten"), 0)


class TestSla(unittest.TestCase):
	def test_fristen_und_ampel(self):
		r, lo = sla.sla_fristen("hoch", "2026-10-01T08:00:00.000Z")
		self.assertEqual((r, lo), ("2026-10-01T16:00:00.000Z", "2026-10-03T08:00:00.000Z"))
		t = {"prioritaet": "hoch", "status": "neu", "slaReaktionBis": r, "slaLoesungBis": lo}
		self.assertEqual(sla.sla_stand(t, "2026-10-01T09:00:00Z")["ampel"], "ok")
		self.assertEqual(sla.sla_stand(t, "2026-10-01T15:00:00Z")["ampel"], "warn")
		self.assertEqual(sla.sla_stand(t, "2026-10-01T17:00:00Z")["ampel"], "verletzt")
		t["ersteReaktionAm"] = "2026-10-01T10:00:00.000Z"
		self.assertTrue(sla.sla_stand(t, "2026-10-01T17:00:00Z")["reaktion"]["erfuellt"])
		self.assertEqual(sla.sla_stand({**t, "status": "geloest", "geloestAm": "2026-10-02T08:00:00.000Z"}, "2026-10-05T08:00:00Z")["ampel"], "erledigt")
		self.assertEqual(sla.PRIORITAET_AUS_SCHWERE["kritisch"], "kritisch")


if __name__ == "__main__":
	unittest.main()
