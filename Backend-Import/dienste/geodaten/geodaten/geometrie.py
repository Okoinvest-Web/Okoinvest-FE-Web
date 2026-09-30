# Reine Geometrie-Helfer (ohne GIS-Bibliotheken) – Gegenstück zu src/lib/plattform/geodaten/geo.js.
# Koordinaten (lon, lat) in WGS84. Für die Datenbank rechnet der Dienst exakt in EPSG:31287 (PostGIS);
# diese Funktionen dienen der reinen Scoring-Logik, Tests und der Demo ohne Datenbank.

import math

ERDRADIUS_M = 6371008.8
RAD = math.pi / 180


def distanz_m(a, b):
	"""Großkreisentfernung (Haversine) in Metern zwischen (lon, lat) und (lon, lat)."""
	d_lat = (b[1] - a[1]) * RAD
	d_lon = (b[0] - a[0]) * RAD
	h = math.sin(d_lat / 2) ** 2 + math.cos(a[1] * RAD) * math.cos(b[1] * RAD) * math.sin(d_lon / 2) ** 2
	return 2 * ERDRADIUS_M * math.asin(min(1.0, math.sqrt(h)))


def projektor(bezug):
	kx = math.cos(bezug[1] * RAD) * ERDRADIUS_M * RAD
	ky = ERDRADIUS_M * RAD
	return lambda p: ((p[0] - bezug[0]) * kx, (p[1] - bezug[1]) * ky)


def ringe(geometrie):
	if not geometrie:
		return []
	if geometrie.get("type") == "Polygon":
		return [geometrie["coordinates"]]
	if geometrie.get("type") == "MultiPolygon":
		return geometrie["coordinates"]
	return []


def _ring_flaeche(ring):
	s = 0.0
	j = len(ring) - 1
	for i in range(len(ring)):
		s += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
		j = i
	return s / 2


def bbox(geometrie):
	b = [math.inf, math.inf, -math.inf, -math.inf]

	def lauf(c):
		if isinstance(c[0], (int, float)):
			b[0], b[1] = min(b[0], c[0]), min(b[1], c[1])
			b[2], b[3] = max(b[2], c[0]), max(b[3], c[1])
		else:
			for x in c:
				lauf(x)

	lauf(geometrie["coordinates"])
	return b


def flaeche_m2(geometrie):
	teile = ringe(geometrie)
	if not teile:
		return 0.0
	bb = bbox(geometrie)
	p = projektor(((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2))
	s = 0.0
	for poly in teile:
		for i, ring in enumerate(poly):
			a = abs(_ring_flaeche([p(q) for q in ring]))
			s += a if i == 0 else -a
	return max(0.0, s)


def konvexe_huelle(punkte):
	p = sorted(set(map(tuple, punkte)))
	if len(p) < 3:
		return p

	def kreuz(o, a, b):
		return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

	unten, oben = [], []
	for q in p:
		while len(unten) >= 2 and kreuz(unten[-2], unten[-1], q) <= 0:
			unten.pop()
		unten.append(q)
	for q in reversed(p):
		while len(oben) >= 2 and kreuz(oben[-2], oben[-1], q) <= 0:
			oben.pop()
		oben.append(q)
	return unten[:-1] + oben[:-1]


def kompaktheit(geometrien, flaeche):
	"""Wie kompaktheit() in geo.js: Solidity (Fläche/konvexe Hülle) × Streckungsfaktor der Hauptachsen."""
	alle = [pt for g in geometrien for poly in ringe(g) for pt in poly[0]]
	if len(alle) < 3 or not flaeche:
		return 0.0
	bb = bbox({"coordinates": alle})
	p = projektor(((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2))
	huelle = konvexe_huelle([p(q) for q in alle])
	h_a = abs(_ring_flaeche(huelle + [huelle[0]]))
	solidity = min(1.0, flaeche / h_a) if h_a > 0 else 0.0
	n = len(huelle)
	mx = sum(q[0] for q in huelle) / n
	my = sum(q[1] for q in huelle) / n
	sxx = sum((q[0] - mx) ** 2 for q in huelle)
	syy = sum((q[1] - my) ** 2 for q in huelle)
	sxy = sum((q[0] - mx) * (q[1] - my) for q in huelle)
	spur = sxx + syy
	d = math.sqrt(max(0.0, ((sxx - syy) / 2) ** 2 + sxy ** 2))
	l1 = spur / 2 + d
	l2 = max(1e-9, spur / 2 - d)
	verh = math.sqrt(l1 / l2)
	streckung = 1.0 if verh <= 2.5 else max(0.0, 1 - (verh - 2.5) / 5)
	return math.floor(solidity * streckung * 1000 + 0.5) / 1000


def punkt_in_polygon(pt, geometrie):
	def drin(ring):
		ja = False
		j = len(ring) - 1
		for i in range(len(ring)):
			xi, yi = ring[i][0], ring[i][1]
			xj, yj = ring[j][0], ring[j][1]
			if (yi > pt[1]) != (yj > pt[1]) and pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi + 1e-300) + xi:
				ja = not ja
			j = i
		return ja

	for poly in ringe(geometrie):
		if drin(poly[0]) and not any(drin(r) for r in poly[1:]):
			return True
	return False


def neigung_exposition(dz_dx, dz_dy):
	"""Neigung (Grad) und Exposition (N, NO, O, SO, S, SW, W, NW, eben) aus Gradienten in m/m (x = Ost, y = Nord)."""
	neigung = math.degrees(math.atan(math.hypot(dz_dx, dz_dy)))
	if neigung < 1:
		return neigung, "eben"
	# Hang fällt in Richtung des negativen Gradienten ab
	azimut = (math.degrees(math.atan2(-dz_dx, -dz_dy)) + 360) % 360
	richtungen = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"]
	return neigung, richtungen[int((azimut + 22.5) // 45) % 8]
