# Copyright (c) 2026, ÖkoInvest GmbH
# EDA-Gateway – Tests ohne Netz und ohne Frappe:
#   cd Backend-Import/dienste/eda-gateway && python -m unittest discover -s tests
# Prüft Konfiguration (Pflicht-Zugangsdaten, https), Datei- und Simulator-Adapter, vollständigen Durchlauf gegen einen
# lokalen Frappe-Stub (Ausgang → Senden → Quittung, Eingang → nachricht_eingang, Idempotenz), E-Mail-Aufbau und -Anhänge,
# Retry bei 5xx, kein Klartext von Inhalten oder Token im Log.

import email.policy
import json
import logging
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import adapter as A  # noqa: E402
import gateway as G  # noqa: E402

K = G.kern_laden()
ZP = "AT0030000491000000000000000D00001"
ECID = "AT00300004910RC109417000000000001"


def anmeldung(mid="RC10941720261001080000AAAAAA"):
	return K.nachricht_bauen({"code": "ANFORDERUNG_ECON", "prozesscode": "EC_REQ_ONL", "absender": "RC109417", "empfaenger": "AT003000", "erstellt": "2026-10-01T08:00:00Z", "messageId": mid, "conversationId": "C1", "prozessdatum": "2026-10-01", "daten": {"MeteringPoint": ZP, "CMRequestId": "C1", "ReqDatType": "EnergyCommunityRegistration", "DateFrom": "2026-10-01", "ECID": ECID, "ECPartFact": "100", "EnergyDirection": "CONSUMPTION"}})


class Stub(BaseHTTPRequestHandler):
	ausgang = []
	quittungen = []
	eingaenge = []
	auth = []
	fehler_einmal = []

	def log_message(self, *a):
		pass

	def do_POST(self):  # noqa: N802
		laenge = int(self.headers.get("Content-Length") or 0)
		body = json.loads(self.rfile.read(laenge) or b"{}")
		Stub.auth.append(self.headers.get("Authorization"))
		name = self.path.rsplit(".", 1)[-1]
		if Stub.fehler_einmal:
			Stub.fehler_einmal.pop()
			self.send_response(503)
			self.end_headers()
			return
		d = body.get("daten") or {}
		if name == "ausgang":
			antwort, Stub.ausgang = {"nachrichten": list(Stub.ausgang)}, []
		elif name == "ausgang_quittung":
			Stub.quittungen.append(d)
			antwort = {"ok": True}
		elif name == "nachricht_eingang":
			k = K.nachricht_lesen(d["xml"])["kopf"]
			doppelt = any(K.nachricht_lesen(x)["kopf"]["messageId"] == k["messageId"] for x in Stub.eingaenge)
			Stub.eingaenge.append(d["xml"])
			antwort = {"ok": True, "doppelt": doppelt}
		else:
			antwort = {}
		roh = json.dumps({"message": antwort}).encode()
		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.send_header("Content-Length", str(len(roh)))
		self.end_headers()
		self.wfile.write(roh)


