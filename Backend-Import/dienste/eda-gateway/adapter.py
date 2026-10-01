# Copyright (c) 2026, ÖkoInvest GmbH
#
# Transport-Adapter des EDA-Gateways (nur Standardbibliothek). Jeder Adapter hat:
#   kanal              – Kennung für die Plattform (email, kep, datei, simulator)
#   pruefen() → [Fehler]   Konfiguration ohne Netzverkehr prüfen
#   senden(nachricht)      ausgehende Nachricht (dict aus eg_eda.ausgang: rohinhalt, empfaenger, messageId, nachrichtencode …)
#   empfangen() → [(xml, quittieren(ok: bool))]   neue Eingänge; quittieren(True) entfernt bzw. markiert sie im Postfach
#
# Hinweise zur Marktanbindung (zu bestätigen mit EDA GmbH / ebUtilities vor Produktivbetrieb, Fachkonzept 2.3 und GO-LIVE.md):
#  - E-Mail-Anbindung: Postfach der Gemeinschaft bzw. des Organisators im EDA-Plattformvertrag, Nachrichten als XML-Anhang,
#    Signatur/Verschlüsselung S/MIME mit den bei EDA hinterlegten Zertifikaten. Empfängeradressen je Marktpartner liefert EDA
#    (Datei EDA_EMAIL_ADRESSEN, JSON {"AT003000": "…"}) – hier keine Adressen erfunden.
#  - KEP: Kommunikationsendpunkt-Software (z. B. eines Dienstleisters) mit Austauschordnern oder HTTPS-Schnittstelle.
#  - Das kanonische Plattform-XML wird 1:1 übertragen; eine Abbildung auf die offiziellen ebUtilities-XSD-Namensräume
#    (Abbildung „ebutilities“) ist vor dem Echtbetrieb gegen die veröffentlichten Schemas umzusetzen und zu prüfen.

import email
import email.policy
import imaplib
import json
import os
import shutil
import smtplib
import ssl
import subprocess
import tempfile
import time
import urllib.request
from email.message import EmailMessage
from email.utils import make_msgid


def _tls(ca_datei="", zert=None, schluessel=None):
	ctx = ssl.create_default_context(cafile=ca_datei or None)
	ctx.minimum_version = ssl.TLSVersion.TLSv1_2
	if zert:
		ctx.load_cert_chain(zert, schluessel or None)
	return ctx


def _dateiname(n):
	sicher = "".join(c if c.isalnum() or c in "-_" else "_" for c in str(n.get("messageId") or "nachricht"))
	return f"{sicher}.xml"


# ================================================================ Ordner (Tests, manuelle Übergabe, KEP-Austauschordner)


class DateiAdapter:
	kanal = "datei"

	def __init__(self, ordner):
		self.ausgang = os.path.join(ordner, "ausgang")
		self.eingang = os.path.join(ordner, "eingang")
		self.erledigt = os.path.join(ordner, "eingang-erledigt")
		self.fehler = os.path.join(ordner, "eingang-fehler")
		for o in (self.ausgang, self.eingang, self.erledigt, self.fehler):
			os.makedirs(o, exist_ok=True)

	def pruefen(self):
		return [] if os.access(self.ausgang, os.W_OK) and os.access(self.eingang, os.R_OK) else ["Austauschordner nicht beschreibbar"]

	def senden(self, n):
		ziel = os.path.join(self.ausgang, _dateiname(n))
		tmp = ziel + ".tmp"
		with open(tmp, "w", encoding="utf-8") as f:
			f.write(n["rohinhalt"])
		os.replace(tmp, ziel)  # atomar: die Gegenseite sieht nur vollständige Dateien

	def empfangen(self):
		aus = []
		for name in sorted(os.listdir(self.eingang)):
			pfad = os.path.join(self.eingang, name)
			if not name.lower().endswith(".xml") or not os.path.isfile(pfad):
				continue
			with open(pfad, encoding="utf-8") as f:
				xml = f.read()

			def quittieren(ok, pfad=pfad, name=name):
				shutil.move(pfad, os.path.join(self.erledigt if ok else self.fehler, name))

			aus.append((xml, quittieren))
		return aus


# ================================================================ Simulator-Netzbetreiber (nur Test/Demo)


