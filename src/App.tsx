import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import EventForm from "./pages/EventForm";
import EventDetails from "./pages/EventDetails";
import Registrations from "./pages/Registrations";
import AdminSettings from "./pages/AdminSettings";
import EventRegistration from "./pages/EventRegistration";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentManagement from "./pages/PaymentManagement";
import AdminRegistrations from "./pages/AdminRegistrations";
import AdminAutomation from "./pages/AdminAutomation";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminEventManagement from "./pages/AdminEventManagement";
import AdminIntegrations from "./pages/AdminIntegrations";
import NotFound from "./pages/NotFound";
import AdminOrganizations from "./pages/AdminOrganizations";
import AdminTeams from "./pages/AdminTeams";
import AdminRoles from "./pages/AdminRoles";
import UserProfile from "./pages/UserProfile";
import EventCheckIn from "./pages/EventCheckIn";
import AdminSecurity from "./pages/AdminSecurity";
import ParticipantQRCode from "./pages/ParticipantQRCode";
import NotificationsSettings from "./pages/NotificationsSettings";
import AdminSSO from "./pages/AdminSSO";
import AdminRBAC from "./pages/AdminRBAC";
import APIDocumentation from "./pages/APIDocumentation";
import Security2FA from "./pages/Security2FA";
import DataPrivacy from "./pages/DataPrivacy";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/create" element={<EventForm />} />
          <Route path="/events/:id" element={<EventDetails />} />
          <Route path="/events/:id/edit" element={<EventForm />} />
          <Route path="/events/:id/register" element={<EventRegistration />} />
          <Route path="/registrations" element={<Registrations />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/payments" element={<PaymentManagement />} />
          <Route path="/admin/registrations" element={<AdminRegistrations />} />
          <Route path="/admin/automation" element={<AdminAutomation />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/events" element={<AdminEventManagement />} />
          <Route path="/admin/integrations" element={<AdminIntegrations />} />
          <Route path="/admin/organizations" element={<AdminOrganizations />} />
          <Route path="/admin/teams" element={<AdminTeams />} />
          <Route path="/admin/roles" element={<AdminRoles />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/sso" element={<AdminSSO />} />
          <Route path="/admin/rbac" element={<AdminRBAC />} />
          <Route path="/admin/api-docs" element={<APIDocumentation />} />
          <Route path="/security/2fa" element={<Security2FA />} />
          <Route path="/data-privacy" element={<DataPrivacy />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/notifications" element={<NotificationsSettings />} />
          <Route path="/check-in" element={<EventCheckIn />} />
          <Route path="/my-qr-code" element={<ParticipantQRCode />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
