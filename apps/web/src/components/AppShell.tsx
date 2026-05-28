import { BookOpenIcon, FileTextIcon, Grid2X2Icon, HomeIcon, LightbulbIcon, MapIcon, PencilLineIcon, SettingsIcon, TagsIcon } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ProjectSwitcher } from "./ProjectSwitcher";

const navItems = [
  { key: "/", label: "Home", icon: HomeIcon },
  { key: "/outlines", label: "Outlines", icon: BookOpenIcon },
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
  const activeItem = navItems.find((item) => item.key === selectedKey) ?? navItems[0]!;
  const ActiveIcon = activeItem.icon;

  return (
    <div className="app-shell">
      <aside className="app-sider">
        <div className="brand">
          <Grid2X2Icon />
          <span className="brand-title">IntelliSight</span>
        </div>
        <nav className="nav-menu">
          {navItems.map((item) => (
            <Link key={item.key} to={item.key} className={cn("nav-link", selectedKey === item.key && "active")}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="app-main">
        <header className="app-header">
          <div className="app-header-title">
            <ActiveIcon />
            <span>Thesis</span>
            <span className="app-header-separator">/</span>
            <strong>{activeItem.label}</strong>
          </div>
          <div className="app-header-actions">
            <div className="topbar-project">
              <ProjectSwitcher />
            </div>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
