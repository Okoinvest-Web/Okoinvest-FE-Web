// src/lib/sprache/meldungen.js – englische Fassung der Formular- und Prüfmeldungen
//
// Die Prüfregeln (src/components/Portal/Bedienung/pruefung.js, src/components/formular/useFormular.js)
// und die Formulare erzeugen ihre Meldungen auf Deutsch – auch serverseitige Antworten. Auf englischen
// Seiten übersetzt meldungFuer() die bekannten Meldungen an EINER Stelle (useFormular, FormFehler),
// statt jede Regel doppelt zu führen. Unbekannte Meldungen bleiben deutsch (Rückfall wie im Wörterbuch).
//
//   meldungFuer("Bitte ausfüllen.", "en") → "Please fill in this field."
//
// Ergänzen: neues Paar [Muster, englischer Text | (treffer) => Text] in MUSTER.

const WAS = {
  "Der Vorname": "The first name",
  "Der Nachname": "The last name",
  "Die Nachricht": "The message",
  Eingabe: "The entry",
  "Der Name": "The name",
  "Die Bezeichnung": "The name",
  "Der Titel": "The title",
  "Die Beschreibung": "The description",
  Wert: "The value",
  Minimum: "The minimum",
};
const was = (w) => WAS[w] || w;
const zahl = (s) => String(s).replace(",", ".");

const MUSTER = [
  [/^Bitte ausfüllen\.$/, "Please fill in this field."],
  [/^Bitte geben Sie Ihren Vornamen an\.$/, "Please enter your first name."],
  [/^Bitte geben Sie Ihren Nachnamen an\.$/, "Please enter your last name."],
  [/^Bitte geben Sie Ihren Namen an\.$/, "Please enter your name."],
  [/^Bitte geben Sie Ihre E-Mail-Adresse an.*$/, "Please enter your e-mail address, e.g. name@company.com."],
  [/^Bitte geben Sie Ihr Unternehmen an\.$/, "Please enter your company."],
  [/^(.+) ist zu kurz \(mindestens (\d+) Zeichen\)\.$/, (_, w, n) => `${was(w)} is too short (at least ${n} character${n === "1" ? "" : "s"}).`],
  [/^(.+) ist zu lang \(höchstens (\d+) Zeichen\)\.$/, (_, w, n) => `${was(w)} is too long (at most ${n} character${n === "1" ? "" : "s"}).`],
  [/^Deutsche Postleitzahlen haben 5 Ziffern.*?(Liegt der Ort in Österreich oder der Schweiz\?.*)?$/, (_, z) => `German postcodes have 5 digits, e.g. 86825.${z ? " Is the place in Austria or Switzerland? Then please change the country above." : ""}`],
  [/^Postleitzahlen in Österreich haben 4 Ziffern.*?(Liegt der Ort in Deutschland\?.*)?$/, (_, z) => `Austrian postcodes have 4 digits, e.g. 5020.${z ? " Is the place in Germany? Then please change the country above." : ""}`],
  [/^Postleitzahlen in der Schweiz haben 4 Ziffern.*?(Liegt der Ort in Deutschland\?.*)?$/, (_, z) => `Swiss postcodes have 4 digits, e.g. 8001.${z ? " Is the place in Germany? Then please change the country above." : ""}`],
  [/^Bitte eine gültige Postleitzahl angeben\.$/, "Please enter a valid postcode."],
  [/^Bitte nur eine Zahl eingeben(?: \(in (.+)\))?, z\. B\. 12,5\.$/, (_, e) => `Please enter a number only${e ? ` (in ${e})` : ""}, e.g. 12.5.`],
  [/^(.+) muss mindestens (\S+)(?: (.+))? betragen\.$/, (_, w, n, e) => `${was(w)} must be at least ${zahl(n)}${e ? ` ${e}` : ""}.`],
  [/^(.+) darf höchstens (\S+)(?: (.+))? betragen – bitte Eingabe prüfen\.$/, (_, w, n, e) => `${was(w)} may be at most ${zahl(n)}${e ? ` ${e}` : ""} – please check your entry.`],
  [/^Bitte eine Telefonnummer mit Vorwahl angeben.*$/, "Please enter a phone number with area code, e.g. +49 8245 123456."],
  [/^Das sieht nicht nach einer E-Mail-Adresse aus.*$/, "That does not look like an e-mail address – please check (e.g. name@company.com)."],
  [/^(.+) ist größer als der Höchstwert – bitte tauschen\.$/, (_, w) => `${was(w)} is greater than the maximum – please swap them.`],
  [/^Für den gewünschten Rückruf brauchen wir Ihre Telefonnummer\.$/, "We need your phone number for the requested call-back."],
  [/^Die Eingaben stimmen nicht überein\.$/, "The entries do not match."],
  [/^Bitte bestätigen Sie diesen Punkt\.$/, "Please confirm this point."],
  [/^Bitte wählen Sie mindestens eine Option\.$/, "Please select at least one option."],
  [/^Bitte wählen Sie (?:einen|eine) .+\.$/, "Please make a selection."],
  [/^Die Verbindung ist gerade gestört.*$/, "The connection is currently disrupted. Your details are kept – please try again in a moment."],
  [/^Senden fehlgeschlagen\..*$/, "Sending failed. Your details are kept – please try again."],
  [/^Senden fehlgeschlagen$/, "Sending failed"],
  [/^Zu viele Anfragen.*$/, "Too many requests. Please wait a moment and try again."],
];

/** Meldung in der Sprache der Seite (bekannte Meldungen; sonst unverändert). */
export function meldungFuer(text, sprache) {
  if (sprache !== "en" || typeof text !== "string" || !text) return text;
  for (const [re, en] of MUSTER) {
    const m = text.match(re);
    if (m) return typeof en === "function" ? en(...m) : en;
  }
  return text;
}
