#!/usr/bin/env python3
# Copyright (c) 2026, ÖkoInvest GmbH
#
# Konsistenzprüfer für Backend-Import/ (Frappe-App oekoinvest_app) – läuft OHNE Frappe/Bench.
#
#   python Backend-Import/werkzeuge/pruefen.py            # vollständiger Bericht, Exit-Code 1 bei Fehlern
#   python Backend-Import/werkzeuge/pruefen.py --kurz     # nur Fehler + Zusammenfassung
#   python Backend-Import/werkzeuge/pruefen.py --streng   # Warnungen zählen als Fehler
#
# Geprüft wird u. a.:
#   Python      py_compile aller .py-Dateien; kein allow_guest; Controller-Klassen je DocType
#   DocTypes    JSON, Modul, Ordner = scrub(Name), field_order vollständig, doppelte Felder, Link-/Table-Ziele,
#               Dynamic Link, title/search/sort-Felder, Select-Standardwerte, fetch_from, Rechte (Rollen existieren,
#               Website-/API-Rollen ohne DocPerm), Abgleich mit der Desk-Rechte-Matrix (werkzeuge/desk_rechte.py)
#   hooks.py    alle Pfade (after_install/migrate, scheduler_events, doc_events, jinja, override_*, doctype_js …)
#               zeigen auf existierende Funktionen/Klassen/Dateien (per AST); required_apps nur frappe
#   Fixtures    Rollen, Rollenprofile, Workflows (inaktiv!), Number Cards, Dashboard Charts, Notifications,
#               E-Mail-Vorlagen, Briefkopf, Custom Fields – Verweise auf DocTypes, Felder, Rollen, Jinja-Syntax
#   Workspaces  Links, Shortcuts, Karten, Charts, Inhaltsblöcke, Rollen
#   Berichte    Ordner, JSON, execute(), JS-Filter, Rollen mit Leserecht auf ref_doctype
#   Druck       Ordner = scrub(Name), HTML-Datei = JSON-HTML, CSS aktuell, Jinja-Syntax, registrierte Jinja-Methoden
#   Sonstiges   patches.txt, modules.txt, translations/de.csv, Mail-Templates, pyproject.toml, site_config-Beispiel
#
# Jinja-Syntax wird mit jinja2 geprüft, falls installiert (pip install jinja2 – z. B. in einen eigenen Ordner und
# PYTHONPATH setzen); sonst einfache Blockprüfung.

import ast
import csv
import io
import json
import os
import py_compile
import re
import shutil
import subprocess
import sys
import tempfile

HIER = os.path.dirname(os.path.abspath(__file__))
BASIS = os.path.normpath(os.path.join(HIER, ".."))
APP_REPO = os.path.join(BASIS, "oekoinvest_app")
APP = os.path.join(APP_REPO, "oekoinvest_app")
APP_NAME = "oekoinvest_app"
sys.path.insert(0, HIER)

try:
	import jinja2  # noqa: F401
	from jinja2 import meta as jinja_meta
	from jinja2.sandbox import SandboxedEnvironment

	JINJA = SandboxedEnvironment(extensions=["jinja2.ext.do", "jinja2.ext.loopcontrols"])
except ImportError:  # pragma: no cover
	JINJA = None

FEHLER, WARNUNGEN = [], []


def fehler(bereich, text):
	FEHLER.append(f"[{bereich}] {text}")


def warnung(bereich, text):
	WARNUNGEN.append(f"[{bereich}] {text}")


def rel(pfad):
	return os.path.relpath(pfad, BASIS).replace("\\", "/")


def scrub(name):
	return name.replace(" ", "_").replace("-", "_").lower()


def json_laden(pfad, bereich="JSON"):
	try:
		with open(pfad, encoding="utf-8") as f:
			return json.load(f)
	except Exception as e:
		fehler(bereich, f"{rel(pfad)}: nicht lesbar ({e})")
		return None


# ---------------------------------------------------------------------------------------------------- Stammlisten
STANDARD_FELDER = {"name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype", "_user_tags", "_comments", "_assign", "_liked_by", "_seen"}

FRAPPE_DOCTYPES = {
	"User", "Role", "Role Profile", "Has Role", "DocType", "DocField", "DocPerm", "Custom DocPerm", "Module Def", "File", "Currency", "Country",
	"Contact", "Address", "Communication", "Comment", "ToDo", "Note", "Event", "Email Account", "Email Template", "Email Queue", "Notification",
	"Letter Head", "Print Format", "Print Settings", "System Settings", "Website Settings", "Portal Settings", "Log Settings", "Error Log",
	"Access Log", "Activity Log", "Deleted Document", "Version", "Scheduled Job Type", "Scheduled Job Log", "Workflow", "Workflow State",
	"Workflow Action Master", "Workflow Action", "Report", "Page", "Workspace", "Number Card", "Dashboard Chart", "Dashboard", "Language",
	"Gender", "Salutation", "Tag", "Custom Field", "Property Setter", "Client Script", "Server Script", "Web Form", "Web Page", "Blog Post",
	"User Permission", "Session Default Settings", "Integration Request", "OAuth Client", "Webhook", "Route History", "Energy Point Log",
	"Data Import", "Data Export", "Prepared Report", "Document Naming Rule", "Auto Repeat", "Assignment Rule", "Kanban Board", "Calendar View",
	"Google Calendar", "Google Contacts", "Newsletter", "Email Group", "Unhandled Email", "Dynamic Link", "Translation", "Domain",
}
ERPNEXT_HRMS_DOCTYPES = {
	"Company", "Customer", "Supplier", "Item", "Sales Invoice", "Purchase Invoice", "Payment Entry", "Journal Entry", "Subscription",
	"Subscription Plan", "Project", "Task", "Timesheet", "Asset", "Asset Category", "Cost Center", "Account", "Mode of Payment", "Bank Account",
	"Employee", "Department", "Designation", "Holiday List", "Leave Application", "Leave Type", "Attendance", "Expense Claim", "Salary Slip",
	"Lead", "Opportunity", "Quotation", "Sales Order", "Purchase Order", "Price List", "UOM", "Warehouse", "Territory", "Customer Group",
	"Supplier Group", "Sales Person", "Fiscal Year", "Payment Terms Template", "Tax Category", "Sales Taxes and Charges Template",
	"Drive File", "Drive Entity", "HD Ticket", "HD Team", "HD Agent", "HD Customer", "Insights Dashboard",
}
STANDARD_ROLLEN = {"System Manager", "Administrator", "Guest", "All", "Desk User", "Website Manager", "Workspace Manager", "Report Manager", "Script Manager", "Prepared Report User", "Dashboard Manager", "Inbox User", "Newsletter Manager"}
LINK_TYPEN = {"Link", "Table", "Table MultiSelect"}
LAYOUT_TYPEN = {"Section Break", "Column Break", "Tab Break", "HTML", "Button", "Fold", "Heading"}
# Jinja-Namen, die Frappe im Druck/Mail/Benachrichtigungs-Kontext bereitstellt
JINJA_KONTEXT = {"doc", "frappe", "_", "letter_head", "footer", "no_letterhead", "print_settings", "layout", "meta", "title", "lang", "alert", "comments", "nowdate", "trigger_print", "format", "len", "range", "dict", "json", "loop", "super"}


