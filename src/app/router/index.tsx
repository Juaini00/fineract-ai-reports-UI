import { createBrowserRouter } from "react-router-dom";
import SignInPage from "@/module/auth/pages";
import DashboardPage from "@/module/dashboard/pages";
import ChatPage from "@/module/chat/pages";
import DashboardLayout from "@/module/dashboard/layout/DashboardLayout";
import KnowledgeBasePage from "@/module/dashboard/knowledge-base/page";
import NotFoundPage from "./NotFoundPage";
import PublicRoute from "./PublicRoute";
import ProtectedRoute from "./ProtectedRoute";

export const routes = createBrowserRouter([
  {
    id: "sign-in",
    path: "/signin",
    element: <PublicRoute element={<SignInPage />} />,
  },
  {
    id: "root",
    path: "/",
    element: (
      <ProtectedRoute
        element={
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        }
      />
    ),
  },
  {
    id: "knowledge-base",
    path: "/knowledge-base",
    element: (
      <ProtectedRoute
        element={
          <DashboardLayout>
            <KnowledgeBasePage />
          </DashboardLayout>
        }
      />
    ),
  },
  {
    id: "chat",
    path: "/chat",
    element: (
      <ProtectedRoute
        element={
          <DashboardLayout module="CHAT">
            <ChatPage />
          </DashboardLayout>
        }
      />
    ),
  },
  {
    id: "not-found",
    path: "*",
    element: <NotFoundPage />,
  },
]);
