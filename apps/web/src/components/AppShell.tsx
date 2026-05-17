import { BookOpenIcon, FileTextIcon, Grid2X2Icon, HomeIcon, LightbulbIcon, MapIcon, PencilLineIcon, SettingsIcon, TagsIcon } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "./ProjectSwitcher";

const navItems = [
  { key: "/", label: "Home", icon: HomeIcon },
  { key: "/workspace", label: "Analysis Workspace", icon: Grid2X2Icon },
  { key: "/outlines", label: "Interview Prep", icon: BookOpenIcon },
  { key: "/interviews", label: "Interviews", icon: PencilLineIcon },
  { key: "/codes", label: "Codes", icon: TagsIcon },
  { key: "/highlights", label: "Highlights", icon: LightbulbIcon },
  { key: "/canvas", label: "Canvas", icon: MapIcon },
  { key: "/reports", label: "Reports", icon: FileTextIcon },
  { key: "/settings", label: "Settings", icon: SettingsIcon }
];

export function AppShell() {
  const location = useLocation();
  const selectedKey = navItems.find((item) => item.key !== "/" && location.pathname.startsWith(item.key))?.key ?? "/";

  return (
    <div className="app-shell">
      <aside className="app-sider">
        <div className="brand">
          <Grid2X2Icon />
          <span className="brand-title">IntelliSight</span>
        </div>
        <ProjectSwitcher />
        <nav className="nav-menu">
          {navItems.map((item) => (
            <Link key={item.key} to={item.key} className={cn("nav-link", selectedKey === item.key && "active")}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
