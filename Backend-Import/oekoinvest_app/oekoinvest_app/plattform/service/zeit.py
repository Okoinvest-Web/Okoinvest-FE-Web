# Copyright (c) 2026, ÖkoInvest GmbH
#
# Zeit-Helfer für die Service-Module: ISO (UTC, wie die Website) ↔ Datetime in der Systemzeitzone (naiv, wie Frappe speichert).

from datetime import timezone
from zoneinfo import ZoneInfo

from frappe.utils import get_datetime, get_system_timezone, now_datetime

from oekoinvest_app.plattform.kern import iso


def _tz():
	return ZoneInfo(get_system_timezone() or "UTC")


def system_aus_iso(wert):
	"""„2026-10-06T08:00:00.000Z“ → naives Datetime in der Systemzeitzone (für Datetime-Felder)."""
	from oekoinvest_app.plattform.termine.slots import aus_iso

	return aus_iso(wert).astimezone(_tz()).replace(tzinfo=None)


def utc_aus_system(wert):
	"""Datetime-Feld (naiv, Systemzeitzone) → aware UTC."""
	d = get_datetime(wert)
	return d.replace(tzinfo=_tz()).astimezone(timezone.utc)


def jetzt_utc():
	return utc_aus_system(now_datetime())


__all__ = ["iso", "system_aus_iso", "utc_aus_system", "jetzt_utc"]
