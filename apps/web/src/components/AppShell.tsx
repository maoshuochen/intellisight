import {
  IconApps,
  IconBook,
  IconBulb,
  IconDashboard,
  IconEdit,
  IconFile,
  IconMindMapping,
  IconTags,
  IconUser
} from "@arco-design/web-react/icon";
import { Layout, Menu, Typography } from "@arco-design/web-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ProjectSwitcher } from "./ProjectSwitcher";

const { Sider, Content } = Layout;

const navItems = [
  { key: "/", label: "Home", icon: <IconDashboard /> },
  { key: "/outlines", label: "Outlines", icon: <IconBook /> },
  { key: "/interviews", label: "Interviews", icon: <IconEdit /> },
  { key: "/codes", label: "Codes", icon: <IconTags /> },
  { key: "/highlights", label: "Highlights", icon: <IconBulb /> },
  { key: "/canvas", label: "Canvas", icon: <IconMindMapping /> },
  { key: "/reports", label: "Reports", icon: <IconFile /> },
  { key: "/settings", label: "Settings", icon: <IconUser /> }
];

export function AppShell() {
  const location = useLocation();
  const selectedKey = navItems.find((item) => item.key !== "/" && location.pathname.startsWith(item.key))?.key ?? "/";

  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={232}>
        <div className="brand">
          <IconApps />
          <Typography.Text className="brand-title">IntelliSight</Typography.Text>
        </div>
        <ProjectSwitcher />
        <Menu selectedKeys={[selectedKey]} className="nav-menu">
          {navItems.map((item) => (
            <Menu.Item key={item.key}>
              <Link to={item.key}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </Menu.Item>
          ))}
        </Menu>
      </Sider>
      <Content className="app-content">
        <Outlet />
      </Content>
    </Layout>
  );
}
