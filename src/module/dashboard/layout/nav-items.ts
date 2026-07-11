import { Home, ShieldCheck, BrainCircuit } from "lucide-react";
import type { NavItem } from "@/shared/types";

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: BrainCircuit,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: ShieldCheck,
  },
];