# ---------------------------------------------------------------------------------------------------- AST-Hilfen
_AST_CACHE = {}


def modul_datei(modulpfad):
	teile = modulpfad.split(".")
	if teile[0] != APP_NAME:
		return None
	pfad = os.path.join(APP_REPO, *teile)
	if os.path.isfile(pfad + ".py"):
		return pfad + ".py"
	if os.path.isfile(os.path.join(pfad, "__init__.py")):
		return os.path.join(pfad, "__init__.py")
	return None


def ast_von(datei):
	if datei not in _AST_CACHE:
		try:
			with open(datei, encoding="utf-8") as f:
				_AST_CACHE[datei] = ast.parse(f.read(), datei)
		except Exception:
			_AST_CACHE[datei] = None
	return _AST_CACHE[datei]


def definiert(datei, name, art=("def", "class")):
	baum = ast_von(datei)
	if not baum:
		return False
	for knoten in baum.body:
		if "def" in art and isinstance(knoten, (ast.FunctionDef, ast.AsyncFunctionDef)) and knoten.name == name:
			return True
		if "class" in art and isinstance(knoten, ast.ClassDef) and knoten.name == name:
			return True
		if "var" in art and isinstance(knoten, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in knoten.targets):
			return True
		if isinstance(knoten, (ast.Import, ast.ImportFrom)) and any((a.asname or a.name.split(".")[-1]) == name for a in knoten.names):
			return True  # re-exportiert
	return False


def pfad_pruefen(bereich, dotted, art=("def",)):
	"""oekoinvest_app.x.y.funktion → Datei + Definition vorhanden?"""
	if not isinstance(dotted, str) or "." not in dotted:
		fehler(bereich, f"ungültiger Pfad {dotted!r}")
		return False
	if not dotted.startswith(APP_NAME + "."):
		if dotted.startswith("frappe."):
			return True
		warnung(bereich, f"Pfad außerhalb der App (nicht geprüft): {dotted}")
		return True
	modul, _, name = dotted.rpartition(".")
	datei = modul_datei(modul)
	if not datei:
		fehler(bereich, f"{dotted}: Modul {modul} nicht gefunden")
		return False
	if not definiert(datei, name, art):
		fehler(bereich, f"{dotted}: {name} ist in {rel(datei)} nicht definiert")
		return False
	return True


# ---------------------------------------------------------------------------------------------------- Jinja
def jinja_pruefen(bereich, quelle, bekannte_methoden, pflicht_registriert=True):
	if not quelle:
		return
	if JINJA:
		try:
			baum = JINJA.parse(quelle)
		except Exception as e:
			fehler(bereich, f"Jinja-Syntax: {e}")
			return
		for name in jinja_meta.find_undeclared_variables(baum):
			if name.startswith("oekoinvest_") and pflicht_registriert and name not in bekannte_methoden:
				fehler(bereich, f"Jinja-Methode {name} ist nicht in hooks.jinja registriert")
		return
	# einfache Blockprüfung ohne jinja2
	for auf, zu in (("if", "endif"), ("for", "endfor"), ("block", "endblock"), ("macro", "endmacro")):
		a = len(re.findall(r"{%-?\s*" + auf + r"\b", quelle))
		z = len(re.findall(r"{%-?\s*" + zu + r"\b", quelle))
		if a != z:
			fehler(bereich, f"Jinja: {a}× {auf}, {z}× {zu}")
	if quelle.count("{{") != quelle.count("}}"):
		fehler(bereich, "Jinja: {{ und }} nicht ausgeglichen")
	for name in set(re.findall(r"\b(oekoinvest_[a-z_]+)\s*\(", quelle)):
		if pflicht_registriert and name not in bekannte_methoden:
			fehler(bereich, f"Jinja-Methode {name} ist nicht in hooks.jinja registriert")


# ---------------------------------------------------------------------------------------------------- 1. Python
def python_pruefen():
	ziel = tempfile.mkdtemp(prefix="oi_pruefen_")
	anzahl = 0
	for wurzel, ordner, dateien in os.walk(BASIS):
		ordner[:] = [o for o in ordner if o not in ("node_modules", "__pycache__", ".git")]
		for d in dateien:
			if not d.endswith(".py"):
				continue
			pfad = os.path.join(wurzel, d)
			anzahl += 1
			try:
				py_compile.compile(pfad, cfile=os.path.join(ziel, f"{anzahl}.pyc"), doraise=True)
			except py_compile.PyCompileError as e:
				fehler("Python", f"{rel(pfad)}: {e.msg.strip().splitlines()[-1]}")
				continue
			if pfad.startswith(APP):
				with open(pfad, encoding="utf-8") as f:
					inhalt = f.read()
				if re.search(r"allow_guest\s*=\s*True", inhalt):
					fehler("Sicherheit", f"{rel(pfad)}: allow_guest=True ist nicht erlaubt (nur API-Benutzer)")
	shutil.rmtree(ziel, ignore_errors=True)
	return anzahl


# ---------------------------------------------------------------------------------------------------- 2. hooks.py
def hooks_laden():
	pfad = os.path.join(APP, "hooks.py")
	ns = {}
	try:
		with open(pfad, encoding="utf-8") as f:
			code = f.read()
		baum = ast.parse(code)
		for knoten in ast.walk(baum):
			if isinstance(knoten, (ast.Import, ast.ImportFrom)):
				warnung("hooks", "hooks.py importiert Module – Prüfung führt sie nicht aus")
				return {}
		exec(compile(baum, pfad, "exec"), {"__builtins__": {}}, ns)  # nur Literale und Namen, keine Importe
	except Exception as e:
		fehler("hooks", f"hooks.py nicht auswertbar: {e}")
	return ns


