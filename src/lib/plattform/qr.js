// src/lib/plattform/qr.js
//
// QR-Code-Encoder ohne Fremdpakete (ISO/IEC 18004): Byte-Modus, Fehlerkorrektur M,
// Versionen 1–10 (bis 213 Byte – genug für otpauth-URIs), automatische Maskenwahl.
// Client- und serverseitig nutzbar. Ausgabe als Modul-Matrix bzw. SVG-Pfad.
//
// Aufbau nach dem Referenzverfahren: Funktionsmuster (Finder, Timing, Ausrichtung, Format-/
// Versionsinformation) → Daten + Reed-Solomon je Block (GF(256), Polynom 0x11D) → verschränken →
// Zickzack-Platzierung → beste von 8 Masken nach den Strafpunkten der Norm.

// Version → [EC-Codewörter je Block, [[Blockanzahl, Datenwörter je Block], …]] für Stufe M
const EC_M = {
  1: [10, [[1, 16]]],
  2: [16, [[1, 28]]],
  3: [26, [[1, 44]]],
  4: [18, [[2, 32]]],
  5: [24, [[2, 43]]],
  6: [16, [[4, 27]]],
  7: [18, [[4, 31]]],
  8: [22, [[2, 38], [2, 39]]],
  9: [22, [[3, 36], [2, 37]]],
  10: [26, [[4, 43], [1, 44]]],
};
const AUSRICHTUNG = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
export const QR_MAX_VERSION = 10;

const datenWoerter = (ver) => EC_M[ver][1].reduce((s, [n, d]) => s + n * d, 0);

// ---------------------------------------------------------------- Reed-Solomon über GF(256)
function mul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
}

function rsDivisor(grad) {
  const r = new Array(grad).fill(0);
  r[grad - 1] = 1;
  let wurzel = 1;
  for (let i = 0; i < grad; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mul(r[j], wurzel);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    wurzel = mul(wurzel, 0x02);
  }
  return r;
}

function rsRest(daten, divisor) {
  const r = divisor.map(() => 0);
  for (const b of daten) {
    const faktor = b ^ r.shift();
    r.push(0);
    divisor.forEach((c, i) => {
      r[i] ^= mul(c, faktor);
    });
  }
  return r;
}

// ---------------------------------------------------------------- Kodierung
function codewoerter(bytes, ver) {
  const bits = [];
  const push = (wert, laenge) => {
    for (let i = laenge - 1; i >= 0; i--) bits.push((wert >>> i) & 1);
  };
  push(0b0100, 4); // Byte-Modus
  push(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const kapazitaet = datenWoerter(ver) * 8;
  push(0, Math.min(4, kapazitaet - bits.length)); // Terminator
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < kapazitaet; pad ^= 0xec ^ 0x11) push(pad, 8);
  const daten = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    daten.push(b);
  }
  // Blöcke + Fehlerkorrektur, dann verschränken
  const [ecLaenge, gruppen] = EC_M[ver];
  const divisor = rsDivisor(ecLaenge);
  const bloecke = [];
  let k = 0;
  for (const [anzahl, laenge] of gruppen) {
    for (let i = 0; i < anzahl; i++) {
      const d = daten.slice(k, k + laenge);
      k += laenge;
      bloecke.push({ d, e: rsRest(d, divisor) });
    }
  }
  const out = [];
  const maxD = Math.max(...bloecke.map((b) => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of bloecke) if (i < b.d.length) out.push(b.d[i]);
  for (let i = 0; i < ecLaenge; i++) for (const b of bloecke) out.push(b.e[i]);
  return out;
}

const MASKEN = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

function strafpunkte(m) {
  const n = m.length;
  let p = 0;
  // Regel 1: Läufe gleicher Farbe ≥ 5 (Zeilen und Spalten)
  for (let a = 0; a < n; a++) {
    for (const zeile of [true, false]) {
      let lauf = 1;
      for (let b = 1; b < n; b++) {
        const vorher = zeile ? m[a][b - 1] : m[b - 1][a];
        const jetzt = zeile ? m[a][b] : m[b][a];
        if (jetzt === vorher) lauf++;
        else {
          if (lauf >= 5) p += 3 + (lauf - 5);
          lauf = 1;
        }
      }
      if (lauf >= 5) p += 3 + (lauf - 5);
    }
  }
  // Regel 2: 2×2-Blöcke
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
  // Regel 3: Finder-ähnliche Muster 1011101 mit 4 hellen Modulen davor/danach
  const muster = [
    [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1],
  ];
  for (let a = 0; a < n; a++) {
    for (let b = 0; b + 11 <= n; b++) {
      for (const mu of muster) {
        if (mu.every((w, i) => (m[a][b + i] ? 1 : 0) === w)) p += 40;
        if (mu.every((w, i) => (m[b + i][a] ? 1 : 0) === w)) p += 40;
      }
    }
  }
  // Regel 4: Anteil dunkler Module
  let dunkel = 0;
  for (const zeile of m) for (const z of zeile) if (z) dunkel++;
  const gesamt = n * n;
  p += (Math.ceil(Math.abs(dunkel * 20 - gesamt * 10) / gesamt) - 1) * 10;
  return p;
}

