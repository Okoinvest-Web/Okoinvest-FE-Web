// Symbole je Benachrichtigungsart (Glocke, Übersicht, Einstellungen)

import { Activity, CalendarClock, Inbox, KeyRound, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { TriangleAlert } from "lucide-react"; // Anlagen & Monitoring

export const ART_ICON = {
  status: Activity,
  nachricht: MessageSquareText,
  nda: KeyRound,
  suchprofil: Sparkles,
  anfrage: Inbox,
  aufgabe: CalendarClock,
  sicherheit: ShieldCheck,
  stoerung: TriangleAlert, // Anlagen & Monitoring
};