class TestGateway(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Stub)
		threading.Thread(target=cls.server.serve_forever, daemon=True).start()
		cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"

	@classmethod
	def tearDownClass(cls):
		cls.server.shutdown()

	def setUp(self):
		Stub.ausgang, Stub.quittungen, Stub.eingaenge, Stub.auth, Stub.fehler_einmal = [], [], [], [], []
		self.tmp = tempfile.mkdtemp()

	def client(self):
		return G.FrappeClient(self.url, "schluessel", "geheim-123", timeout=5, versuche=2)

	def test_einstellungen(self):
		e = G.einstellungen({"EDA_ADAPTER": "email", "EDA_FRAPPE_URL": "http://x"})
		self.assertTrue(any("https" in f for f in e["fehler"]))
		self.assertTrue(any("API_KEY" in f for f in e["fehler"]))
		e = G.einstellungen({"EDA_ADAPTER": "nix", "EDA_FRAPPE_URL": "https://x", "EDA_FRAPPE_API_KEY": "a", "EDA_FRAPPE_API_SECRET": "b"})
		self.assertEqual(e["fehler"], ["EDA_ADAPTER: email, kep, datei oder simulator"])
		self.assertEqual(G.einstellungen({"EDA_FRAPPE_URL": "https://x", "EDA_FRAPPE_API_KEY": "a", "EDA_FRAPPE_API_SECRET": "b"})["fehler"], [])

	def test_datei_durchlauf_und_idempotenz(self):
		ad = A.DateiAdapter(self.tmp)
		Stub.ausgang = [{"id": "EDN-1", "nachrichtencode": "ANFORDERUNG_ECON", "messageId": "M1", "empfaenger": "AT003000", "rohinhalt": anmeldung()}]
		antwort = K.nachricht_bauen({"code": "ANTWORT_ECON", "prozesscode": "EC_REQ_ONL", "absender": "AT003000", "empfaenger": "RC109417", "erstellt": "2026-10-01T08:05:00Z", "messageId": "AT00300020261001080500X00001", "conversationId": "C1", "prozessdatum": "2026-10-01", "daten": {"MeteringPoint": ZP, "CMRequestId": "C1", "ResponseCode": "99"}})
		for name in ("a.xml", "b.xml"):
			with open(os.path.join(ad.eingang, name), "w", encoding="utf-8") as f:
				f.write(antwort)
		z = G.durchlauf(self.client(), ad)
		self.assertEqual(z["gesendet"], 1)
		self.assertEqual(Stub.quittungen, [{"nachrichtId": "EDN-1", "status": "gesendet"}])
		self.assertTrue(os.path.isfile(os.path.join(ad.ausgang, "M1.xml")))
		self.assertEqual((z["eingang"], z["doppelt"]), (1, 1))
		self.assertEqual(sorted(os.listdir(ad.erledigt)), ["a.xml", "b.xml"])
		self.assertTrue(all(a == "token schluessel:geheim-123" for a in Stub.auth))

	def test_retry_bei_5xx(self):
		Stub.fehler_einmal = [1]
		self.assertEqual(self.client().methode("ausgang"), {"nachrichten": []})

	def test_sendefehler_wird_quittiert(self):
		class Kaputt(A.DateiAdapter):
			def senden(self, n):
				raise OSError("Netz weg")

		Stub.ausgang = [{"id": "EDN-2", "messageId": "M2", "rohinhalt": anmeldung(), "empfaenger": "AT003000"}]
		z = G.durchlauf(self.client(), Kaputt(self.tmp))
		self.assertEqual(z["fehler"], 1)
		self.assertEqual(Stub.quittungen[0]["status"], "fehler")

	def test_simulator(self):
		sim = A.SimulatorAdapter(self.tmp, K, {"EDA_SIM_SEKUNDEN_JE_TAG": "0", "EDA_SIM_SEED": "t"})
		sim.senden({"rohinhalt": anmeldung("RC10941720261001080000SIM001")})
		eingang = sim.empfangen()
		self.assertGreaterEqual(len(eingang), 2)
		codes = [K.nachricht_lesen(x)["kopf"]["nachrichtencode"] for x, _q in eingang]
		self.assertEqual(codes[0], "ANTWORT_ECON")
		self.assertTrue(all(K.nachricht_lesen(x)["ok"] for x, _q in eingang))
		self.assertEqual(sim.empfangen(), [])

	def test_email_aufbau_und_anhaenge(self):
		adressen = os.path.join(self.tmp, "adressen.json")
		with open(adressen, "w", encoding="utf-8") as f:
			json.dump({"AT003000": "eda-test@example.com"}, f)
		ad = A.EmailAdapter({"EDA_SMTP_HOST": "smtp.example.com", "EDA_IMAP_HOST": "imap.example.com", "EDA_EMAIL_BENUTZER": "eg@example.com", "EDA_EMAIL_PASSWORT": "x", "EDA_EMAIL_ADRESSEN": adressen})
		self.assertEqual(ad.pruefen(), [])
		m = ad.nachricht_bauen({"empfaenger": "AT003000", "nachrichtencode": "ANFORDERUNG_ECON", "messageId": "M3", "rohinhalt": anmeldung()})
		self.assertEqual(m["To"], "eda-test@example.com")
		xmls = A.EmailAdapter.anhaenge(m.as_bytes(policy=email.policy.SMTP))
		self.assertEqual(len(xmls), 1)
		self.assertTrue(K.nachricht_lesen(xmls[0])["ok"])
		with self.assertRaises(LookupError):
			ad.nachricht_bauen({"empfaenger": "AT999999", "rohinhalt": "x"})
		self.assertTrue(any("fehlt" in f for f in A.EmailAdapter({}).pruefen()))

	def test_kep_pruefen(self):
		self.assertIn("EDA_KEP_ORDNER fehlt", A.KepAdapter({}).pruefen())
		self.assertTrue(any("https" in f for f in A.KepAdapter({"EDA_KEP_MODUS": "https", "EDA_KEP_URL": "http://x"}).pruefen()))

	def test_log_ohne_inhalte(self):
		ad = A.DateiAdapter(self.tmp)
		Stub.ausgang = [{"id": "EDN-4", "nachrichtencode": "ANFORDERUNG_ECON", "messageId": "M4", "empfaenger": "AT003000", "rohinhalt": anmeldung()}]
		with self.assertLogs("eda-gateway", level=logging.INFO) as log:
			G.durchlauf(self.client(), ad)
		alles = "\n".join(log.output)
		self.assertNotIn(ZP, alles)
		self.assertNotIn("geheim-123", alles)


if __name__ == "__main__":
	unittest.main()
