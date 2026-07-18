import { BarChart3, BrainCircuit, CalendarClock, Home, MessageCircle, Settings2 } from "lucide-react";

export const NAV_ITEMS = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    group: "Workspace",
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: BrainCircuit,
    group: "Workspace",
  },
  {
    title: "AI Report Chat",
    url: "/chat",
    icon: MessageCircle,
    group: "Workspace",
  },
  {
    title: "Scheduled Reports",
    icon: CalendarClock,
    group: "Insights",
    disabled: true,
  },
  {
    title: "Analytics",
    icon: BarChart3,
    group: "Insights",
    disabled: true,
  },
  {
    title: "Settings",
    icon: Settings2,
    group: "Manage",
    disabled: true,
  },
];