def hooks_pruefen(h, doctypes):
	if h.get("app_name") != APP_NAME:
		fehler("hooks", "app_name muss oekoinvest_app sein")
	fremd = [a for a in h.get("required_apps") or [] if a != "frappe"]
	if fremd:
		fehler("hooks", f"required_apps darf nur frappe enthalten (optional: {', '.join(fremd)})")
	for schluessel in ("before_install", "after_install", "after_sync", "before_migrate", "after_migrate", "before_uninstall", "after_uninstall",
	                   "boot_session", "on_session_creation", "on_login", "on_logout", "before_request", "after_request"):
		werte = h.get(schluessel)
		for w in ([werte] if isinstance(werte, str) else werte or []):
			pfad_pruefen(f"hooks.{schluessel}", w)
	for zeit, liste in (h.get("scheduler_events") or {}).items():
		if zeit == "cron":
			for ausdruck, pfade in liste.items():
				for p in pfade:
					pfad_pruefen(f"hooks.scheduler_events.cron[{ausdruck}]", p)
			continue
		if zeit not in ("all", "hourly", "daily", "weekly", "monthly", "yearly", "annual", "hourly_long", "daily_long", "weekly_long", "monthly_long"):
			fehler("hooks", f"scheduler_events: unbekanntes Intervall {zeit}")
		for p in liste:
			pfad_pruefen(f"hooks.scheduler_events.{zeit}", p)
	for dt, ereignisse in (h.get("doc_events") or {}).items():
		if dt != "*" and dt not in doctypes and dt not in FRAPPE_DOCTYPES and dt not in ERPNEXT_HRMS_DOCTYPES:
			fehler("hooks", f"doc_events: DocType {dt} unbekannt")
		elif dt in ERPNEXT_HRMS_DOCTYPES:
			warnung("hooks", f"doc_events auf {dt} (optionale App) – Handler muss prüfen, ob die App installiert und eingeschaltet ist")
		for ereignis, pfade in ereignisse.items():
			for p in [pfade] if isinstance(pfade, str) else pfade:
				pfad_pruefen(f"hooks.doc_events.{dt}.{ereignis}", p)
	for schluessel in ("override_whitelisted_methods", "permission_query_conditions", "has_permission", "standard_queries", "override_doctype_dashboards"):
		for _k, p in (h.get(schluessel) or {}).items():
			pfad_pruefen(f"hooks.{schluessel}", p)
	for dt, p in (h.get("override_doctype_class") or {}).items():
		pfad_pruefen("hooks.override_doctype_class", p, ("class",))
	jinja = h.get("jinja") or {}
	methoden = set()
	for p in jinja.get("methods") or []:
		if pfad_pruefen("hooks.jinja.methods", p):
			methoden.add(p.rpartition(".")[2])
	for p in jinja.get("filters") or []:
		pfad_pruefen("hooks.jinja.filters", p)
	for schluessel in ("doctype_js", "doctype_list_js", "doctype_tree_js", "doctype_calendar_js"):
		for dt, dateien in (h.get(schluessel) or {}).items():
			if dt not in doctypes and dt not in FRAPPE_DOCTYPES:
				fehler("hooks", f"{schluessel}: DocType {dt} unbekannt")
			for d in [dateien] if isinstance(dateien, str) else dateien:
				if not os.path.isfile(os.path.join(APP, d)):
					fehler("hooks", f"{schluessel}[{dt}]: Datei {d} fehlt")
	for schluessel in ("app_include_js", "app_include_css", "web_include_js", "web_include_css"):
		for d in [h.get(schluessel)] if isinstance(h.get(schluessel), str) else h.get(schluessel) or []:
			if d and not d.startswith("http"):
				kandidat = d.replace(f"/assets/{APP_NAME}/", "public/")
				if not os.path.isfile(os.path.join(APP, kandidat)) and not d.endswith(".bundle.js") and not d.endswith(".bundle.css"):
					fehler("hooks", f"{schluessel}: {d} nicht gefunden")
	bekannte_dt = {"Role", "Role Profile", "Letter Head", "Email Template", "Notification", "Workflow State", "Workflow Action Master", "Workflow",
	               "Number Card", "Dashboard Chart", "Custom Field", "Property Setter", "Print Format", "Client Script", "Server Script", "Web Form",
	               "Report", "Workspace", "Translation", "Module Profile", "Portal Menu Item", "Website Route Redirect"} | set(doctypes)
	for fx in h.get("fixtures") or []:
		dt = fx if isinstance(fx, str) else fx.get("dt") or fx.get("doctype")
		if dt not in bekannte_dt:
			fehler("hooks", f"fixtures: DocType {dt} unbekannt")
	return methoden


# ---------------------------------------------------------------------------------------------------- 3. DocTypes
def doctypes_laden():
	doctypes = {}
	for wurzel, _o, dateien in os.walk(APP):
		if os.path.basename(os.path.dirname(wurzel)) != "doctype":
			continue
		ordner = os.path.basename(wurzel)
		pfad = os.path.join(wurzel, ordner + ".json")
		if not os.path.isfile(pfad):
			if any(d.endswith(".py") and d != "__init__.py" for d in dateien):
				fehler("DocType", f"{rel(wurzel)}: JSON {ordner}.json fehlt")
			continue
		d = json_laden(pfad, "DocType")
		if not d:
			continue
		if d.get("doctype") != "DocType":
			fehler("DocType", f"{rel(pfad)}: doctype ist nicht „DocType“")
			continue
		d["_pfad"] = pfad
		if d["name"] in doctypes:
			fehler("DocType", f"{d['name']} doppelt definiert")
		doctypes[d["name"]] = d
	return doctypes


