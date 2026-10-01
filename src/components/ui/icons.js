// Auflösung der Icon-Namen aus src/data/navigation.js
import {
  Sun, LayoutDashboard, BatteryCharging, Building2, Factory, TrendingUp, Zap, Calculator, Sparkles, Activity, Landmark,
  MapPin, MapPinned, BookOpen, Library, HelpCircle, Users, MessageCircle, Circle, Tractor, Sprout, Car,
  Route, FolderUp, LineChart, LayoutGrid, Scale, Network, Share2, HandCoins, LogIn, CalendarDays, Map, Warehouse, Gauge, Globe, BadgeCheck, Handshake, Cable, FileSearch,
} from "lucide-react";

const ICONS = {
  Sun, LayoutDashboard, BatteryCharging, Building2, Factory, TrendingUp, Zap, Calculator, Sparkles, Activity, Landmark,
  MapPin, MapPinned, BookOpen, Library, HelpCircle, Users, MessageCircle, Tractor, Sprout, Car,
  Route, FolderUp, LineChart, LayoutGrid, Scale, Network, Share2, HandCoins, LogIn, CalendarDays, Map, Warehouse, Gauge, Globe, BadgeCheck, Handshake, Cable, FileSearch,
};

export function iconFor(name) {
  return ICONS[name] || Circle;
}
