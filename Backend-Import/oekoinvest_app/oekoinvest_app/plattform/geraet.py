# Copyright (c) 2026, ÖkoInvest GmbH
#
# Grobe Geräte- und Ortsangaben für Sitzungsliste und Anmeldehistorie – Port von src/lib/plattform/geraet.js.
# Bewusst grob (Datensparsamkeit): Browser + Betriebssystem aus dem User-Agent, IP nur gekürzt
# (IPv4 /24, IPv6 /48), Land nur, wenn ein vorgeschalteter Proxy es als Kopfzeile liefert.
# Ohne Frappe-Abhängigkeit.

import re

BROWSER = [
	(re.compile(r"Edg(e|A|iOS)?/"), "Edge"),
	(re.compile(r"OPR/|Opera"), "Opera"),
	(re.compile(r"SamsungBrowser/"), "Samsung Internet"),
	(re.compile(r"Firefox/|FxiOS/"), "Firefox"),
	(re.compile(r"CriOS/|Chrome/|Chromium/"), "Chrome"),
	(re.compile(r"Safari/"), "Safari"),
	(re.compile(r"node|undici|curl|wget|python|axios|Go-http", re.IGNORECASE), "Programm/Skript"),
]
SYSTEM = [
	(re.compile(r"iPhone|iPod"), "iPhone"),
	(re.compile(r"iPad"), "iPad"),
	(re.compile(r"Android"), "Android"),
	(re.compile(r"Windows NT"), "Windows"),
	(re.compile(r"Mac OS X|Macintosh"), "macOS"),
	(re.compile(r"CrOS"), "ChromeOS"),
	(re.compile(r"Linux"), "Linux"),
]
MOBIL = re.compile(r"Mobi|iPhone|Android.*Mobile")
IPV4 = re.compile(r"^\d+\.\d+\.\d+\.\d+$")
LOKAL = re.compile(r"^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)")
LAENDER = {"DE": "Deutschland", "AT": "Österreich", "CH": "Schweiz", "IT": "Italien", "FR": "Frankreich", "NL": "Niederlande", "PL": "Polen", "CZ": "Tschechien"}


def geraet_aus_user_agent(ua=""):
	"""{browser, system, mobil, label} aus dem User-Agent, z. B. label „Chrome auf Windows“."""
	s = str(ua or "")[:400]
	browser = next((name for muster, name in BROWSER if muster.search(s)), "Unbekannter Browser")
	system = next((name for muster, name in SYSTEM if muster.search(s)), "")
	mobil = bool(MOBIL.search(s))
	return {"browser": browser, "system": system, "mobil": mobil, "label": f"{browser} auf {system}" if system else browser}


def ip_grob(ip=""):
	"""IP gekürzt: 203.0.113.17 → 203.0.113.x · 2001:db8:1:2::5 → 2001:db8:1::/48"""
	s = str(ip or "").strip()
	if not s:
		return ""
	if IPV4.match(s):
		return re.sub(r"\.\d+$", ".x", s)
	if ":" in s:
		teile = [t for t in s.split(":") if t][:3]
		return ":".join(teile) + "::/48"
	return ""


def ort_grob(ip="", land=""):
	"""Grober Ort aus IP/Kopfzeilen: „Lokales Netz“, Land (falls vom Proxy geliefert) oder gekürzte IP."""
	s = str(ip or "").strip()
	if not s or s == "::1" or LOKAL.match(s) or re.match(r"^f[cd]", s, re.IGNORECASE):
		return "Lokales Netz"
	l = str(land or "")
	l = l if re.fullmatch(r"[A-Z]{2}", l) else ""
	return f"{LAENDER.get(l, l)} · {ip_grob(s)}" if l else ip_grob(s)