def doctypes_pruefen(doctypes, rollen, module):
	import desk_rechte

	for name, d in sorted(doctypes.items()):
		pfad = d["_pfad"]
		bereich = f"DocType {name}"
		ordner = os.path.dirname(pfad)
		if os.path.basename(ordner) != scrub(name):
			fehler(bereich, f"Ordner {os.path.basename(ordner)} ≠ scrub(Name) {scrub(name)}")
		if d.get("module") not in module:
			fehler(bereich, f"Modul {d.get('module')!r} nicht in modules.txt")
		if not os.path.isfile(os.path.join(ordner, "__init__.py")):
			fehler(bereich, "__init__.py im DocType-Ordner fehlt")
		controller = os.path.join(ordner, scrub(name) + ".py")
		klasse = name.replace(" ", "").replace("-", "")
		if not os.path.isfile(controller):
			fehler(bereich, f"Controller {scrub(name)}.py fehlt")
		elif not definiert(controller, klasse, ("class",)):
			fehler(bereich, f"Controller-Klasse {klasse} fehlt in {scrub(name)}.py")
		felder = d.get("fields") or []
		namen = [f.get("fieldname") for f in felder]
		doppelt = {n for n in namen if namen.count(n) > 1}
		if doppelt:
			fehler(bereich, f"doppelte Felder: {', '.join(sorted(doppelt))}")
		if any(not n for n in namen):
			fehler(bereich, "Feld ohne fieldname")
		fo = d.get("field_order")
		if fo is None:
			warnung(bereich, "field_order fehlt")
		elif fo != namen:
			fehlt = [n for n in namen if n not in fo]
			zuviel = [n for n in fo if n not in namen]
			if fehlt or zuviel:
				fehler(bereich, f"field_order unvollständig (fehlt: {fehlt}, überzählig: {zuviel})")
			else:
				warnung(bereich, "field_order in anderer Reihenfolge als fields")
		feldtyp = {f.get("fieldname"): f for f in felder}
		for f in felder:
			fn, ft, opt = f.get("fieldname"), f.get("fieldtype"), (f.get("options") or "").strip()
			if ft in LINK_TYPEN:
				if not opt:
					fehler(bereich, f"{fn}: {ft} ohne Ziel")
				elif opt in doctypes:
					if ft != "Link" and not doctypes[opt].get("istable"):
						fehler(bereich, f"{fn}: {ft}-Ziel {opt} ist keine Kindtabelle")
					if ft == "Link" and doctypes[opt].get("istable"):
						fehler(bereich, f"{fn}: Link auf Kindtabelle {opt}")
				elif opt in ERPNEXT_HRMS_DOCTYPES:
					warnung(bereich, f"{fn}: Link auf {opt} (optionale App) – ohne ERPNext/HRMS nicht nutzbar, harte Abhängigkeit vermeiden")
				elif opt not in FRAPPE_DOCTYPES:
					fehler(bereich, f"{fn}: Ziel-DocType {opt} unbekannt")
			if ft == "Dynamic Link":
				quelle = feldtyp.get(opt)
				if not quelle:
					fehler(bereich, f"{fn}: Dynamic Link verweist auf fehlendes Feld {opt!r}")
				elif quelle.get("fieldtype") not in ("Link", "Select", "Data", "Autocomplete"):
					fehler(bereich, f"{fn}: Dynamic-Link-Quelle {opt} hat Typ {quelle.get('fieldtype')}")
			if ft == "Select" and f.get("default") not in (None, ""):
				if str(f["default"]) not in opt.split("\n"):
					fehler(bereich, f"{fn}: Standardwert {f['default']!r} nicht in den Optionen")
			if f.get("fetch_from"):
				quelle = str(f["fetch_from"]).split(".")[0]
				if quelle not in feldtyp:
					fehler(bereich, f"{fn}: fetch_from-Quelle {quelle} fehlt")
		for schluessel in ("title_field", "image_field", "timeline_field", "sender_field", "subject_field"):
			if d.get(schluessel) and d[schluessel] not in feldtyp and d[schluessel] not in STANDARD_FELDER:
				fehler(bereich, f"{schluessel} {d[schluessel]!r} ist kein Feld")
		if d.get("sort_field") and d["sort_field"] not in feldtyp and d["sort_field"] not in STANDARD_FELDER:
			fehler(bereich, f"sort_field {d['sort_field']!r} ist kein Feld")
		for s in (d.get("search_fields") or "").split(","):
			s = s.strip()
			if s and s not in feldtyp and s not in STANDARD_FELDER:
				fehler(bereich, f"search_fields: {s!r} ist kein Feld")
		for p in d.get("permissions") or []:
			rolle = p.get("role")
			if rolle not in rollen and rolle not in STANDARD_ROLLEN:
				fehler(bereich, f"Rechte für unbekannte Rolle {rolle!r}")
			if rolle in desk_rechte.OHNE_DOCPERM and any(p.get(k) for k in ("read", "write", "create", "delete", "report", "export", "print")):
				fehler(bereich, f"Rolle {rolle!r} darf keine DocPerm haben (Zugriff nur über die API-Methoden)")
		if not d.get("istable") and not d.get("permissions"):
			warnung(bereich, "keine Rechte definiert (nur Administrator sieht den DocType)")
		soll = desk_rechte.soll_rechte(d)
		if soll is None and not d.get("istable"):
			warnung(bereich, "nicht in der Desk-Rechte-Matrix (werkzeuge/desk_rechte.py) – Rechte bitte dort ergänzen")
		elif soll is not None:
			norm = lambda liste: sorted(json.dumps({k: v for k, v in p.items() if k in desk_rechte.SCHLUESSEL + ["role"]}, sort_keys=True) for p in liste)  # noqa: E731
			if norm(soll) != norm(d.get("permissions") or []):
				warnung(bereich, "Rechte weichen von der Matrix ab – python Backend-Import/werkzeuge/desk_rechte.py --anwenden")


def lese_recht(doctypes, dt, rolle, art="read"):
	d = doctypes.get(dt)
	if not d:
		return rolle in ("System Manager", "Administrator")
	return any(p.get("role") == rolle and p.get(art) for p in d.get("permissions") or [])


