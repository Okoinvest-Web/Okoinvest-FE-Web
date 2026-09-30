# Copyright (c) 2026, ÖkoInvest GmbH
#
# Anlagen & Monitoring – Stammlisten und reine Regeln, 1:1 wie src/lib/plattform/anlagen.js der Website
# (bei Änderungen dort hier nachziehen). Ohne Datenbankzugriff, damit testbar.

import base64
import hashlib
import hmac
import secrets
import unicodedata

ANLAGE_TYPEN = {"freiflaeche": "Freiflächen-PV", "dach": "Gewerbedach-PV", "carport": "Solarcarport", "agri": "Agri-PV", "speicher": "Batteriespeicher"}
ANLAGE_STATUS = {"planung": "In Planung", "bau": "Im Bau", "betrieb": "In Betrieb", "ruhend": "Außer Betrieb", "rueckbau": "Rückgebaut"}
LASTPROFILE = {"gewerbe": "Gewerbe", "industrie": "Industrie", "landwirtschaft": "Landwirtschaft", "keins": "Kein Verbrauch vor Ort"}
KOMPONENTEN_ARTEN = {"wechselrichter": "Wechselrichter", "speicher": "Batteriespeicher", "zaehler": "Zähler", "datenlogger": "Datenlogger / Gateway", "modul": "PV-Module", "sonstiges": "Sonstiges"}
MESSPUNKT_ARTEN = {
	"erzeugung": ("Erzeugungszähler", ["2.8.0"]),
	"zweirichtung": ("Zweirichtungszähler (Netzverknüpfungspunkt)", ["1.8.0", "2.8.0"]),
	"verbrauch": ("Verbrauchszähler", ["1.8.0"]),
	"speicher": ("Speicherzähler", ["1.8.0", "2.8.0"]),
}
REGISTER_LABEL = {("zweirichtung", "1.8.0"): "Bezug", ("zweirichtung", "2.8.0"): "Einspeisung", ("erzeugung", "2.8.0"): "Erzeugung", ("verbrauch", "1.8.0"): "Verbrauch", ("speicher", "1.8.0"): "Laden", ("speicher", "2.8.0"): "Entladen"}
MESSSTELLEN = {"geeicht": "Geeichte Messstelle / Smart-Meter-Gateway", "monitoring": "Monitoring (MQTT, nicht eichrechtskonform)"}
WARTUNG_ARTEN = {"inspektion": "Inspektion", "reinigung": "Modulreinigung", "pruefung": "Wiederkehrende Prüfung", "thermografie": "Thermografie", "reparatur": "Reparatur / Tausch", "software": "Firmware-Update"}
WARTUNG_STATUS = {"geplant": "Geplant", "erledigt": "Erledigt", "abgesagt": "Abgesagt"}
STOERUNG_SCHWERE = {"info": ("Info", 0), "niedrig": ("Niedrig", 1), "mittel": ("Mittel", 2), "hoch": ("Hoch", 3), "kritisch": ("Kritisch", 4)}
STOERUNG_STATUS = {"offen": "Offen", "in_arbeit": "In Arbeit", "behoben": "Behoben"}
STOERUNG_OFFEN = ("offen", "in_arbeit")
STOERUNG_REGELN = {
	"offline": ("Keine Daten (offline)", "hoch"),
	"minderleistung": ("Leistung deutlich unter Erwartung", "mittel"),
	"fehlercode": ("Fehlercode am Wechselrichter", "hoch"),
	"zaehler_rueckwaerts": ("Zählerstand rückwärts", "mittel"),
	"zaehler_sprung": ("Unplausibler Zählersprung", "mittel"),
	"manuell": ("Manuell erfasst", "mittel"),
}
MQTT_PRAEFIX = "oekoinvest/v1"
MAX_ZUGAENGE_JE_ANLAGE = 20

DE_REGION = {
	"Schleswig-Holstein": "de-nord", "Hamburg": "de-nord", "Niedersachsen": "de-nord", "Bremen": "de-nord", "Mecklenburg-Vorpommern": "de-nord",
	"Brandenburg": "de-ost", "Berlin": "de-ost", "Sachsen": "de-ost", "Sachsen-Anhalt": "de-ost", "Thüringen": "de-ost",
	"Nordrhein-Westfalen": "de-west", "Hessen": "de-west", "Rheinland-Pfalz": "de-west", "Saarland": "de-west",
	"Bayern": "de-sued", "Baden-Württemberg": "de-sued",
}


def region_fuer(land, bundesland):
	if land == "AT":
		return "at"
	if land == "CH":
		return "ch"
	return DE_REGION.get(bundesland, "de-sued")


def topic_basis(anlage_id, geraet_id):
	return f"{MQTT_PRAEFIX}/{anlage_id}/{geraet_id}"


def mqtt_benutzer(anlage_id, geraet_id):
	return f"anl-{str(anlage_id).lower()}-{str(geraet_id).lower()}"


def prioritaet(schwere, alter_stunden, quittiert, offen=True):
	"""Wie stoerungAusgabe() im Demo-Backend: Schwere × 10 + Alter (je 6 h ein Punkt, max. 8) + 2 wenn unquittiert."""
	if not offen:
		return 0
	return STOERUNG_SCHWERE.get(schwere, ("", 0))[1] * 10 + min(8, int(max(0, alter_stunden) // 6)) + (0 if quittiert else 2)


# ---------------------------------------------------------------- Gerätepasswörter (scrypt, Format der Website)
# scrypt$N$r$p$<salt base64>$<hash base64>, 64 Byte, NFKC – identisch zu src/lib/plattform/server/passwort.js und
# Backend-Import/dienste/anlagen-daten/src/auth.js (der Ingest-Dienst prüft Broker-Anmeldungen gegen diesen Hash).

SCRYPT_N, SCRYPT_R, SCRYPT_P, SCRYPT_LEN = 16384, 8, 1, 64


def geraet_passwort():
	"""Zufälliges Gerätepasswort (32 Zeichen base64url, ≈ 190 Bit)."""
	return secrets.token_urlsafe(24)


def passwort_hash(passwort):
	salt = secrets.token_bytes(16)
	schluessel = hashlib.scrypt(unicodedata.normalize("NFKC", passwort).encode("utf-8"), salt=salt, n=SCRYPT_N, r=SCRYPT_R, p=SCRYPT_P, dklen=SCRYPT_LEN, maxmem=64 * 1024 * 1024)
	return f"scrypt${SCRYPT_N}${SCRYPT_R}${SCRYPT_P}${base64.b64encode(salt).decode()}${base64.b64encode(schluessel).decode()}"


def passwort_pruefen(passwort, gespeichert):
	teile = str(gespeichert or "").split("$")
	if len(teile) != 6 or teile[0] != "scrypt":
		return False
	_, n, r, p, salt, soll = teile
	ist = hashlib.scrypt(unicodedata.normalize("NFKC", str(passwort or "")).encode("utf-8"), salt=base64.b64decode(salt), n=int(n), r=int(r), p=int(p), dklen=SCRYPT_LEN, maxmem=64 * 1024 * 1024)
	return hmac.compare_digest(ist, base64.b64decode(soll))


def fingerabdruck(hash_wert):
	return hashlib.sha256(str(hash_wert or "").encode("utf-8")).hexdigest()[:16]
