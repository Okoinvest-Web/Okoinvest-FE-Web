# Copyright (c) 2026, ÖkoInvest GmbH
#
# Terminarten und freie Zeitfenster – reine Funktionen (Zeitzone Europe/Vienna, Ausgabe ISO/UTC wie die Website).

import re
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Vienna")

# Art → (Bezeichnung, Dauer min, Puffer min, Kanal, öffentlich, Rollen, Vorlauf h)
TERMIN_ARTEN = {
	"besichtigung": ("Flächenbesichtigung", 90, 60, "vor_ort", True, None, 48),
	"beratung_telefon": ("Beratung am Telefon", 30, 10, "telefon", True, None, 4),
	"beratung_video": ("Beratung per Video", 45, 15, "video", True, None, 4),
	"gemeinde": ("Gemeindetermin", 60, 30, "vor_ort", True, None, 72),
	"datenraum": ("Datenraum-Session", 60, 15, "video", False, ["investor"], 24),
}
KANAELE = {"vor_ort": "Vor Ort", "telefon": "Telefon", "video": "Video"}
TERMIN_STATUS = {"gebucht": "Gebucht", "bestaetigt": "Bestätigt", "storniert": "Storniert", "erledigt": "Stattgefunden", "nicht_erschienen": "Nicht erschienen"}
TERMIN_AKTIV = ["gebucht", "bestaetigt"]
ARBEITSZEITEN_STANDARD = {
	"1": [["09:00", "12:00"], ["13:00", "17:00"]],
	"2": [["09:00", "12:00"], ["13:00", "17:00"]],
	"3": [["09:00", "12:00"], ["13:00", "17:00"]],
	"4": [["09:00", "12:00"], ["13:00", "17:00"]],
	"5": [["09:00", "12:00"], ["13:00", "15:00"]],
}
GRENZEN = {"horizont_tage": 42, "raster": 30, "max_slots": 400, "erinnerung_stunden": 24}

ZEIT = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


def tag_gueltig(t):
	try:
		return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(t))) and bool(date.fromisoformat(str(t)))
	except ValueError:
		return False


def iso(dt):
	d = dt.astimezone(timezone.utc)
	return d.strftime("%Y-%m-%dT%H:%M:%S.") + f"{d.microsecond // 1000:03d}Z"


def aus_iso(s):
	d = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
	return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def lokal_tag(dt):
	return dt.astimezone(TZ).date().isoformat()


def heute_tag(jetzt=None):
	return lokal_tag(jetzt or datetime.now(timezone.utc))


def arbeitszeiten_bereinigen(roh):
	out = {}
	for wt in range(1, 8):
		liste = (roh or {}).get(str(wt)) or (roh or {}).get(wt) or []
		fenster = sorted([[f[0], f[1]] for f in liste if isinstance(f, (list, tuple)) and len(f) == 2 and ZEIT.match(str(f[0])) and ZEIT.match(str(f[1])) and f[0] < f[1]][:4])
		if fenster:
			out[str(wt)] = fenster
	return out


def gesperrt(tag, feiertage=(), abwesenheiten=()):
	if tag in feiertage:
		return "feiertag"
	if any(a["von"] <= tag <= a["bis"] for a in abwesenheiten):
		return "abwesend"
	return None


def freie_slots(arbeitszeiten=None, feiertage=(), abwesenheiten=(), belegt=(), dauer=60, puffer=0, von_tag=None, bis_tag=None, jetzt=None, vorlauf_stunden=0, raster=None):
	"""Liste {start, ende} (ISO UTC). `belegt` = [{start, ende}] ISO; Abwesenheiten = [{von, bis}] Kalendertage."""
	raster = raster or GRENZEN["raster"]
	jetzt = jetzt or datetime.now(timezone.utc)
	frueh = jetzt + timedelta(hours=vorlauf_stunden)
	belegung = [(aus_iso(b["start"]), aus_iso(b["ende"])) for b in belegt]
	az = arbeitszeiten_bereinigen(arbeitszeiten if arbeitszeiten is not None else ARBEITSZEITEN_STANDARD)
	slots = []
	tag = date.fromisoformat(von_tag)
	ende_tag = date.fromisoformat(bis_tag)
	i = 0
	while tag <= ende_tag and i < 100:
		t = tag.isoformat()
		if not gesperrt(t, feiertage, abwesenheiten):
			for von, bis in az.get(str(tag.isoweekday()), []):
				f_ende = datetime.combine(tag, datetime.strptime(bis, "%H:%M").time(), TZ)
				start = datetime.combine(tag, datetime.strptime(von, "%H:%M").time(), TZ)
				while start + timedelta(minutes=dauer) <= f_ende:
					ende = start + timedelta(minutes=dauer)
					p = timedelta(minutes=puffer)
					if start >= frueh and not any((start - p) < e and a < (ende + p) for a, e in belegung):
						slots.append({"start": iso(start), "ende": iso(ende)})
						if len(slots) >= GRENZEN["max_slots"]:
							return slots
					start += timedelta(minutes=raster)
		tag += timedelta(days=1)
		i += 1
	return slots


def slot_frei(start_iso, **param):
	"""Liegt der gewünschte Beginn exakt auf einem freien Slot? (Serverprüfung der Buchung, Doppelbuchung)"""
	try:
		s = aus_iso(start_iso)
	except (TypeError, ValueError):
		return False
	t = lokal_tag(s)
	return any(aus_iso(x["start"]) == s for x in freie_slots(von_tag=t, bis_tag=t, **param))


def zeitraum_text(start_iso, ende_iso):
	s = aus_iso(start_iso).astimezone(TZ)
	e = aus_iso(ende_iso).astimezone(TZ)
	wt = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"][s.weekday()]
	return f"{wt}., {s:%d.%m.%Y}, {s:%H:%M}–{e:%H:%M} Uhr"