# ---------------------------------------------------------------------------------------------------- 4. Fixtures
def fixtures_pruefen(doctypes, rollen_aus_fixture, hooks, methoden, felder_von):
	ordner = os.path.join(APP, "fixtures")
	daten = {}
	if not os.path.isdir(ordner):
		return daten
	for datei in sorted(os.listdir(ordner)):
		if not datei.endswith(".json"):
			continue
		inhalt = json_laden(os.path.join(ordner, datei), "Fixtures")
		if inhalt is None:
			continue
		if not isinstance(inhalt, list):
			fehler("Fixtures", f"{datei}: Liste erwartet")
			continue
		for eintrag in inhalt:
			dt = eintrag.get("doctype")
			if not dt or not eintrag.get("name"):
				fehler("Fixtures", f"{datei}: Eintrag ohne doctype/name")
				continue
			daten.setdefault(dt, []).append(eintrag)
	alle_rollen = rollen_aus_fixture | STANDARD_ROLLEN

	def dt_da(bereich, dt):
		if dt in doctypes or dt in FRAPPE_DOCTYPES:
			return True
		if dt in ERPNEXT_HRMS_DOCTYPES:
			warnung(bereich, f"bezieht sich auf {dt} (optionale App) – Import scheitert ohne diese App")
			return False
		fehler(bereich, f"DocType {dt!r} unbekannt")
		return False

	def feld_da(bereich, dt, feld):
		if not feld or dt not in doctypes:
			return
		if feld not in felder_von(dt) and feld not in STANDARD_FELDER:
			fehler(bereich, f"Feld {dt}.{feld} existiert nicht")

	def filter_pruefen(bereich, dt, roh):
		try:
			liste = json.loads(roh or "[]")
		except ValueError:
			fehler(bereich, "filters_json ist kein JSON")
			return
		for f in liste:
			if isinstance(f, list) and len(f) >= 3:
				feld_da(bereich, f[0] if f[0] in doctypes else dt, f[1])

	# Rollen / Profile
	hooks_rollen = set(hooks.get("ROLLEN_FIXTURES") or [])
	for r in daten.get("Role", []):
		if hooks_rollen and r["name"] not in hooks_rollen:
			warnung("Fixtures Role", f"{r['name']} fehlt im Export-Filter hooks.ROLLEN_FIXTURES")
		if r["name"].startswith("ÖkoInvest") and r.get("desk_access") and not r.get("two_factor_auth"):
			fehler("Fixtures Role", f"Desk-Rolle {r['name']} ohne two_factor_auth")
		if r["name"].startswith("Plattform ") and r.get("desk_access"):
			fehler("Fixtures Role", f"Website-Rolle {r['name']} darf keinen Desk-Zugang haben")
	for r in hooks_rollen - {x["name"] for x in daten.get("Role", [])}:
		fehler("Fixtures Role", f"{r} steht in hooks.ROLLEN_FIXTURES, fehlt aber in fixtures/role.json")
	for p in daten.get("Role Profile", []):
		for r in p.get("roles") or []:
			if r.get("role") not in alle_rollen:
				fehler(f"Rollenprofil {p['name']}", f"Rolle {r.get('role')!r} unbekannt")
	# Workflows
	zustaende = {w["name"] for w in daten.get("Workflow State", [])}
	aktionen = {w["name"] for w in daten.get("Workflow Action Master", [])}
	for w in daten.get("Workflow", []):
		b = f"Workflow {w['name']}"
		if w.get("is_active"):
			fehler(b, "Workflows müssen inaktiv bleiben (API-Aufrufe im Namen der Website-Nutzer würden blockiert) – Desk-Statuswechsel über plattform/desk.py")
		dt = w.get("document_type")
		if not dt_da(b, dt):
			continue
		feld_da(b, dt, w.get("workflow_state_field"))
		states = {s.get("state") for s in w.get("states") or []}
		for s in states:
			if s not in zustaende:
				fehler(b, f"Zustand {s!r} fehlt in fixtures/workflow_state.json")
		sf = next((f for f in doctypes.get(dt, {}).get("fields", []) if f.get("fieldname") == w.get("workflow_state_field")), None)
		if sf and sf.get("fieldtype") == "Select":
			optionen = set((sf.get("options") or "").split("\n"))
			for s in states - optionen:
				fehler(b, f"Zustand {s!r} ist keine Option von {dt}.{sf['fieldname']}")
		for s in w.get("states") or []:
			if s.get("allow_edit") and s["allow_edit"] not in alle_rollen:
				fehler(b, f"allow_edit-Rolle {s['allow_edit']!r} unbekannt")
		for t in w.get("transitions") or []:
			if t.get("state") not in states or t.get("next_state") not in states:
				fehler(b, f"Übergang {t.get('state')} → {t.get('next_state')} mit unbekanntem Zustand")
			if t.get("action") not in aktionen:
				fehler(b, f"Aktion {t.get('action')!r} fehlt in fixtures/workflow_action_master.json")
			if t.get("allowed") not in alle_rollen:
				fehler(b, f"Rolle {t.get('allowed')!r} unbekannt")
	# Number Cards
	for c in daten.get("Number Card", []):
		b = f"Number Card {c['name']}"
		if c.get("is_standard"):
			fehler(b, "Fixture-Karten mit is_standard=0 anlegen (Standard-Karten sind außerhalb des Developer-Modus nicht speicherbar)")
		if c.get("type", "Document Type") == "Document Type":
			if dt_da(b, c.get("document_type")):
				if c.get("function") not in ("Count", "Sum", "Average", "Minimum", "Maximum"):
					fehler(b, f"Funktion {c.get('function')!r} ungültig")
				if c.get("function") != "Count":
					feld_da(b, c["document_type"], c.get("aggregate_function_based_on"))
				filter_pruefen(b, c["document_type"], c.get("filters_json"))
				filter_pruefen(b, c["document_type"], c.get("dynamic_filters_json"))
	# Dashboard Charts
	for c in daten.get("Dashboard Chart", []):
		b = f"Dashboard Chart {c['name']}"
		if c.get("is_standard"):
			fehler(b, "Fixture-Charts mit is_standard=0 anlegen")
		if c.get("chart_type") in ("Count", "Sum", "Average", "Group By"):
			dt = c.get("document_type")
			if not dt_da(b, dt):
				continue
			if doctypes.get(dt, {}).get("issingle"):
				fehler(b, "Single-DocTypes sind für Charts nicht möglich")
			if c["chart_type"] == "Group By":
				if not c.get("group_by_based_on"):
					fehler(b, "group_by_based_on fehlt")
				feld_da(b, dt, c.get("group_by_based_on"))
			else:
				for k in ("based_on", "time_interval", "timespan"):
					if not c.get(k):
						fehler(b, f"{k} fehlt")
				feld_da(b, dt, c.get("based_on"))
				if c["chart_type"] != "Count":
					feld_da(b, dt, c.get("value_based_on"))
			filter_pruefen(b, dt, c.get("filters_json"))
		if c.get("type") not in ("Line", "Bar", "Percentage", "Pie", "Donut", "Heatmap"):
			fehler(b, f"Darstellung {c.get('type')!r} ungültig")
	# Notifications
	for n in daten.get("Notification", []):
		b = f"Notification {n['name']}"
		if n.get("is_standard"):
			fehler(b, "als Fixture is_standard=0 verwenden (Standard-Benachrichtigungen sind außerhalb des Developer-Modus gesperrt)")
		dt = n.get("document_type")
		if not dt_da(b, dt):
			continue
		ev = n.get("event")
		if ev not in ("New", "Save", "Submit", "Cancel", "Days After", "Days Before", "Value Change", "Method", "Custom"):
			fehler(b, f"Ereignis {ev!r} ungültig")
		if ev == "Value Change":
			if not n.get("value_changed"):
				fehler(b, "value_changed fehlt")
			feld_da(b, dt, n.get("value_changed"))
		if ev in ("Days After", "Days Before"):
			if not n.get("date_changed"):
				fehler(b, "date_changed fehlt")
			feld_da(b, dt, n.get("date_changed"))
		if n.get("condition"):
			try:
				ast.parse(n["condition"], mode="eval")
			except SyntaxError as e:
				fehler(b, f"Bedingung ist kein Python-Ausdruck: {e.msg}")
			for feld in re.findall(r"doc\.([a-z_][a-z0-9_]*)", n["condition"]):
				feld_da(b, dt, feld)
		for r in n.get("recipients") or []:
			if r.get("receiver_by_role") and r["receiver_by_role"] not in alle_rollen:
				fehler(b, f"Empfänger-Rolle {r['receiver_by_role']!r} unbekannt")
			if r.get("receiver_by_document_field"):
				feld_da(b, dt, r["receiver_by_document_field"].split(",")[0])
		if not n.get("recipients"):
			fehler(b, "keine Empfänger")
		jinja_pruefen(b + " (Betreff)", n.get("subject"), methoden)
		jinja_pruefen(b + " (Text)", n.get("message"), methoden)
		for feld in set(re.findall(r"doc\.([a-z_][a-z0-9_]*)", (n.get("subject") or "") + (n.get("message") or ""))):
			if feld not in ("doctype", "name", "get"):
				feld_da(b, dt, feld)
	# E-Mail-Vorlagen, Briefkopf
	for t in daten.get("Email Template", []):
		b = f"Email Template {t['name']}"
		jinja_pruefen(b + " (Betreff)", t.get("subject"), methoden)
		jinja_pruefen(b, t.get("response_html") if t.get("use_html") else t.get("response"), methoden)
		if not (t.get("response_html") if t.get("use_html") else t.get("response")):
			fehler(b, "leerer Inhalt")
	for lh in daten.get("Letter Head", []):
		jinja_pruefen(f"Letter Head {lh['name']}", lh.get("content"), methoden)
		jinja_pruefen(f"Letter Head {lh['name']} (Fuß)", lh.get("footer"), methoden)
	# Custom Fields / Property Setter
	for cf in daten.get("Custom Field", []):
		b = f"Custom Field {cf['name']}"
		dt_da(b, cf.get("dt"))
		if cf.get("fieldtype") in LINK_TYPEN and cf.get("options") and cf["options"] not in doctypes and cf["options"] not in FRAPPE_DOCTYPES:
			warnung(b, f"Ziel {cf['options']} ist kein App-/Frappe-DocType")
	for ps in daten.get("Property Setter", []):
		dt_da(f"Property Setter {ps['name']}", ps.get("doc_type"))
	return daten


