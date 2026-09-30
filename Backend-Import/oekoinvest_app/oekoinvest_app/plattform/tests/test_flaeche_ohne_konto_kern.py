# Copyright (c) 2026, ÖkoInvest GmbH
# Flächen ohne Eigentümerkonto (Akquise-Übernahme aus den Geodaten: nutzer_id leer) – Hilfsfunktionen der Ansichten dürfen
# weder abstürzen noch ein „erstes“ Konto nachschlagen. Ohne Bench lauffähig (Frappe-Stub):
#   cd Backend-Import/oekoinvest_app && python -m unittest oekoinvest_app.plattform.tests.test_flaeche_ohne_konto_kern
# Mit Bench (echte Datenbank): tests/test_flaeche_ohne_konto.py

import sys
import types
import unittest

try:
	import frappe

	ECHTES_FRAPPE = hasattr(frappe, "whitelist")  # andere Kern-Tests legen evtl. schon einen leeren Stub ab
except ImportError:  # pragma: no cover
	ECHTES_FRAPPE = False


class _Stub(types.ModuleType):
	"""Modul-Stub: jedes unbekannte Attribut ist eine harmlose Funktion (nur für Importe der Hilfsmodule)."""

	def __getattr__(self, name):
		if name.startswith("__"):
			raise AttributeError(name)
		return lambda *a, **k: None


class _Db:
	def __init__(self):
		self.aufrufe = []

	def get_value(self, doctype, name=None, *a, **k):
		self.aufrufe.append((doctype, name))
		if name is None:
			raise AssertionError(f"get_value({doctype!r}, None) – ohne Konto-ID darf nichts nachgeschlagen werden")
		return None

	def exists(self, doctype, name=None, *a, **k):
		self.aufrufe.append((doctype, name))
		if name is None:
			raise AssertionError(f"exists({doctype!r}, None)")
		return None


def _frappe_stub():
	f = _Stub("frappe")
	f.utils = _Stub("frappe.utils")
	f.db = _Db()
	f._dict = dict
	f.PermissionError = type("PermissionError", (Exception,), {})
	f.ValidationError = type("ValidationError", (Exception,), {})
	f.DoesNotExistError = type("DoesNotExistError", (Exception,), {})
	f.has_permission = lambda *a, **k: True
	return f


class Obj(dict):
	"""Minimales Dokument (dict mit Attributzugriff, get())."""

	__getattr__ = dict.get


@unittest.skipIf(ECHTES_FRAPPE, "mit Bench: tests/test_flaeche_ohne_konto.py")
class TestFlaecheOhneKonto(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		cls._alt = {k: sys.modules.get(k) for k in ("frappe", "frappe.utils")}
		st = _frappe_stub()
		sys.modules["frappe"], sys.modules["frappe.utils"] = st, st.utils
		for m in [m for m in sys.modules if m.startswith("oekoinvest_app.plattform.") and not m.startswith("oekoinvest_app.plattform.tests")]:
			del sys.modules[m]  # frisch mit Stub importieren
		from oekoinvest_app.plattform import druck, kern

		cls.frappe, cls.kern, cls.druck = st, kern, druck

	@classmethod
	def tearDownClass(cls):
		for m in [m for m in sys.modules if m.startswith("oekoinvest_app.plattform.") and not m.startswith("oekoinvest_app.plattform.tests")]:
			del sys.modules[m]  # nicht mit dem Stub importierte Module an spätere Tests weitergeben
		for k, m in cls._alt.items():
			if m is None:
				sys.modules.pop(k, None)
			else:
				sys.modules[k] = m

	def setUp(self):
		self.frappe.db.aufrufe.clear()
		self.flaeche = Obj(name="FL-26-AKQ001", nutzer_id=None, organisation_id=None, bezeichnung="Akquise-Ziel Testgemeinde · 12,5 ha")

	def test_besitzer_leer(self):
		self.assertIsNone(self.kern.besitzer("flaeche", self.flaeche))
		self.assertIsNone(self.kern.besitzer("flaeche", Obj(self.flaeche, nutzer_id="")))

	def test_kurz_und_name_ohne_konto(self):
		self.assertIsNone(self.kern.kurz(self.flaeche.nutzer_id))
		self.assertEqual(self.kern.name_von(self.flaeche.nutzer_id), "")
		self.assertEqual(self.kern.name_von(""), "")
		self.assertEqual(self.frappe.db.aufrufe, [])  # kein Nachschlagen mit leerer ID

	def test_druck_konto_platzhalter(self):
		k = self.druck.oekoinvest_konto(self.flaeche.nutzer_id)
		self.assertEqual(k["name"], "–")
		self.assertEqual(k["email"], "")

	def test_eigentum_nie_bei_leerem_besitzer(self):
		# Ein Portal-Nutzer darf eine eigentümerlose Fläche nicht als „eigene“ sehen
		n = Obj(id="KT-26-XYZ123", rollen=["flaeche"])
		self.assertNotEqual(self.kern.besitzer("flaeche", self.flaeche), n.id)


if __name__ == "__main__":
	unittest.main()
