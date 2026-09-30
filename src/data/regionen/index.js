// src/data/regionen/index.js
//
// Regionalseiten /regionen/[slug]: je Region eine Datei mit eigenen, recherchierten
// Inhalten (Quellen und Stand in der Datei). Stammdaten und Kartenlage in meta.js.
// Neue Region: Datei anlegen, hier importieren und in meta.js eintragen.

import { META } from "./meta";
import schleswigHolstein from "./schleswig-holstein";
import bremen from "./bremen";
import hamburg from "./hamburg";
import mecklenburgVorpommern from "./mecklenburg-vorpommern";
import nordrheinWestfalen from "./nordrhein-westfalen";
import niedersachsen from "./niedersachsen";
import sachsenAnhalt from "./sachsen-anhalt";
import brandenburg from "./brandenburg";
import berlin from "./berlin";
import rheinlandPfalz from "./rheinland-pfalz";
import hessen from "./hessen";
import thueringen from "./thueringen";
import sachsen from "./sachsen";
import saarland from "./saarland";
import badenWuerttemberg from "./baden-wuerttemberg";
import bayern from "./bayern";
import vorarlberg from "./vorarlberg";
import tirol from "./tirol";
import salzburg from "./salzburg";
import oberoesterreich from "./oberoesterreich";
import niederoesterreich from "./niederoesterreich";
import wien from "./wien";
import kaernten from "./kaernten";
import steiermark from "./steiermark";
import burgenland from "./burgenland";
import schweiz from "./schweiz";

const DATEN = {
  "schleswig-holstein": schleswigHolstein,
  "bremen": bremen,
  "hamburg": hamburg,
  "mecklenburg-vorpommern": mecklenburgVorpommern,
  "nordrhein-westfalen": nordrheinWestfalen,
  "niedersachsen": niedersachsen,
  "sachsen-anhalt": sachsenAnhalt,
  "brandenburg": brandenburg,
  "berlin": berlin,
  "rheinland-pfalz": rheinlandPfalz,
  "hessen": hessen,
  "thueringen": thueringen,
  "sachsen": sachsen,
  "saarland": saarland,
  "baden-wuerttemberg": badenWuerttemberg,
  "bayern": bayern,
  "vorarlberg": vorarlberg,
  "tirol": tirol,
  "salzburg": salzburg,
  "oberoesterreich": oberoesterreich,
  "niederoesterreich": niederoesterreich,
  "wien": wien,
  "kaernten": kaernten,
  "steiermark": steiermark,
  "burgenland": burgenland,
  "schweiz": schweiz,
};

/** Alle Regionen in Kartenreihenfolge: Stammdaten (meta) + Inhalte (Datei) */
export const REGIONEN = META.map((m) => ({ ...DATEN[m.slug], ...m }));

export const regionFuer = (slug) => REGIONEN.find((r) => r.slug === slug) || null;

/** Nachbarregionen als vollständige Objekte */
export const nachbarnVon = (r) => (r?.nachbarn || []).map(regionFuer).filter(Boolean);