# ---------------------------------------------------------------------------------------------------- 5. Berichte
def berichte_laden():
	berichte = {}
	for modul_ordner in modul_ordner_liste():
		basis = os.path.join(modul_ordner, "report")
		if not os.path.isdir(basis):
			continue
		for o in sorted(os.listdir(basis)):
			pfad = os.path.join(basis, o, o + ".json")
			if os.path.isfile(pfad):
				r = json_laden(pfad, "Bericht")
				if r:
					r["_pfad"] = pfad
					berichte[r.get("name")] = r
	return berichte


def berichte_pruefen(berichte, doctypes, rollen):
	for name, r in berichte.items():
		b = f"Bericht {name}"
		ordner = os.path.dirname(r["_pfad"])
		o = os.path.basename(ordner)
		if o != scrub(name):
			fehler(b, f"Ordner {o} ≠ scrub(Name) {scrub(name)} – Frappe lädt den Bericht über den Namen")
		if not re.match(r"^[a-z0-9_]+$", o):
			fehler(b, "Ordnername nicht ASCII – als Python-Modul ungeeignet")
		if not os.path.isfile(os.path.join(ordner, "__init__.py")):
			fehler(b, "__init__.py fehlt")
		if not os.path.isfile(os.path.join(os.path.dirname(ordner), "__init__.py")):
			fehler(b, "report/__init__.py fehlt")
		if r.get("is_standard") != "Yes":
			fehler(b, "is_standard muss „Yes“ sein")
		if r.get("report_name") != name:
			fehler(b, "report_name ≠ name")
		ref = r.get("ref_doctype")
		if ref not in doctypes and ref not in FRAPPE_DOCTYPES:
			fehler(b, f"ref_doctype {ref!r} unbekannt")
		if r.get("report_type") == "Script Report":
			py = os.path.join(ordner, o + ".py")
			if not os.path.isfile(py) or not definiert(py, "execute"):
				fehler(b, f"{o}.py mit execute() fehlt")
			js = os.path.join(ordner, o + ".js")
			if os.path.isfile(js):
				with open(js, encoding="utf-8") as f:
					if f'frappe.query_reports["{name}"]' not in f.read():
						fehler(b, f"{o}.js registriert nicht frappe.query_reports[\"{name}\"]")
		elif r.get("report_type") == "Query Report":
			if not r.get("query"):
				fehler(b, "Query Report ohne query")
		else:
			fehler(b, f"report_type {r.get('report_type')!r} nicht unterstützt")
		if not r.get("roles"):
			warnung(b, "keine Rollen – nur System Manager/Administrator")
		for ro in r.get("roles") or []:
			rolle = ro.get("role")
			if rolle not in rollen and rolle not in STANDARD_ROLLEN:
				fehler(b, f"Rolle {rolle!r} unbekannt")
			elif ref in doctypes and not (lese_recht(doctypes, ref, rolle, "read") and lese_recht(doctypes, ref, rolle, "report")):
				fehler(b, f"Rolle {rolle!r} hat kein Lese-/Berichtsrecht auf {ref} – Bericht wäre für sie gesperrt")


# ---------------------------------------------------------------------------------------------------- 6. Druckformate
def druckformate_pruefen(doctypes, methoden):
	css_pfad = os.path.join(APP, "plattform", "print_format", "oekoinvest_druck.css")
	css = open(css_pfad, encoding="utf-8").read() if os.path.isfile(css_pfad) else None
	anzahl = 0
	for modul_ordner in modul_ordner_liste():
		basis = os.path.join(modul_ordner, "print_format")
		if not os.path.isdir(basis):
			continue
		for o in sorted(os.listdir(basis)):
			pfad = os.path.join(basis, o, o + ".json")
			if not os.path.isfile(pfad):
				continue
			pf = json_laden(pfad, "Druckformat")
			if not pf:
				continue
			anzahl += 1
			name = pf.get("name")
			b = f"Druckformat {name}"
			if o != scrub(name):
				fehler(b, f"Ordner {o} ≠ scrub(Name) {scrub(name)} – Frappe fände die HTML-Datei nicht")
			if pf.get("doc_type") not in doctypes and pf.get("doc_type") not in FRAPPE_DOCTYPES:
				fehler(b, f"doc_type {pf.get('doc_type')!r} unbekannt")
			if pf.get("standard") != "Yes" or pf.get("print_format_type") != "Jinja" or not pf.get("custom_format"):
				fehler(b, "standard=Yes, print_format_type=Jinja und custom_format=1 erwartet")
			html_datei = os.path.join(basis, o, o + ".html")
			if os.path.isfile(html_datei):
				html = open(html_datei, encoding="utf-8").read()
				if html != pf.get("html"):
					fehler(b, "HTML-Datei und JSON-HTML weichen ab – python Backend-Import/werkzeuge/bauen.py")
			else:
				html = pf.get("html")
			jinja_pruefen(b, html, methoden)
			if css is not None and pf.get("css") != css and pf.get("module") == "Plattform":
				warnung(b, "CSS nicht aktuell – python Backend-Import/werkzeuge/bauen.py")
			for feld in set(re.findall(r"\bdoc\.([a-z_][a-z0-9_]*)", html or "")):
				dt = doctypes.get(pf.get("doc_type"))
				if dt and feld not in {f.get("fieldname") for f in dt.get("fields", [])} and feld not in STANDARD_FELDER and feld not in ("get", "doctype"):
					fehler(b, f"doc.{feld} ist kein Feld von {pf.get('doc_type')}")
	return anzahl


