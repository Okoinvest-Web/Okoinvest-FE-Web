// Symbole je Benachrichtigungsart (Glocke, Übersicht, Einstellungen)

import { Activity, CalendarClock, Inbox, KeyRound, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { TriangleAlert } from "lucide-react"; // Anlagen & Monitoring
import { ReceiptText } from "lucide-react"; // ERPNext-Finanzen & Abrechnung
import { CalendarDays, LifeBuoy, PenLine } from "lucide-react"; // Signatur, Termine, Service

export const ART_ICON = {
  status: Activity,
  nachricht: MessageSquareText,
  nda: KeyRound,
  suchprofil: Sparkles,
  anfrage: Inbox,
  aufgabe: CalendarClock,
  sicherheit: ShieldCheck,
  stoerung: TriangleAlert, // Anlagen & Monitoring
  signatur: PenLine, termin: CalendarDays, ticket: LifeBuoy, // Signatur, Termine, Service
  abrechnung: ReceiptText, // ERPNext-Finanzen & Abrechnung
};