/**
 * QR-Code als Matrix (Array von Zeilen, true = dunkel), ohne Ruhezone.
 * `maske` (0–7) nur für Tests; Standard: automatische Wahl.
 */
export function qrMatrix(text, { maske: festeMaske } = {}) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let ver = 0;
  for (let v = 1; v <= QR_MAX_VERSION; v++) {
    if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= datenWoerter(v) * 8) {
      ver = v;
      break;
    }
  }
  if (!ver) throw new Error("Text zu lang für den QR-Code.");
  const groesse = ver * 4 + 17;
  const m = Array.from({ length: groesse }, () => new Array(groesse).fill(false));
  const funktion = Array.from({ length: groesse }, () => new Array(groesse).fill(false));
  const setze = (x, y, dunkel) => {
    m[y][x] = dunkel;
    funktion[y][x] = true;
  };

  // Timing, Finder (mit Trennlinie), Ausrichtung
  for (let i = 0; i < groesse; i++) {
    setze(6, i, i % 2 === 0);
    setze(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < groesse && y >= 0 && y < groesse) setze(x, y, d !== 2 && d !== 4);
      }
    }
  };
  finder(3, 3);
  finder(groesse - 4, 3);
  finder(3, groesse - 4);
  const pos = AUSRICHTUNG[ver];
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === pos.length - 1) || (i === pos.length - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setze(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }

  // Formatinformation (Stufe M = 00) inkl. dunklem Modul
  const format = (maske) => {
    const daten = (0 << 3) | maske;
    let rest = daten;
    for (let i = 0; i < 10; i++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    const bits = ((daten << 10) | rest) ^ 0x5412;
    const bit = (i) => ((bits >>> i) & 1) !== 0;
    for (let i = 0; i <= 5; i++) setze(8, i, bit(i));
    setze(8, 7, bit(6));
    setze(8, 8, bit(7));
    setze(7, 8, bit(8));
    for (let i = 9; i < 15; i++) setze(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) setze(groesse - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) setze(8, groesse - 15 + i, bit(i));
    setze(8, groesse - 8, true);
  };
  format(0);

  // Versionsinformation (ab Version 7)
  if (ver >= 7) {
    let rest = ver;
    for (let i = 0; i < 12; i++) rest = (rest << 1) ^ ((rest >>> 11) * 0x1f25);
    const bits = (ver << 12) | rest;
    for (let i = 0; i < 18; i++) {
      const b = ((bits >>> i) & 1) !== 0;
      const a = groesse - 11 + (i % 3);
      const c = Math.floor(i / 3);
      setze(a, c, b);
      setze(c, a, b);
    }
  }

  // Daten im Zickzack platzieren
  const cw = codewoerter(bytes, ver);
  let i = 0;
  const gesamtBits = cw.length * 8;
  for (let rechts = groesse - 1; rechts >= 1; rechts -= 2) {
    if (rechts === 6) rechts = 5;
    for (let vert = 0; vert < groesse; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = rechts - j;
        const hoch = ((rechts + 1) & 2) === 0;
        const y = hoch ? groesse - 1 - vert : vert;
        if (!funktion[y][x] && i < gesamtBits) {
          m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
          i++;
        }
      }
    }
  }

  const maskieren = (k) => {
    for (let y = 0; y < groesse; y++) for (let x = 0; x < groesse; x++) if (!funktion[y][x] && MASKEN[k](x, y)) m[y][x] = !m[y][x];
  };
  let beste = festeMaske;
  if (beste === undefined) {
    let min = Infinity;
    for (let k = 0; k < 8; k++) {
      maskieren(k);
      format(k);
      const p = strafpunkte(m);
      if (p < min) {
        min = p;
        beste = k;
      }
      maskieren(k); // rückgängig (XOR)
    }
  }
  maskieren(beste);
  format(beste);
  return m;
}

/** SVG-Pfad (ein Rechteck je dunklem Modul) inkl. Ruhezone; `groesse` = Kantenlänge in Modulen */
export function qrSvg(text, { rand = 4 } = {}) {
  const m = qrMatrix(text);
  let pfad = "";
  m.forEach((zeile, y) => {
    let x = 0;
    while (x < zeile.length) {
      if (!zeile[x]) {
        x++;
        continue;
      }
      let l = 1;
      while (x + l < zeile.length && zeile[x + l]) l++;
      pfad += `M${x + rand} ${y + rand}h${l}v1h-${l}z`;
      x += l;
    }
  });
  return { groesse: m.length + rand * 2, pfad, module: m.length };
}