# ---------------------------------------------------------------------------------------------------- 7. Workspaces
def workspaces_pruefen(doctypes, berichte, fixtures, rollen):
	karten = {c["name"] for c in fixtures.get("Number Card", [])}
	charts = {c["name"] for c in fixtures.get("Dashboard Chart", [])}
	anzahl = 0
	for modul_ordner in modul_ordner_liste():
		basis = os.path.join(modul_ordner, "workspace")
		if not os.path.isdir(basis):
			continue
		for o in sorted(os.listdir(basis)):
			pfad = os.path.join(basis, o, o + ".json")
			if not os.path.isfile(pfad):
				continue
			w = json_laden(pfad, "Workspace")
			if not w:
				continue
			anzahl += 1
			b = f"Workspace {w.get('name')}"
			if not (w.get("name") == w.get("label") == w.get("title")):
				fehler(b, "name, label und title müssen übereinstimmen")
			if not w.get("public"):
				warnung(b, "nicht öffentlich")

			def ziel_ok(typ, ziel, wo):
				if typ == "DocType":
					if ziel not in doctypes and ziel not in FRAPPE_DOCTYPES:
						fehler(b, f"{wo}: DocType {ziel!r} unbekannt")
				elif typ == "Report":
					if ziel not in berichte:
						fehler(b, f"{wo}: Bericht {ziel!r} unbekannt")
				elif typ == "Page":
					pass
				elif typ != "URL":
					fehler(b, f"{wo}: Typ {typ!r} unbekannt")

			karten_namen = set()
			for l in w.get("links") or []:
				if l.get("type") == "Card Break":
					karten_namen.add(l.get("label"))
				else:
					ziel_ok(l.get("link_type"), l.get("link_to"), f"Link „{l.get('label')}“")
			shortcut_namen = set()
			for s in w.get("shortcuts") or []:
				shortcut_namen.add(s.get("label"))
				ziel_ok(s.get("type"), s.get("link_to"), f"Shortcut „{s.get('label')}“")
				if s.get("stats_filter"):
					try:
						json.loads(s["stats_filter"])
					except ValueError:
						fehler(b, f"Shortcut „{s.get('label')}“: stats_filter kein JSON")
			for k in w.get("number_cards") or []:
				if k.get("number_card_name") not in karten:
					fehler(b, f"Number Card {k.get('number_card_name')!r} fehlt in den Fixtures")
			for c in w.get("charts") or []:
				if c.get("chart_name") not in charts:
					fehler(b, f"Dashboard Chart {c.get('chart_name')!r} fehlt in den Fixtures")
			for r in w.get("roles") or []:
				if r.get("role") not in rollen and r.get("role") not in STANDARD_ROLLEN:
					fehler(b, f"Rolle {r.get('role')!r} unbekannt")
			try:
				inhalt = json.loads(w.get("content") or "[]")
			except ValueError:
				fehler(b, "content ist kein JSON")
				continue
			ids = [blk.get("id") for blk in inhalt]
			if len(ids) != len(set(ids)):
				fehler(b, "doppelte Block-IDs in content")
			for blk in inhalt:
				t, dd = blk.get("type"), blk.get("data") or {}
				if t == "shortcut" and dd.get("shortcut_name") not in shortcut_namen:
					fehler(b, f"Block verweist auf fehlenden Shortcut {dd.get('shortcut_name')!r}")
				if t == "card" and dd.get("card_name") not in karten_namen:
					fehler(b, f"Block verweist auf fehlende Karte {dd.get('card_name')!r}")
				if t == "chart" and dd.get("chart_name") not in {c.get("chart_name") for c in w.get("charts") or []}:
					fehler(b, f"Block verweist auf fehlenden Chart {dd.get('chart_name')!r}")
				if t == "number_card" and dd.get("number_card_name") not in {k.get("number_card_name") for k in w.get("number_cards") or []}:
					fehler(b, f"Block verweist auf fehlende Number Card {dd.get('number_card_name')!r}")
	return anzahl


# ---------------------------------------------------------------------------------------------------- 8. Sonstiges
def modul_ordner_liste():
	pfad = os.path.join(APP, "modules.txt")
	module = [m.strip() for m in open(pfad, encoding="utf-8").read().splitlines() if m.strip()] if os.path.isfile(pfad) else []
	return [os.path.join(APP, scrub(m)) for m in module]


def module_pruefen():
	pfad = os.path.join(APP, "modules.txt")
	if not os.path.isfile(pfad):
		fehler("modules.txt", "fehlt")
		return set()
	module = {m.strip() for m in open(pfad, encoding="utf-8").read().splitlines() if m.strip()}
	for m in module:
		ordner = os.path.join(APP, scrub(m))
		if not os.path.isfile(os.path.join(ordner, "__init__.py")):
			fehler("modules.txt", f"Modulordner {scrub(m)}/__init__.py fehlt")
	return module


def patches_pruefen():
	pfad = os.path.join(APP, "patches.txt")
	if not os.path.isfile(pfad):
		fehler("patches.txt", "fehlt")
		return 0
	anzahl = 0
	abschnitte = set()
	for zeile in open(pfad, encoding="utf-8").read().splitlines():
		z = zeile.strip()
		if not z or z.startswith("#"):
			continue
		if z.startswith("["):
			abschnitte.add(z)
			if z not in ("[pre_model_sync]", "[post_model_sync]"):
				fehler("patches.txt", f"unbekannter Abschnitt {z}")
			continue
		anzahl += 1
		ausdruck = z.split()[0]
		if ausdruck.startswith("execute:"):
			continue
		datei = modul_datei(ausdruck)
		if not datei:
			fehler("patches.txt", f"{ausdruck}: Modul nicht gefunden")
		elif not definiert(datei, "execute"):
			fehler("patches.txt", f"{ausdruck}: execute() fehlt")
	if abschnitte != {"[pre_model_sync]", "[post_model_sync]"}:
		warnung("patches.txt", "Abschnitte [pre_model_sync] und [post_model_sync] erwartet")
	return anzahl


def uebersetzungen_pruefen(doctypes):
	pfad = os.path.join(APP, "translations", "de.csv")
	if not os.path.isfile(pfad):
		fehler("Übersetzung", "translations/de.csv fehlt")
		return 0
	with open(pfad, encoding="utf-8") as f:
		zeilen = [z for z in csv.reader(io.StringIO(f.read())) if z]
	quellen = {}
	for i, z in enumerate(zeilen, 1):
		if len(z) not in (2, 3):
			fehler("Übersetzung", f"Zeile {i}: 2 oder 3 Spalten erwartet")
			continue
		if z[0] in quellen and quellen[z[0]] != z[1]:
			fehler("Übersetzung", f"„{z[0]}“ widersprüchlich übersetzt")
		quellen[z[0]] = z[1]
	technisch = re.compile(r"^([A-Z]{1,3}|[0-9.]+|[a-z]+/[a-z.+-]+|admin|system|email|info|status|konto|ki|regel|reset|Frau|Herr|Divers)$")
	fehlend = set()
	for name, d in doctypes.items():
		if re.search(r"(ae|oe|ue)", name) and name not in quellen:
			fehlend.add(name)
		for f in d.get("fields") or []:
			if f.get("fieldtype") == "Select":
				for o in (f.get("options") or "").split("\n"):
					if o and not technisch.match(o) and o not in quellen:
						fehlend.add(o)
	if fehlend:
		warnung("Übersetzung", f"{len(fehlend)} Begriffe ohne Übersetzung in de.csv: {', '.join(sorted(fehlend)[:25])}{' …' if len(fehlend) > 25 else ''}")
	return len(zeilen)