class SimulatorAdapter:
	"""Beantwortet ausgehende Nachrichten mit dem Simulator aus eg_eda_kern (Verzögerung: EDA_SIM_SEKUNDEN_JE_TAG)."""

	kanal = "simulator"

	def __init__(self, ordner, kern, env=None):
		env = env or {}
		os.makedirs(ordner, exist_ok=True)
		self.datei = os.path.join(ordner, "simulator.json")
		self.k = kern
		self.seed = env.get("EDA_SIM_SEED") or "gateway"
		self.sek_je_tag = float(env.get("EDA_SIM_SEKUNDEN_JE_TAG") or 60)
		self.zaehler = 0

	def _lesen(self):
		try:
			with open(self.datei, encoding="utf-8") as f:
				return json.load(f)
		except (OSError, ValueError):
			return {"ausstehend": []}

	def _schreiben(self, d):
		tmp = self.datei + ".tmp"
		with open(tmp, "w", encoding="utf-8") as f:
			json.dump(d, f)
		os.replace(tmp, self.datei)

	def pruefen(self):
		return []

	def senden(self, n):
		g = self.k.nachricht_lesen(n["rohinhalt"])
		if not g["ok"]:
			raise ValueError("Ausgehende Nachricht ungültig")
		heute = time.strftime("%Y-%m-%d", time.gmtime())
		d = self._lesen()
		for a in self.k.simulator_antworten(g, {}, seed=self.seed, heute=heute):
			d["ausstehend"].append({"faellig": time.time() + a["nachTagen"] * self.sek_je_tag, "code": a["code"], "prozesscode": a["prozesscode"], "daten": a["daten"], "absender": g["kopf"]["empfaenger"], "empfaenger": g["kopf"]["absender"], "conversationId": g["kopf"]["conversationId"]})
		self._schreiben(d)

	def empfangen(self):
		d = self._lesen()
		jetzt = time.time()
		faellig = [a for a in d["ausstehend"] if a["faellig"] <= jetzt]
		if not faellig:
			return []
		d["ausstehend"] = [a for a in d["ausstehend"] if a["faellig"] > jetzt]
		self._schreiben(d)
		aus = []
		for a in faellig:
			daten = a["daten"]
			if a["code"] == "DATEN_CRMSG" and daten.get("tag"):
				daten = {"MeteringPoint": daten["MeteringPoint"], "ECID": daten.get("ECID"), "Energy": self.k.simulator_energiedaten(zaehlpunktnummer=daten["MeteringPoint"], tag=daten["tag"], richtung="verbrauch", seed=self.seed)}
			self.zaehler += 1
			j = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
			xml = self.k.nachricht_bauen({"code": a["code"], "prozesscode": a["prozesscode"], "absender": a["absender"], "empfaenger": a["empfaenger"], "erstellt": j, "messageId": self.k.eda_id(a["absender"], j, f"S{self.zaehler:05d}"), "conversationId": a["conversationId"], "prozessdatum": j[:10], "modus": "SIMU", "daten": daten})
			aus.append((xml, lambda ok: None))
		return aus


# ================================================================ S/MIME über das System-Programm openssl (optional)


class Smime:
	"""Signieren/Verschlüsseln bzw. Entschlüsseln/Prüfen mit `openssl smime` – Pfade aus der Umgebung, keine Schlüssel im Code."""

	def __init__(self, env):
		self.zert = env.get("EDA_SMIME_ZERT") or ""
		self.schluessel = env.get("EDA_SMIME_SCHLUESSEL") or ""
		self.partner_ordner = env.get("EDA_SMIME_PARTNER_ORDNER") or ""
		self.ca = env.get("EDA_SMIME_CA") or ""
		self.aktiv = bool(self.zert and self.schluessel)

	def pruefen(self):
		if not self.aktiv:
			return []
		fehler = [f"{n} fehlt" for n, p in (("EDA_SMIME_ZERT", self.zert), ("EDA_SMIME_SCHLUESSEL", self.schluessel)) if not os.path.isfile(p)]
		if not shutil.which("openssl"):
			fehler.append("openssl nicht installiert (für S/MIME nötig)")
		return fehler

	def _lauf(self, args, eingabe):
		r = subprocess.run(["openssl", "smime", *args], input=eingabe, capture_output=True, timeout=60, check=False)  # noqa: S603 – feste Argumente, keine Shell
		if r.returncode != 0:
			raise RuntimeError("openssl smime fehlgeschlagen")
		return r.stdout

	def signieren_verschluesseln(self, mime_bytes, empfaenger_mp):
		partner = os.path.join(self.partner_ordner, f"{empfaenger_mp}.pem")
		signiert = self._lauf(["-sign", "-signer", self.zert, "-inkey", self.schluessel, "-binary"], mime_bytes)
		if not os.path.isfile(partner):
			return signiert
		return self._lauf(["-encrypt", "-aes256", partner], signiert)

	def entschluesseln_pruefen(self, roh):
		daten = roh
		if b"application/pkcs7-mime" in roh[:4000] or b"application/x-pkcs7-mime" in roh[:4000]:
			daten = self._lauf(["-decrypt", "-recip", self.zert, "-inkey", self.schluessel], roh)
		if b"pkcs7-signature" in daten[:8000] and self.ca:
			daten = self._lauf(["-verify", "-CAfile", self.ca], daten)
		return daten


