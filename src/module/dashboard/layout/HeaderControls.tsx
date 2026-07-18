import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, Sun, Moon, User } from "lucide-react";
import { useTheme } from "next-themes";

export default function HeaderControls({
  isMobile,
  onLogout,
}: {
  isMobile: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const loc = useLocation();
  const { resolvedTheme, setTheme } = useTheme();

  const [prevPathname, setPrevPathname] = useState(loc.pathname);
  if (loc.pathname !== prevPathname) {
    setPrevPathname(loc.pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      const t = e.target as Node;
      if (!ref.current.contains(t)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <div className="relative flex items-center gap-3" ref={ref}>
      {!isMobile && (
        <>
          <button type="button" className="p-2 rounded-md hover:bg-sidebar-accent">
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-sidebar-accent transition-colors"
            aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </>
      )}
      <button
        type="button"
        aria-label="Open menu"
        className="p-1 rounded-md"
        onClick={() => setOpen((s) => !s)}
      >
        <div className="h-8 w-8 rounded-full bg-linear-to-tr from-pink-500 to-yellow-400 flex items-center justify-center">
          <User className="h-4 w-4 text-white" />
        </div>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-popover border rounded-md shadow-md z-40">
          <ul className="p-2">
            <li>
              <Link
                to="/profile"
                className="block px-2 py-1 rounded hover:bg-accent"
              >
                Profile
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="block px-2 py-1 rounded hover:bg-accent"
              >
                Settings
              </Link>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  toggleTheme();
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-accent flex items-center gap-2"
              >
                {resolvedTheme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-accent"
              >
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