def mail_templates_pruefen(methoden, fixtures):
	ordner = os.path.join(APP, "templates")
	anzahl = 0
	for wurzel, _o, dateien in os.walk(ordner):
		for d in dateien:
			if d.endswith(".html"):
				anzahl += 1
				pfad = os.path.join(wurzel, d)
				inhalt = open(pfad, encoding="utf-8").read()
				jinja_pruefen(f"Template {rel(pfad)}", inhalt, methoden, pflicht_registriert=False)
				for ziel in re.findall(r"{%-?\s*(?:extends|include)\s+[\"']([^\"']+)[\"']", inhalt):
					if not os.path.isfile(os.path.join(APP, ziel)):
						fehler(f"Template {rel(pfad)}", f"{ziel} nicht gefunden")
	vorlagen = {t["name"] for t in fixtures.get("Email Template", [])}
	for wurzel, ordner_, dateien in os.walk(APP):
		ordner_[:] = [o for o in ordner_ if o != "__pycache__"]
		for d in dateien:
			if not d.endswith(".py"):
				continue
			pfad = os.path.join(wurzel, d)
			inhalt = open(pfad, encoding="utf-8").read()
			for t in re.findall(r"template\s*=\s*[\"']([a-z0-9_]+)[\"']", inhalt) + re.findall(r"[\"'](oekoinvest_[a-z_]+)[\"'],\s*\n?\s*\{", inhalt):
				if not os.path.isfile(os.path.join(APP, "templates", "emails", t + ".html")):
					fehler(f"Mail {rel(pfad)}", f"Vorlage templates/emails/{t}.html fehlt")
			for v in re.findall(r"vorlage_senden\(\s*[\"']([^\"']+)[\"']", inhalt):
				if v not in vorlagen:
					fehler(f"Mail {rel(pfad)}", f"E-Mail-Vorlage „{v}“ fehlt in fixtures/email_template.json")
	return anzahl


def js_pruefen():
	node = shutil.which("node")
	anzahl = 0
	for wurzel, ordner, dateien in os.walk(APP):
		ordner[:] = [o for o in ordner if o not in ("node_modules", "__pycache__")]
		for d in dateien:
			if d.endswith(".js"):
				anzahl += 1
				if node:
					r = subprocess.run([node, "--check", os.path.join(wurzel, d)], capture_output=True, text=True)
					if r.returncode:
						fehler("JavaScript", f"{rel(os.path.join(wurzel, d))}: {(r.stderr or '').strip().splitlines()[-1] if r.stderr else 'Syntaxfehler'}")
	return anzahl, bool(node)


def paket_pruefen():
	pfad = os.path.join(APP_REPO, "pyproject.toml")
	if not os.path.isfile(pfad):
		fehler("Paket", "pyproject.toml fehlt")
		return
	text = open(pfad, encoding="utf-8").read()
	try:
		import tomllib

		daten = tomllib.loads(text)
	except ModuleNotFoundError:  # Python < 3.11
		daten = None
	except Exception as e:
		fehler("Paket", f"pyproject.toml ungültig: {e}")
		return
	if daten is not None:
		if daten.get("project", {}).get("name") != APP_NAME:
			fehler("Paket", "project.name muss oekoinvest_app sein")
		abh = " ".join(daten.get("project", {}).get("dependencies") or [])
		for app in ("erpnext", "hrms", "drive", "helpdesk", "insights"):
			if app in abh:
				fehler("Paket", f"harte Abhängigkeit auf {app} – muss optional bleiben")
		fd = (daten.get("tool", {}).get("bench", {}).get("frappe-dependencies") or {}).get("frappe", "")
		if "15" not in fd:
			fehler("Paket", f"tool.bench.frappe-dependencies.frappe = {fd!r} – Frappe v15 erwartet")
	init = os.path.join(APP, "__init__.py")
	if not re.search(r"__version__\s*=\s*[\"'][0-9][^\"']*[\"']", open(init, encoding="utf-8").read()):
		fehler("Paket", "__version__ fehlt in oekoinvest_app/__init__.py")
	beispiel = os.path.join(BASIS, "site_config.beispiel.json")
	if os.path.isfile(beispiel):
		sc = json_laden(beispiel, "site_config")
		for k, v in (sc or {}).items():
			if re.search(r"(secret|password|passwort|token|api_key|encryption_key|db_)", k, re.I) and v not in (None, "", False):
				fehler("site_config", f"{k}: Beispiel darf keine Geheimnisse enthalten")
	else:
		warnung("Paket", "site_config.beispiel.json fehlt")
	for datei in ("README.md", "GO-LIVE.md", "ANLEITUNG.md", "installieren.sh"):
		if not os.path.isfile(os.path.join(BASIS, datei)):
			warnung("Paket", f"{datei} fehlt")


def json_alle_pruefen():
	anzahl = 0
	for wurzel, ordner, dateien in os.walk(BASIS):
		ordner[:] = [o for o in ordner if o not in ("node_modules", "__pycache__", ".git")]
		for d in dateien:
			if d.endswith(".json"):
				anzahl += 1
				json_laden(os.path.join(wurzel, d))
	return anzahl


# ---------------------------------------------------------------------------------------------------- Hauptprogramm
def main():
	kurz = "--kurz" in sys.argv
	streng = "--streng" in sys.argv
	statistik = {}
	statistik["Python-Dateien"] = python_pruefen()
	statistik["JSON-Dateien"] = json_alle_pruefen()
	module = module_pruefen()
	doctypes = doctypes_laden()
	statistik["DocTypes"] = len(doctypes)
	hooks = hooks_laden()
	rollen_fixture = set()
	rolle_json = os.path.join(APP, "fixtures", "role.json")
	if os.path.isfile(rolle_json):
		rollen_fixture = {r.get("name") for r in json_laden(rolle_json, "Fixtures") or []}
	methoden = hooks_pruefen(hooks, doctypes)
	doctypes_pruefen(doctypes, rollen_fixture, module)

	def felder_von(dt):
		return {f.get("fieldname") for f in doctypes.get(dt, {}).get("fields", [])}

	fixtures = fixtures_pruefen(doctypes, rollen_fixture, hooks, methoden, felder_von)
	statistik["Fixture-Datensätze"] = sum(len(v) for v in fixtures.values())
	berichte = berichte_laden()
	berichte_pruefen(berichte, doctypes, rollen_fixture)
	statistik["Berichte"] = len(berichte)
	statistik["Druckformate"] = druckformate_pruefen(doctypes, methoden)
	statistik["Workspaces"] = workspaces_pruefen(doctypes, berichte, fixtures, rollen_fixture)
	statistik["Patches"] = patches_pruefen()
	statistik["Übersetzungen"] = uebersetzungen_pruefen(doctypes)
	statistik["Mail-Templates"] = mail_templates_pruefen(methoden, fixtures)
	js, node = js_pruefen()
	statistik["JS-Dateien" + ("" if node else " (ohne node --check)")] = js
	paket_pruefen()

	print("Konsistenzprüfung Backend-Import (oekoinvest_app)")
	print("Jinja: " + ("jinja2 " + jinja2.__version__ if JINJA else "einfache Blockprüfung (jinja2 nicht installiert)"))
	print("  " + " · ".join(f"{k}: {v}" for k, v in statistik.items()))
	if FEHLER:
		print(f"\nFEHLER ({len(FEHLER)}):")
		for f in FEHLER:
			print("  ✗ " + f)
	if WARNUNGEN and not kurz:
		print(f"\nWARNUNGEN ({len(WARNUNGEN)}):")
		for w in WARNUNGEN:
			print("  ! " + w)
	print(f"\nErgebnis: {len(FEHLER)} Fehler, {len(WARNUNGEN)} Warnungen")
	return 1 if FEHLER or (streng and WARNUNGEN) else 0


if __name__ == "__main__":
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	sys.exit(main())
