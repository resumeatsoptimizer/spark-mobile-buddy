import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

// Public pages - load immediately
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

// User pages - load immediately (frequently accessed)
import Events from "./pages/Events";
import EventDetails from "./pages/EventDetails";
import EventRegistration from "./pages/EventRegistration";
import Registrations from "./pages/Registrations";
import UserProfile from "./pages/UserProfile";

// Admin pages - lazy load (less frequently accessed)
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const AdminRegistrations = lazy(() => import("./pages/AdminRegistrations"));
const PaymentManagement = lazy(() => import("./pages/PaymentManagement"));
const AdminAutomation = lazy(() => import("./pages/AdminAutomation"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminEventManagement = lazy(() => import("./pages/AdminEventManagement"));
const AdminIntegrations = lazy(() => import("./pages/AdminIntegrations"));
const AdminSecurity = lazy(() => import("./pages/AdminSecurity"));
const AdminSSO = lazy(() => import("./pages/AdminSSO"));
const MemberManagement = lazy(() => import("./pages/MemberManagement"));
const MemberDetail = lazy(() => import("./pages/MemberDetail"));

// Other pages - lazy load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const EventForm = lazy(() => import("./pages/EventForm"));
const EventCheckIn = lazy(() => import("./pages/EventCheckIn"));
const ParticipantQRCode = lazy(() => import("./pages/ParticipantQRCode"));
const NotificationsSettings = lazy(() => import("./pages/NotificationsSettings"));
const APIDocumentation = lazy(() => import("./pages/APIDocumentation"));
const Security2FA = lazy(() => import("./pages/Security2FA"));
const DataPrivacy = lazy(() => import("./pages/DataPrivacy"));

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* User routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/create" element={<EventForm />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/events/:id/edit" element={<EventForm />} />
            <Route path="/events/:id/duplicate" element={<EventForm />} />
            <Route path="/events/:id/register" element={<EventRegistration />} />
            <Route path="/registrations" element={<Registrations />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/notifications" element={<NotificationsSettings />} />
            <Route path="/my-qr-code" element={<ParticipantQRCode />} />

            {/* Admin routes - lazy loaded */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/payments" element={<PaymentManagement />} />
            <Route path="/admin/registrations" element={<AdminRegistrations />} />
            <Route path="/admin/automation" element={<AdminAutomation />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
            <Route path="/admin/events" element={<AdminEventManagement />} />
            <Route path="/admin/integrations" element={<AdminIntegrations />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/sso" element={<AdminSSO />} />
            <Route path="/admin/api-docs" element={<APIDocumentation />} />
            <Route path="/admin/members" element={<MemberManagement />} />
            <Route path="/admin/members/:memberId" element={<MemberDetail />} />

            {/* Other routes */}
            <Route path="/check-in" element={<EventCheckIn />} />
            <Route path="/security/2fa" element={<Security2FA />} />
            <Route path="/data-privacy" element={<DataPrivacy />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
