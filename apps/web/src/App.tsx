import { Suspense, lazy } from "react";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { AppShell } from "./components/AppShell";
import { AuthGate } from "./components/AuthGate";
import { LoadingBlock } from "./components/ui/app-kit";
import { TooltipProvider } from "./components/ui/tooltip";

const Canvas = lazy(() => import("./pages/Canvas").then((module) => ({ default: module.Canvas })));
const Codes = lazy(() => import("./pages/Codes").then((module) => ({ default: module.Codes })));
const Highlights = lazy(() => import("./pages/Highlights").then((module) => ({ default: module.Highlights })));
const Home = lazy(() => import("./pages/Home").then((module) => ({ default: module.Home })));
const Interviews = lazy(() => import("./pages/Interviews").then((module) => ({ default: module.Interviews })));
const Outlines = lazy(() => import("./pages/Outlines").then((module) => ({ default: module.Outlines })));
const Reports = lazy(() => import("./pages/Reports").then((module) => ({ default: module.Reports })));
const Settings = lazy(() => import("./pages/Settings").then((module) => ({ default: module.Settings })));

function PageLoader() {
  return <LoadingBlock />;
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <AppShell />,
      children: [
        { index: true, element: <Home /> },
        { path: "outlines", element: <Outlines /> },
        { path: "interviews", element: <Interviews /> },
        { path: "codes", element: <Codes /> },
        { path: "highlights", element: <Highlights /> },
        { path: "canvas", element: <Canvas /> },
        { path: "reports", element: <Reports /> },
        { path: "settings", element: <Settings /> },
        { path: "*", element: <Navigate to="/" replace /> }
      ]
    }
  ],
  { basename: import.meta.env.BASE_URL }
);

export function App() {
  return (
    <TooltipProvider>
      <AuthGate>
        <Suspense fallback={<PageLoader />}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthGate>
      <Toaster richColors closeButton />
    </TooltipProvider>
  );
}
