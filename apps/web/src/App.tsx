import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AuthGate } from "./components/AuthGate";
import { Canvas } from "./pages/Canvas";
import { Codes } from "./pages/Codes";
import { Highlights } from "./pages/Highlights";
import { Home } from "./pages/Home";
import { Interviews } from "./pages/Interviews";
import { Placeholder } from "./pages/Placeholder";
import { Settings } from "./pages/Settings";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Home /> },
      { path: "outlines", element: <Placeholder title="Outlines" /> },
      { path: "interviews", element: <Interviews /> },
      { path: "codes", element: <Codes /> },
      { path: "highlights", element: <Highlights /> },
      { path: "canvas", element: <Canvas /> },
      { path: "reports", element: <Placeholder title="Reports" /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);

export function App() {
  return (
    <AuthGate>
      <RouterProvider router={router} />
    </AuthGate>
  );
}
