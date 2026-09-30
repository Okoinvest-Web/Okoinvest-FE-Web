# Copyright (c) 2026, ÖkoInvest GmbH
#
# IBAN/BIC prüfen und SEPA-Überweisungsdatei pain.001.001.09 erzeugen (Spiegel von src/lib/plattform/finanzen/sepa.js).
# Die Datei wird im Online-Banking/EBICS eingereicht – die App führt keine Zahlung aus. Vor dem ersten Einsatz mit der
# Hausbank abstimmen (Testeinreichung; Version 09 ist bei AT/DE-Banken üblich, DK-Verfahren ab 3.7).
# Ohne Frappe-Import (python -m unittest).

import re
import unicodedata
from datetime import datetime, timezone
from xml.sax.saxutils import escape

IBAN_LAENGE = {
	"AT": 20, "BE": 16, "BG": 22, "CH": 21, "CY": 28, "CZ": 24, "DE": 22, "DK": 18, "EE": 20, "ES": 24, "FI": 18, "FR": 27, "GB": 22, "GR": 27, "HR": 21, "HU": 28, "IE": 22,
	"IS": 26, "IT": 27, "LI": 21, "LT": 20, "LU": 20, "LV": 21, "MC": 27, "MT": 31, "NL": 18, "NO": 15, "PL": 28, "PT": 25, "RO": 24, "SE": 24, "SI": 19, "SK": 24, "SM": 27,
}


def iban_normalisieren(s):
	return re.sub(r"\s+", "", str(s or "")).upper()


def _ziffern(s):
	return "".join(str(ord(c) - 55) if c.isalpha() else c for c in s)


def iban_pruefen(iban):
	i = iban_normalisieren(iban)
	if not re.fullmatch(r"[A-Z]{2}\d{2}[A-Z0-9]{8,30}", i):
		return False
	if IBAN_LAENGE.get(i[:2]) != len(i):
		return False
	return int(_ziffern(i[4:] + i[:4])) % 97 == 1


def iban_bauen(land, bban):
	b = iban_normalisieren(bban)
	pz = 98 - int(_ziffern(f"{b}{land.upper()}00")) % 97
	return f"{land.upper()}{pz:02d}{b}"


def bic_pruefen(bic):
	return bool(re.fullmatch(r"[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?", str(bic or "").upper()))


def iban_maskieren(iban):
	i = iban_normalisieren(iban)
	if len(i) < 8:
		return "****" if i else ""
	t = i[:4] + "*" * (len(i) - 8) + i[-4:]
	return " ".join(t[k : k + 4] for k in range(0, len(t), 4))


