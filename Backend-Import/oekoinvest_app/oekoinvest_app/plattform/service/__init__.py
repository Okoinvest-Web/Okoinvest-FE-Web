# Copyright (c) 2026, ÖkoInvest GmbH
#
# Service-Schicht „Dokumente, Signatur, Termine, Service & HR“:
#   integration.py – Schalter für optionale Frappe-Apps (Drive, Helpdesk, HRMS) und Event-Kalender
#   drive.py       – Adapter Frappe Drive (Dokumentenablage fürs interne Team, Rechte bleiben in der Plattform)
#   helpdesk.py    – Adapter Frappe Helpdesk (HD Ticket)
#   sla.py         – SLA-Regeln der Tickets (reine Funktionen, Spiegel von src/lib/plattform/tickets/index.js)
