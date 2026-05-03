import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminThemeProvider from "@/components/AdminThemeProvider";
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
import AdminTimesheets from "./pages/AdminTimesheets";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminSettings from "./pages/AdminSettings";
import AdminNotifications from "./pages/AdminNotifications";
import AdminSecurity from "./pages/AdminSecurity";
import AdminDataManagement from "./pages/AdminDataManagement";
import AdminSwapApprovals from "./pages/AdminSwapApprovals";
import AdminGeofenceTest from "./pages/AdminGeofenceTest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AdminThemeProvider />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
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
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/shifts/new" element={<AdminRoute><AdminCreateShift /></AdminRoute>} />
            <Route path="/admin/shifts/:id" element={<AdminRoute><AdminShiftDetail /></AdminRoute>} />
            <Route path="/admin/clients/new" element={<AdminRoute><AdminCreateClient /></AdminRoute>} />
            <Route path="/admin/caregivers/new" element={<AdminRoute><AdminCreateCaregiver /></AdminRoute>} />
            <Route path="/admin/billing" element={<AdminRoute><AdminBillingRates /></AdminRoute>} />
            <Route path="/admin/timesheets" element={<AdminRoute><AdminTimesheets /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/settings/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/settings/security" element={<AdminRoute><AdminSecurity /></AdminRoute>} />
            <Route path="/admin/settings/data" element={<AdminRoute><AdminDataManagement /></AdminRoute>} />
            <Route path="/admin/swaps" element={<AdminRoute><AdminSwapApprovals /></AdminRoute>} />
            <Route path="/admin/geofence-test" element={<AdminRoute><AdminGeofenceTest /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
