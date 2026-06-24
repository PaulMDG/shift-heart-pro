import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import AdminThemeProvider from "@/components/AdminThemeProvider";
import LocationPermissionGate from "@/components/LocationPermissionGate";
import { LiveLocationProvider } from "@/hooks/useLiveLocation";
import Index from "./pages/Index";
import ShiftsPage from "./pages/ShiftsPage";
import TasksPage from "./pages/TasksPage";
import ShiftDetail from "./pages/ShiftDetail";
import ShiftSwapPage from "./pages/ShiftSwapPage";
import CareNotesPage from "./pages/CareNotesPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import NewChatPage from "./pages/NewChatPage";
import ProfilePage from "./pages/ProfilePage";
import ProfilePersonalInfo from "./pages/ProfilePersonalInfo";
import ProfileCertifications from "./pages/ProfileCertifications";
import ProfileTimesheets from "./pages/ProfileTimesheets";
import ProfilePerformance from "./pages/ProfilePerformance";
import ProfileNotifications from "./pages/ProfileNotifications";
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
import AdminDocuments from "./pages/AdminDocuments";
import AdminIncidents from "./pages/AdminIncidents";
import AdminPayroll from "./pages/AdminPayroll";
import AdminReports from "./pages/AdminReports";
import AdminCareTasks from "./pages/AdminCareTasks";
import AdminTaskAnalytics from "./pages/AdminTaskAnalytics";
import AdminStatus from "./pages/AdminStatus";
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
          <LiveLocationProvider>
          <LocationPermissionGate />
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/shifts" element={<ProtectedRoute><ShiftsPage /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
            <Route path="/shifts/:id" element={<ProtectedRoute><ShiftDetail /></ProtectedRoute>} />
            <Route path="/shifts/:id/swap" element={<ProtectedRoute><ShiftSwapPage /></ProtectedRoute>} />
            <Route path="/shifts/:id/care-notes" element={<ProtectedRoute><CareNotesPage /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/new" element={<ProtectedRoute><NewChatPage /></ProtectedRoute>} />
            <Route path="/messages/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/personal" element={<ProtectedRoute><ProfilePersonalInfo /></ProtectedRoute>} />
            <Route path="/profile/certifications" element={<ProtectedRoute><ProfileCertifications /></ProtectedRoute>} />
            <Route path="/profile/timesheets" element={<ProtectedRoute><ProfileTimesheets /></ProtectedRoute>} />
            <Route path="/profile/performance" element={<ProtectedRoute><ProfilePerformance /></ProtectedRoute>} />
            <Route path="/profile/notifications" element={<ProtectedRoute><ProfileNotifications /></ProtectedRoute>} />
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
            <Route path="/admin/documents" element={<AdminRoute><AdminDocuments /></AdminRoute>} />
            <Route path="/admin/incidents" element={<AdminRoute><AdminIncidents /></AdminRoute>} />
            <Route path="/admin/payroll" element={<AdminRoute><AdminPayroll /></AdminRoute>} />
            <Route path="/admin/reports" element={<AdminRoute><AdminReports /></AdminRoute>} />
            <Route path="/admin/settings/care-tasks" element={<AdminRoute><AdminCareTasks /></AdminRoute>} />
            <Route path="/admin/analytics/tasks" element={<AdminRoute><AdminTaskAnalytics /></AdminRoute>} />
            <Route path="/admin/status" element={<AdminRoute><AdminStatus /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </LiveLocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
