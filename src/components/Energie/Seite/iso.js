// Kleine Helfer für isometrische Inline-SVG-Szenen (Server, ohne Abhängigkeiten)
// Koordinaten: x nach rechts hinten, y nach links vorne, z nach oben – in „Rastereinheiten“.

export function isoProjektion({ s = 36, ox = 0, oy = 0 } = {}) {
  const c = Math.cos(Math.PI / 6);
  const p = (x, y, z = 0) => [ox + (x - y) * c * s, oy + (x + y) * 0.5 * s - z * s];
  const pts = (...liste) => liste.map(([x, y, z]) => p(x, y, z).map((v) => v.toFixed(1)).join(",")).join(" ");
  return { p, pts };
}

/** Quader: liefert drei Flächen (oben, links-vorne, rechts-vorne) als Polygon-Punktlisten */
export function quader(pts, x, y, z, w, d, h) {
  return {
    oben: pts([x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]),
    links: pts([x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]),
    rechts: pts([x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]),
  };
}
