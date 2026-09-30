# Copyright (c) 2026, ÖkoInvest GmbH
# CAD-Konverter – Tests ohne LibreDWG (Werkzeug wird durch ein kleines Python-Skript ersetzt):
#   cd Backend-Import/dienste/cad-konverter && python -m unittest discover -s tests
# Prüft Token (zeitkonstant, Mindestlänge), Größen-/Kennungsprüfung, Ergebnisprüfung (DXF-Kopf), Fehlercodes und HTTP-Ablauf.

import json
import os
import stat
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import dienst  # noqa: E402

TOKEN = "t" * 40
DXF = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nEOF\n"


class TestReineLogik(unittest.TestCase):
	def test_token(self):
		self.assertTrue(dienst.token_ok(f"Bearer {TOKEN}", TOKEN))
		self.assertFalse(dienst.token_ok(f"Bearer {TOKEN}x", TOKEN))
		self.assertFalse(dienst.token_ok(None, TOKEN))
		with self.assertRaises(SystemExit):
			dienst.einstellungen({"KONVERTER_TOKEN": "kurz"})

	def test_eingabe_pruefung(self):
		e = dienst.einstellungen({"KONVERTER_TOKEN": TOKEN, "KONVERTER_MAX_MB": "1"})
		self.assertEqual(dienst.konvertieren(e, b"", "dxf")[0], 422)
		self.assertEqual(dienst.konvertieren(e, b"MZ....", "dxf")[0], 415)
		self.assertEqual(dienst.konvertieren(e, b"AC1032" + bytes(2 * 1024 * 1024), "dxf")[0], 413)
		self.assertEqual(dienst.konvertieren(e, b"AC1032", "pdf")[0], 400)

	def test_befehle(self):
		e = dienst.einstellungen({"KONVERTER_TOKEN": TOKEN})
		cmd, aus, stdout = dienst.befehl(e, "dxf", "/tmp/ein/plan.dwg", "/tmp/aus")
		self.assertEqual(cmd[:2], ["dwg2dxf", "-y"])
		self.assertFalse(stdout)
		e = dienst.einstellungen({"KONVERTER_TOKEN": TOKEN, "KONVERTER": "oda"})
		cmd, aus, _ = dienst.befehl(e, "dxf", "/tmp/ein/plan.dwg", "/tmp/aus")
		self.assertIn("ACAD2018", cmd)


@unittest.skipIf(os.name != "posix", "Ersatzwerkzeug als Shell-Skript nur unter Linux/macOS")
class TestHttp(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls.bin = tempfile.mkdtemp()
		pfad = os.path.join(cls.bin, "dwg2dxf")
		with open(pfad, "w") as f:
			f.write("#!/bin/sh\n# Ersatz für LibreDWG: schreibt eine minimale DXF an -o\nwhile [ $# -gt 0 ]; do if [ \"$1\" = \"-o\" ]; then shift; printf '" + DXF.replace("\n", "\\n") + "' > \"$1\"; fi; shift; done\n")
		os.chmod(pfad, os.stat(pfad).st_mode | stat.S_IEXEC)
		os.environ["PATH"] = cls.bin + os.pathsep + os.environ.get("PATH", "")
		e = dienst.einstellungen({"KONVERTER_TOKEN": TOKEN, "KONVERTER_PORT": "0"})
		cls.server = dienst.ThreadingHTTPServer(("127.0.0.1", 0), dienst.handler_klasse(e))
		cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"
		threading.Thread(target=cls.server.serve_forever, daemon=True).start()

	@classmethod
	def tearDownClass(cls):
		cls.server.shutdown()

	def post(self, daten, token=TOKEN):
		req = urllib.request.Request(f"{self.url}/v1/konvertieren?ziel=dxf", data=daten, method="POST", headers={"Authorization": f"Bearer {token}", "Content-Type": "application/octet-stream"})
		try:
			with urllib.request.urlopen(req, timeout=20) as r:
				return r.status, r.read()
		except urllib.error.HTTPError as x:
			return x.code, x.read()

	def test_ablauf(self):
		self.assertEqual(self.post(b"AC1032" + bytes(100), token="falsch")[0], 401)
		self.assertEqual(self.post(b"kein dwg")[0], 415)
		status, rumpf = self.post(b"AC1032" + bytes(100))
		self.assertEqual(status, 200)
		self.assertTrue(rumpf.startswith(b"0\nSECTION"))
		with urllib.request.urlopen(f"{self.url}/gesund", timeout=5) as r:
			self.assertTrue(json.loads(r.read())["ok"])


if __name__ == "__main__":
	unittest.main()
