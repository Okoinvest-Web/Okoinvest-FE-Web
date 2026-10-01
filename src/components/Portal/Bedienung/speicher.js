// src/components/Portal/Bedienung/speicher.js
//
// localStorage-Helfer für reine Bedien-Vorlieben (zuletzt verwendet, Tastenkürzel an/aus,
// gespeicherte Listen-Ansichten, Installationshinweis). Nie für vertrauliche Daten –
// alles hier ist nur eine Bequemlichkeit und darf jederzeit fehlen (privates Fenster, blockiert).

export function speicherLesen(schluessel, standard = null) {
  try {
    const roh = window.localStorage.getItem(schluessel);
    return roh === null ? standard : JSON.parse(roh);
  } catch {
    return standard;
  }
}

export function speicherSchreiben(schluessel, wert) {
  try {
    if (wert === null || wert === undefined) window.localStorage.removeItem(schluessel);
    else window.localStorage.setItem(schluessel, JSON.stringify(wert));
  } catch {
    /* Speicher nicht verfügbar – ohne Vorliebe weiter */
  }
}

export const KUERZEL_AUS = "oi-kuerzel-aus";
export const EREIGNIS_PALETTE = "oi:palette";
export const EREIGNIS_KUERZEL = "oi:kuerzel";
export const EREIGNIS_KUERZEL_EINSTELLUNG = "oi:kuerzel-einstellung";
export const EREIGNIS_SEITENLEISTE = "oi:seitenleiste"; // Seitenleiste ein-/ausklappen (Kürzel „[“, Befehlspalette)

/** Seitenleiste des Portals ein-/ausklappen (Desktop) */
export function seitenleisteUmschalten() {
  window.dispatchEvent(new CustomEvent(EREIGNIS_SEITENLEISTE));
}

/** Befehlspalette von überall öffnen (z. B. Suchknopf in der Kopfzeile) */
export function paletteOeffnen() {
  window.dispatchEvent(new CustomEvent(EREIGNIS_PALETTE));
}
