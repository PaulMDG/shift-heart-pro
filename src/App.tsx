import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import ShiftsPage from "./pages/ShiftsPage";
import ShiftDetail from "./pages/ShiftDetail";
import ShiftSwapPage from "./pages/ShiftSwapPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import NewChatPage from "./pages/NewChatPage";
import ProfilePage from "./pages/ProfilePage";
import ProfilePersonalInfo from "./pages/ProfilePersonalInfo";
import ProfileCertifications from "./pages/ProfileCertifications";
import ProfileTimesheets from "./pages/ProfileTimesheets";
import ProfilePerformance from "./pages/ProfilePerformance";
import NotificationsPage from "./pages/NotificationsPage";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminCreateShift from "./pages/AdminCreateShift";
import AdminCreateClient from "./pages/AdminCreateClient";
import AdminCreateCaregiver from "./pages/AdminCreateCaregiver";
import AdminShiftDetail from "./pages/AdminShiftDetail";
import AdminBillingRates from "./pages/AdminBillingRates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/shifts" element={<ProtectedRoute><ShiftsPage /></ProtectedRoute>} />
            <Route path="/shifts/:id" element={<ProtectedRoute><ShiftDetail /></ProtectedRoute>} />
            <Route path="/shifts/:id/swap" element={<ProtectedRoute><ShiftSwapPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/new" element={<ProtectedRoute><NewChatPage /></ProtectedRoute>} />
            <Route path="/messages/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/personal" element={<ProtectedRoute><ProfilePersonalInfo /></ProtectedRoute>} />
            <Route path="/profile/certifications" element={<ProtectedRoute><ProfileCertifications /></ProtectedRoute>} />
            <Route path="/profile/timesheets" element={<ProtectedRoute><ProfileTimesheets /></ProtectedRoute>} />
            <Route path="/profile/performance" element={<ProtectedRoute><ProfilePerformance /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/shifts/new" element={<ProtectedRoute><AdminCreateShift /></ProtectedRoute>} />
            <Route path="/admin/shifts/:id" element={<ProtectedRoute><AdminShiftDetail /></ProtectedRoute>} />
            <Route path="/admin/clients/new" element={<ProtectedRoute><AdminCreateClient /></ProtectedRoute>} />
            <Route path="/admin/caregivers/new" element={<ProtectedRoute><AdminCreateCaregiver /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
