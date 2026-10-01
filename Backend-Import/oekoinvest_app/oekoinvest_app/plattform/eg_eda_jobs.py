# Copyright (c) 2026, ÖkoInvest GmbH
#
# Scheduler WP2 „EDA-Marktkommunikation“ (hooks.py scheduler_events, Eintrag pflegt WP1):
#   hourly  oekoinvest_app.plattform.eg_eda_jobs.stuendlich  – Simulator-Antworten zustellen (nur Test/Demo, site_config
#                                                            „eg_eda_simulator“), Wiederholungen unbeantworteter Nachrichten
#   daily   oekoinvest_app.plattform.eg_eda_jobs.taeglich    – Fristenlauf: 30-Tage-Zustimmungsfrist, Erinnerungen an Mitglieder
#                                                            (Tag 2/7/14/21/27), Zeitüberschreitungen, Technik-/Nachforderungs-
#                                                            und Reklamationsfristen (eg_eda_kern.fristen_pruefen)
# Fehler werden geloggt (Error Log), nie verschluckt; ein Fehler einer Gemeinschaft hält den Lauf der anderen nicht auf.

import frappe


def stuendlich():
	from oekoinvest_app.plattform.api import eg_eda

	if frappe.conf.get("eg_eda_simulator"):
		try:
			eg_eda._zustellen()
		except Exception:  # noqa: BLE001
			frappe.log_error(title="EDA: Simulator-Zustellung", message=frappe.get_traceback())
	_lauf(nur_wiederholung=True)


def taeglich():
	_lauf(nur_wiederholung=False)


def _lauf(nur_wiederholung):
	from oekoinvest_app.plattform.api import eg_eda

	gids = frappe.get_all(eg_eda.DP, filters={"status": ["in", ["gesendet", "bestaetigt"]]}, pluck="gemeinschaft", distinct=True)
	for gid in sorted(set(g for g in gids if g)):
		try:
			if nur_wiederholung:
				_nur_wiederholen(eg_eda, gid)
			else:
				eg_eda.fristen_lauf_intern(eg_eda.S.system_nutzer(), gid)
			frappe.db.commit()  # noqa: nosemgrep – Hintergrundjob, je Gemeinschaft abschließen
		except Exception:  # noqa: BLE001
			frappe.db.rollback()
			frappe.log_error(title=f"EDA: Fristenlauf {gid}", message=frappe.get_traceback())


def _nur_wiederholen(eg_eda, gid):
	K = eg_eda.K
	prozesse = eg_eda._prozesse({"gemeinschaft": gid, "status": "gesendet"})
	for a in K.fristen_pruefen(prozesse=prozesse, teilnahmen={}, heute=eg_eda._heute()):
		if a["art"] != "wiederholen":
			continue
		p = next(x for x in prozesse if x["id"] == a["prozessId"])
		g = eg_eda.S.aus_doc("gemeinschaft", frappe.get_doc(eg_eda.S.DT["gemeinschaft"], gid))
		eg_eda._versenden(p, g, wiederholung=True)