# ================================================================ E-Mail-Anbindung (SMTP/IMAP mit TLS)


class EmailAdapter:
	kanal = "email"

	def __init__(self, env, ca_datei=""):
		self.env = env
		self.ca = ca_datei
		self.smtp_host = env.get("EDA_SMTP_HOST") or ""
		self.smtp_port = int(env.get("EDA_SMTP_PORT") or 465)
		self.imap_host = env.get("EDA_IMAP_HOST") or ""
		self.imap_port = int(env.get("EDA_IMAP_PORT") or 993)
		self.benutzer = env.get("EDA_EMAIL_BENUTZER") or ""
		self._passwort = env.get("EDA_EMAIL_PASSWORT") or ""
		self.absender = env.get("EDA_EMAIL_ABSENDER") or self.benutzer
		self.ordner = env.get("EDA_IMAP_ORDNER") or "INBOX"
		self.erledigt = env.get("EDA_IMAP_ORDNER_ERLEDIGT") or ""
		self.adressen_datei = env.get("EDA_EMAIL_ADRESSEN") or ""
		self.smime = Smime(env)

	def pruefen(self):
		f = []
		for n, w in (("EDA_SMTP_HOST", self.smtp_host), ("EDA_IMAP_HOST", self.imap_host), ("EDA_EMAIL_BENUTZER", self.benutzer), ("EDA_EMAIL_PASSWORT", self._passwort), ("EDA_EMAIL_ADRESSEN", self.adressen_datei)):
			if not w:
				f.append(f"{n} fehlt")
		if self.adressen_datei and not os.path.isfile(self.adressen_datei):
			f.append("EDA_EMAIL_ADRESSEN zeigt auf keine Datei")
		return f + self.smime.pruefen()

	def _adresse(self, marktpartner):
		with open(self.adressen_datei, encoding="utf-8") as f:
			tabelle = json.load(f)
		a = tabelle.get(marktpartner)
		if not a:
			raise LookupError("Keine E-Mail-Adresse für diesen Marktpartner hinterlegt")
		return a

	def nachricht_bauen(self, n):
		m = EmailMessage()
		m["From"] = self.absender
		m["To"] = self._adresse(n["empfaenger"])
		m["Subject"] = f"{n.get('nachrichtencode')} {n.get('messageId')}"
		m["Message-ID"] = make_msgid(domain=(self.absender.split("@")[-1] or "localhost"))
		m.set_content(f"EDA-Nachricht {n.get('nachrichtencode')} ({n.get('messageId')}) im Anhang.")
		m.add_attachment(n["rohinhalt"].encode("utf-8"), maintype="application", subtype="xml", filename=_dateiname(n))
		return m

	def senden(self, n):
		m = self.nachricht_bauen(n)
		roh = m.as_bytes(policy=email.policy.SMTP)
		if self.smime.aktiv:
			roh = self.smime.signieren_verschluesseln(roh, n["empfaenger"])
		ctx = _tls(self.ca)
		if self.smtp_port == 465:
			with smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=ctx, timeout=60) as s:
				s.login(self.benutzer, self._passwort)
				s.sendmail(self.absender, [m["To"]], roh)
		else:
			with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=60) as s:
				s.starttls(context=ctx)
				s.login(self.benutzer, self._passwort)
				s.sendmail(self.absender, [m["To"]], roh)

	@staticmethod
	def anhaenge(roh):
		"""XML-Anhänge einer (entschlüsselten) E-Mail."""
		m = email.message_from_bytes(roh, policy=email.policy.default)
		aus = []
		for teil in m.walk():
			name = (teil.get_filename() or "").lower()
			typ = teil.get_content_type()
			if name.endswith(".xml") or typ in ("application/xml", "text/xml"):
				nutz = teil.get_payload(decode=True) or b""
				aus.append(nutz.decode("utf-8", errors="replace"))
		return aus

	def empfangen(self):
		"""Ungelesene Nachrichten mit XML-Anhang. Die Verbindung bleibt bis abschliessen() offen (quittieren markiert gelesen)."""
		aus = []
		c = imaplib.IMAP4_SSL(self.imap_host, self.imap_port, ssl_context=_tls(self.ca), timeout=60)
		self._verbindung = c
		c.login(self.benutzer, self._passwort)
		c.select(self.ordner)
		_typ, daten = c.search(None, "UNSEEN")
		for uid in (daten[0] or b"").split()[:200]:
			_t, teile = c.fetch(uid, "(RFC822)")
			roh = teile[0][1] if teile and teile[0] else b""
			try:
				inhalt = self.smime.entschluesseln_pruefen(roh) if self.smime.aktiv else roh
				xmls = self.anhaenge(inhalt)
			except RuntimeError:
				xmls = []
			for i, xml in enumerate(xmls):

				def quittieren(ok, uid=uid, letzter=i == len(xmls) - 1):
					if not letzter:
						return
					c.store(uid, "+FLAGS", r"\Seen" if ok else r"\Flagged")
					if ok and self.erledigt:
						c.copy(uid, self.erledigt)

				aus.append((xml, quittieren))
		return aus

	def abschliessen(self):
		c = getattr(self, "_verbindung", None)
		if c is not None:
			try:
				c.logout()
			except (imaplib.IMAP4.error, OSError):
				pass
			self._verbindung = None


