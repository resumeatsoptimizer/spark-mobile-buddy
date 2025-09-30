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
import NotFound from "./pages/NotFound";

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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
