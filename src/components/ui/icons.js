// Auflösung der Icon-Namen aus src/data/navigation.js
import {
  Sun, BatteryCharging, Building2, Factory, TrendingUp, Zap, Calculator, Sparkles, Activity, Landmark,
  MapPin, MapPinned, BookOpen, Library, HelpCircle, Users, MessageCircle, Circle, Tractor, Sprout, Car,
  Route, FolderUp, LineChart, LayoutGrid, Scale, Network, Share2, HandCoins, LogIn,
} from "lucide-react";

const ICONS = {
  Sun, BatteryCharging, Building2, Factory, TrendingUp, Zap, Calculator, Sparkles, Activity, Landmark,
  MapPin, MapPinned, BookOpen, Library, HelpCircle, Users, MessageCircle, Tractor, Sprout, Car,
  Route, FolderUp, LineChart, LayoutGrid, Scale, Network, Share2, HandCoins, LogIn,
};

export function iconFor(name) {
  return ICONS[name] || Circle;
}