def sepa_text(s, maximal=140):
	t = str(s or "")
	for a, b in (("Ä", "Ae"), ("Ö", "Oe"), ("Ü", "Ue"), ("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("&", "+"), ("€", "EUR"), ("–", "-"), ("—", "-")):
		t = t.replace(a, b)
	t = re.sub(r"[„“”\"]", "'", t)
	t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
	t = re.sub(r"[^A-Za-z0-9/\-?:().,'+ ]", " ", t)
	t = re.sub(r"\s{2,}", " ", t).strip()
	return t[:maximal].strip()


def sepa_id(s):
	return re.sub(r"[^A-Z0-9-]", "", str(s or "").upper())[:35]


def _betrag(x):
	return f"{round(float(x) + 1e-9, 2):.2f}"


def pain001(nachricht_id, ausfuehrung_am, auftraggeber, zahlungen, erstellt_am=None):
	"""auftraggeber {name, iban, bic?}; zahlungen [{endToEndId, betrag, name, iban, bic?, verwendungszweck}] – wirft ValueError bei ungültigen Daten."""
	if not zahlungen:
		raise ValueError("Keine Zahlungen")
	if not iban_pruefen(auftraggeber.get("iban")):
		raise ValueError("IBAN des Auftraggebers ungültig")
	if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(ausfuehrung_am or "")):
		raise ValueError("Ausführungsdatum ungültig")
	for z in zahlungen:
		if not iban_pruefen(z.get("iban")):
			raise ValueError(f"IBAN ungültig ({z.get('endToEndId')})")
		if not float(z.get("betrag") or 0) > 0:
			raise ValueError(f"Betrag ungültig ({z.get('endToEndId')})")
		if z.get("bic") and not bic_pruefen(z["bic"]):
			raise ValueError(f"BIC ungültig ({z.get('endToEndId')})")
	anzahl = len(zahlungen)
	summe = _betrag(sum(round(float(z["betrag"]), 2) for z in zahlungen))
	msg = sepa_id(nachricht_id)
	zeit = (erstellt_am or datetime.now(timezone.utc)).strftime("%Y-%m-%dT%H:%M:%SZ")
	ag_bic = f"<FinInstnId><BICFI>{escape(auftraggeber['bic'].upper())}</BICFI></FinInstnId>" if auftraggeber.get("bic") and bic_pruefen(auftraggeber["bic"]) else "<FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId>"
	tx = []
	for z in zahlungen:
		agt = f"\n        <CdtrAgt><FinInstnId><BICFI>{escape(z['bic'].upper())}</BICFI></FinInstnId></CdtrAgt>" if z.get("bic") and bic_pruefen(z["bic"]) else ""
		tx.append(
			f"""      <CdtTrfTxInf>
        <PmtId><EndToEndId>{escape(sepa_id(z.get('endToEndId')) or 'NOTPROVIDED')}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">{_betrag(z['betrag'])}</InstdAmt></Amt>{agt}
        <Cdtr><Nm>{escape(sepa_text(z.get('name'), 70))}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>{escape(iban_normalisieren(z['iban']))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>{escape(sepa_text(z.get('verwendungszweck'), 140))}</Ustrd></RmtInf>
      </CdtTrfTxInf>"""
		)
	name = escape(sepa_text(auftraggeber.get("name"), 70))
	return f"""<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09 pain.001.001.09.xsd">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>{escape(msg)}</MsgId>
      <CreDtTm>{zeit}</CreDtTm>
      <NbOfTxs>{anzahl}</NbOfTxs>
      <CtrlSum>{summe}</CtrlSum>
      <InitgPty><Nm>{name}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>{escape(sepa_id(msg + '-1'))}</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <BtchBookg>true</BtchBookg>
      <NbOfTxs>{anzahl}</NbOfTxs>
      <CtrlSum>{summe}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt><Dt>{escape(ausfuehrung_am)}</Dt></ReqdExctnDt>
      <Dbtr><Nm>{name}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>{escape(iban_normalisieren(auftraggeber['iban']))}</IBAN></Id></DbtrAcct>
      <DbtrAgt>{ag_bic}</DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
{chr(10).join(tx)}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>
"""


def pain001_pruefen(text):
	"""Strukturprüfung ohne XSD (wie pain001Pruefen in JS). Liefert Fehlerliste (leer = in Ordnung)."""
	import xml.etree.ElementTree as ET

	f = []
	ns = "{urn:iso:std:iso:20022:tech:xsd:pain.001.001.09}"
	try:
		root = ET.fromstring(text.encode("utf-8"))
	except ET.ParseError as e:
		return [f"XML nicht wohlgeformt: {e}"]
	if root.tag != f"{ns}Document":
		f.append("Namespace pain.001.001.09 fehlt")
	for tag in ("CstmrCdtTrfInitn", "GrpHdr", "MsgId", "CreDtTm", "NbOfTxs", "CtrlSum", "InitgPty", "PmtInf", "PmtInfId", "PmtMtd", "ReqdExctnDt", "Dbtr", "DbtrAcct", "DbtrAgt", "ChrgBr"):
		if root.find(f".//{ns}{tag}") is None:
			f.append(f"Element {tag} fehlt")
	txs = root.findall(f".//{ns}CdtTrfTxInf")
	betraege = [e.text for e in root.findall(f".//{ns}InstdAmt")]
	if not txs:
		f.append("Keine Transaktionen")
	if any(int(e.text) != len(txs) for e in root.findall(f".//{ns}NbOfTxs")):
		f.append("NbOfTxs passt nicht zur Anzahl der Transaktionen")
	if any(not re.fullmatch(r"\d+\.\d{2}", b or "") or float(b) <= 0 for b in betraege):
		f.append("Betrag nicht im Format 0.00 oder ≤ 0")
	s = f"{sum(float(b) for b in betraege):.2f}"
	if any(e.text != s for e in root.findall(f".//{ns}CtrlSum")):
		f.append("CtrlSum passt nicht zur Summe der Beträge")
	for e in root.findall(f".//{ns}IBAN"):
		if not iban_pruefen(e.text):
			f.append("IBAN ungültig")
	for tag in ("MsgId", "PmtInfId", "EndToEndId"):
		for e in root.findall(f".//{ns}{tag}"):
			if not e.text or len(e.text) > 35:
				f.append(f"{tag} leer oder länger als 35 Zeichen")
	return f
