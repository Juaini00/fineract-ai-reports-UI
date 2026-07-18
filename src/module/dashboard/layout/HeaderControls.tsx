import { Bell, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/dropdown-menu";

export function AccountMenuGroup() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-2 py-2"><span className="block text-sm font-medium text-foreground">Your account</span><span className="mt-0.5 block font-normal">Workspace access</span></DropdownMenuLabel>
      <DropdownMenuItem disabled><User />Profile <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span></DropdownMenuItem>
      <DropdownMenuItem disabled><Settings />Settings <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span></DropdownMenuItem>
    </DropdownMenuGroup>
  );
}

export default function HeaderControls({
  isMobile,
  onLogout,
}: {
  isMobile: boolean;
  onLogout: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {!isMobile && <button aria-label="Notifications unavailable" className="rounded-lg p-2 text-muted-foreground opacity-55" disabled title="Notifications — coming soon" type="button"><Bell className="size-4" /></button>}
      <button aria-label={`Switch to ${isDark ? "light" : "dark"} mode`} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground hover:cursor-pointer" onClick={() => setTheme(isDark ? "light" : "dark")} type="button">
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button aria-label="Open account menu" className="flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring hover:cursor-pointer" type="button" />}>
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="size-4" /></span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <AccountMenuGroup />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} variant="destructive"><LogOut />Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
