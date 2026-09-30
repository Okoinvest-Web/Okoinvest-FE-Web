# Grundbuch-Adapter (Österreich) – VORBEREITET, NICHT AKTIV.
#
# Eigentümerdaten sind nicht frei. Abfragen laufen ausschließlich über JustizOnline bzw. eine zugelassene
# Grundbuch-Verrechnungsstelle (kostenpflichtig: Gerichtsgebühr je Auszug + Entgelt der Verrechnungsstelle) mit
# eigenem Vertrag. Es wird NICHTS gescrapt. Suche nur nach Grundstück (KG + Grundstücksnummer bzw. EZ), nie nach
# Person (§ 5 Abs. 4 GUG: Auskunft aus dem Personenverzeichnis nur bei rechtlichem Interesse).
#
# Datenschutz: Jede Abfrage wird mit Zweck, anfragender Person, Objekt und Zeitpunkt protokolliert (Rechenschaft,
# Art. 5 Abs. 2 DSGVO). Das Ergebnis (Eigentümername/-anschrift) gehört in das CRM der Plattform (Art.-14-Information
# beim Erstkontakt, Widerspruchsrecht), nicht in den Geodaten-Dienst. Details: docs/AKQUISE-GEODATEN.md.

from dataclasses import dataclass, field


class NichtKonfiguriert(RuntimeError):
	pass


@dataclass
class Abfrage:
	kg_nr: str
	gst_nr: str | None = None
	ez: str | None = None
	zweck: str = "Flächenakquise Freiflächen-PV – einmalige Kontaktaufnahme mit dem Eigentümer"
	angefragt_von: str = ""


@dataclass
class Auszug:
	kg_nr: str
	ez: str
	eigentuemer: list = field(default_factory=list)  # [{ name, anschrift, anteil }]
	lasten_kurz: list = field(default_factory=list)  # C-Blatt-Einträge (Kurztext, z. B. Dienstbarkeiten)
	abgefragt_am: str = ""
	kosten_eur: float = 0.0
	beleg_id: str = ""


class GrundbuchAdapter:
	"""Schnittstelle je Verrechnungsstelle. Konkrete Implementierung erst nach Vertragsabschluss (Webservice der Stelle)."""

	name = "unkonfiguriert"

	def abfragen(self, abfrage: Abfrage) -> Auszug:
		raise NichtKonfiguriert(
			"Grundbuchabfrage nicht eingerichtet: Vertrag mit einer Verrechnungsstelle abschließen, Zugang in der Konfiguration "
			"hinterlegen und Adapter implementieren (docs/AKQUISE-GEODATEN.md, Abschnitt Grundbuch)."
		)


def adapter():
	return GrundbuchAdapter()
