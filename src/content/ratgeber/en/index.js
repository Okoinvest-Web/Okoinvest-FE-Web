// src/content/ratgeber/en/index.js – Register der englischen Volltexte (Sprachmodell, von Hand gepflegt)
//
// Jede Datei <slug>.js in diesem Ordner enthält nur die Texte eines Artikels in derselben Struktur
// wie das Original (Abschnitte, Blöcke und Tabellenzeilen in gleicher Reihenfolge); ids, hrefs,
// Bilder und Zahlen kommen aus dem deutschen Artikel. Eintrag hier = Artikeltext ist englisch.
// Freigabe zur Indexierung: zusätzlich in UEBERSETZT (src/lib/sprache/seiten.js) mit Pfad
// „/ratgeber/<slug>“ eintragen – erst nach Sichtprüfung bei 1440 und 390.

import solarparkPachtProHektar from "./solarpark-pacht-pro-hektar.js";

export const VOLLTEXT_EN = Object.freeze({
  "solarpark-pacht-pro-hektar": solarparkPachtProHektar,
});