# ================================================================ KEP (Kommunikationsendpunkt)


class KepAdapter:
	"""KEP-Software über Austauschordner (EDA_KEP_MODUS=ordner) oder HTTPS mit Client-Zertifikat (EDA_KEP_MODUS=https).
	Schnittstelle der KEP-Software je Anbieter (zu bestätigen); HTTPS-Endpunkte: POST {EDA_KEP_URL}/ausgang (XML),
	GET {EDA_KEP_URL}/eingang (JSON-Liste {id, xml}), POST {EDA_KEP_URL}/eingang/{id}/quittung."""

	kanal = "kep"

	def __init__(self, env, ca_datei=""):
		self.modus = (env.get("EDA_KEP_MODUS") or "ordner").lower()
		self.ca = ca_datei
		self.url = (env.get("EDA_KEP_URL") or "").rstrip("/")
		self.zert = env.get("EDA_KEP_ZERT") or ""
		self.schluessel = env.get("EDA_KEP_SCHLUESSEL") or ""
		self.ordner = DateiAdapter(env.get("EDA_KEP_ORDNER") or tempfile.gettempdir()) if self.modus == "ordner" and env.get("EDA_KEP_ORDNER") else None

	def pruefen(self):
		if self.modus == "ordner":
			return [] if self.ordner else ["EDA_KEP_ORDNER fehlt"]
		f = []
		if not self.url.startswith("https://"):
			f.append("EDA_KEP_URL muss mit https:// beginnen")
		for n, p in (("EDA_KEP_ZERT", self.zert), ("EDA_KEP_SCHLUESSEL", self.schluessel)):
			if not p or not os.path.isfile(p):
				f.append(f"{n} fehlt")
		return f

	def _req(self, methode, pfad, body=None, typ="application/xml"):
		req = urllib.request.Request(f"{self.url}{pfad}", data=body, method=methode, headers={"Content-Type": typ, "Accept": "application/json"})
		with urllib.request.urlopen(req, timeout=60, context=_tls(self.ca, self.zert, self.schluessel)) as r:
			return r.read()

	def senden(self, n):
		if self.ordner:
			return self.ordner.senden(n)
		self._req("POST", "/ausgang", n["rohinhalt"].encode("utf-8"))
		return None

	def empfangen(self):
		if self.ordner:
			return self.ordner.empfangen()
		liste = json.loads(self._req("GET", "/eingang").decode("utf-8") or "[]")
		aus = []
		for e in liste[:200]:

			def quittieren(ok, eid=e["id"]):
				if ok:
					self._req("POST", f"/eingang/{eid}/quittung", b"{}", "application/json")

			aus.append((e["xml"], quittieren))
		return aus
