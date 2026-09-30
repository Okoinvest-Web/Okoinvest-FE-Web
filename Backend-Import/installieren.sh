#!/usr/bin/env bash
# Copyright (c) 2026, ÖkoInvest GmbH
#
# Installation bzw. Update der Frappe-App „oekoinvest_app“ auf einem EIGENEN Frappe-v15-Server (Bench vorhanden).
# Enthält KEINE Geheimnisse – alle Werte kommen aus Umgebungsvariablen oder bleiben Platzhalter.
#
# Aufruf (als Benutzer der Bench, z. B. „frappe“):
#   SITE=backend.example.com \
#   BENCH=/home/frappe/frappe-bench \
#   BASIS_URL=https://www.oekoinvest.com \
#   HOST_NAME=https://backend.example.com \
#   API_EMAIL=plattform-web@example.com \
#   ANLAGEN_EMAIL=anlagen-dienst@example.com \
#   ADMIN_EMAIL=vorname.nachname@example.com ADMIN_VORNAME=Vorname ADMIN_NACHNAME=Nachname \
#   bash Backend-Import/installieren.sh
#
# Schritte: Prüfungen → Backup (bei Update) → App holen → install-app bzw. migrate → build → site_config →
# technische Benutzer → erstes Desk-Konto (Leitung) → Scheduler → Kurzbericht. Idempotent: mehrfach ausführbar.

set -euo pipefail

HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_QUELLE="${APP_QUELLE:-$HIER/oekoinvest_app}"
BENCH="${BENCH:-$HOME/frappe-bench}"
SITE="${SITE:?Bitte SITE=<site-name> setzen}"
APP=oekoinvest_app

schritt() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warnung() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
abbruch() { printf '\033[1;31mFEHLER: %s\033[0m\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------ Prüfungen
schritt "Prüfungen"
command -v bench >/dev/null || abbruch "bench nicht gefunden (Frappe-Bench installiert und im PATH?)"
[ -d "$BENCH/apps/frappe" ] || abbruch "Keine Bench unter $BENCH (BENCH=… setzen)"
[ -d "$BENCH/sites/$SITE" ] || abbruch "Site $SITE existiert nicht (bench new-site $SITE …)"
[ -f "$APP_QUELLE/pyproject.toml" ] || abbruch "App-Quelle nicht gefunden: $APP_QUELLE"
cd "$BENCH"
FRAPPE_VERSION="$(./env/bin/python -c 'import frappe; print(frappe.__version__)')"
case "$FRAPPE_VERSION" in
	15.*) echo "Frappe $FRAPPE_VERSION" ;;
	*) abbruch "Frappe v15 erforderlich, gefunden: $FRAPPE_VERSION" ;;
esac
if [ -f "$APP_QUELLE/../werkzeuge/pruefen.py" ]; then
	./env/bin/python "$APP_QUELLE/../werkzeuge/pruefen.py" --kurz || abbruch "Konsistenzprüfung meldet Fehler – bitte zuerst beheben."
fi

INSTALLIERT=0
if bench --site "$SITE" list-apps 2>/dev/null | grep -q "^$APP"; then INSTALLIERT=1; fi

# ------------------------------------------------------------------ Backup vor Update
if [ "$INSTALLIERT" = 1 ]; then
	schritt "Backup der Site (Update)"
	bench --site "$SITE" backup --with-files
fi

# ------------------------------------------------------------------ App holen
schritt "App bereitstellen"
if [ -d "$APP_QUELLE/.git" ]; then
	if [ -d "apps/$APP" ]; then
		(cd "apps/$APP" && git pull --ff-only) || warnung "git pull fehlgeschlagen – bitte manuell prüfen"
	else
		bench get-app "$APP_QUELLE"
	fi
else
	# lokaler Ordner ohne Git: nach apps/ spiegeln und editierbar installieren
	mkdir -p "apps/$APP"
	if command -v rsync >/dev/null; then
		rsync -a --delete --exclude '__pycache__' --exclude '*.pyc' --exclude 'node_modules' "$APP_QUELLE/" "apps/$APP/"
	else
		rm -rf "apps/$APP" && cp -a "$APP_QUELLE" "apps/$APP"
	fi
	./env/bin/pip install -q -e "apps/$APP"
	grep -qx "$APP" sites/apps.txt || echo "$APP" >> sites/apps.txt
fi

# ------------------------------------------------------------------ Installieren / Migrieren
if [ "$INSTALLIERT" = 0 ]; then
	schritt "install-app $APP"
	bench --site "$SITE" install-app "$APP"
fi
schritt "migrate (DocTypes, Fixtures, Workspaces, Berichte, Druckformate, Einrichtung)"
bench --site "$SITE" migrate
schritt "build (Desk-Skripte)"
bench build --app "$APP"

# ------------------------------------------------------------------ site_config (nur gesetzte Werte, keine Geheimnisse)
schritt "site_config"
setze() { if [ -n "${2:-}" ]; then bench --site "$SITE" set-config "$1" "$2"; echo "  $1 gesetzt"; else warnung "$1 nicht gesetzt (Variable leer)"; fi; }
setze plattform_basis_url "${BASIS_URL:-}"
setze host_name "${HOST_NAME:-}"
setze plattform_backoffice_email "${BACKOFFICE_EMAIL:-}"
setze oekoinvest_mqtt_host "${MQTT_HOST:-}"
setze oekoinvest_mqtt_port "${MQTT_PORT:-}"
bench --site "$SITE" set-config -p allow_tests false >/dev/null
bench --site "$SITE" set-config -p developer_mode 0 >/dev/null

# ------------------------------------------------------------------ Benutzer
schritt "Technische Benutzer"
if [ -n "${API_EMAIL:-}" ]; then
	bench --site "$SITE" execute oekoinvest_app.plattform.installation.technischer_benutzer_anlegen --kwargs "{'email': '$API_EMAIL', 'art': 'api'}"
else
	warnung "API_EMAIL leer – API-Benutzer der Website später anlegen (siehe GO-LIVE.md)"
fi
if [ -n "${ANLAGEN_EMAIL:-}" ]; then
	bench --site "$SITE" execute oekoinvest_app.plattform.installation.technischer_benutzer_anlegen --kwargs "{'email': '$ANLAGEN_EMAIL', 'art': 'anlagen'}"
fi
if [ -n "${ADMIN_EMAIL:-}" ]; then
	schritt "Erstes Desk-Konto (Rollenprofil ÖkoInvest Leitung)"
	bench --site "$SITE" execute oekoinvest_app.plattform.installation.desk_benutzer_anlegen \
		--kwargs "{'email': '$ADMIN_EMAIL', 'vorname': '${ADMIN_VORNAME:-}', 'nachname': '${ADMIN_NACHNAME:-}', 'profil': 'ÖkoInvest Leitung'}"
fi
if [ -n "${PORTAL_ADMIN_EMAIL:-}" ]; then
	schritt "Erstes Backoffice-Konto im Portal"
	bench --site "$SITE" execute oekoinvest_app.plattform.installation.admin_konto_anlegen \
		--kwargs "{'email': '$PORTAL_ADMIN_EMAIL', 'vorname': '${ADMIN_VORNAME:-}', 'nachname': '${ADMIN_NACHNAME:-}'}" || warnung "Portal-Konto nicht angelegt (existiert es schon?)"
fi

# ------------------------------------------------------------------ Scheduler + Neustart
schritt "Scheduler aktivieren, Dienste neu starten"
bench --site "$SITE" enable-scheduler
bench restart || warnung "bench restart fehlgeschlagen (Produktions-Setup mit supervisor/systemd prüfen)"

schritt "Kurzbericht"
bench --site "$SITE" execute oekoinvest_app.plattform.einrichtung.pruefen || true
cat <<'HINWEIS'

Nächste Schritte (Backend-Import/GO-LIVE.md):
  1. Ausgehendes E-Mail-Konto im Desk einrichten (SPF/DKIM/DMARC der Absenderdomain).
  2. API-Schlüssel des API-Benutzers erzeugen (Desk → User → API Access) und NUR in der Website-Umgebung hinterlegen.
  3. encryption_key aus sites/<site>/site_config.json sicher verwahren (TOTP-Geheimnisse, Passwort-Felder).
  4. Restore-Test eines Backups durchführen, Monitoring einrichten, Test-Durchlauf je Prozess.
HINWEIS
