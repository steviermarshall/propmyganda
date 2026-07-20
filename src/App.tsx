import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomCursor from "@/components/webgl/CustomCursor";
import SmoothScroll from "@/components/webgl/SmoothScroll";
import PageTransition from "@/components/webgl/PageTransition";
import SocialDock from "@/components/SocialDock";
import ProtectedRoute from "@/components/dashboard/ProtectedRoute";

import Index from "./pages/Index";
import Artists from "./pages/Artists";
import ArtistDetail from "./pages/ArtistDetail";
import Distribution from "./pages/Distribution";
import Store from "./pages/Store";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Propworld from "./pages/Propworld";
import Events from "./pages/Events";
import Publication from "./pages/Publication";
import PublicationDetail from "./pages/PublicationDetail";
import NotFound from "./pages/NotFound";

import Login from "./pages/auth/Login";
import Callback from "./pages/auth/Callback";

import DashboardRoot from "./pages/dashboard/index";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import DistributionDashboard from "./pages/dashboard/DistributionDashboard";
import MarketingDashboard from "./pages/dashboard/MarketingDashboard";
import SponsorsDashboard from "./pages/dashboard/SponsorsDashboard";

import CrmProtectedRoute from "@/components/dashboard/CrmProtectedRoute";
import StevieDashboard from "./pages/admin/StevieDashboard";
import MikeDashboard from "./pages/admin/MikeDashboard";
import StevenDashboard from "./pages/admin/StevenDashboard";
import JayDashboard from "./pages/admin/JayDashboard";
import EditorDashboard from "./pages/admin/EditorDashboard";
import DeliverablesReport from "./pages/admin/DeliverablesReport";
import AuditLog from "./pages/admin/AuditLog";

const queryClient = new QueryClient();

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isPropworld = location.pathname === "/propworld";
  return (
    <>
      <Navbar />
      {children}
      {!isPropworld && <SocialDock />}
      <Footer />
    </>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  const isDash = location.pathname.startsWith("/dashboard");
  const isAdmin = location.pathname.startsWith("/admin");
  const isAuth = location.pathname.startsWith("/auth");

  if (isDash || isAdmin || isAuth) {
    return (
      <Routes location={location}>
        <Route path="/auth/login"    element={<Login />} />
        <Route path="/auth/callback" element={<Callback />} />

        {/* Legacy public-site dashboards */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRoot /></ProtectedRoute>} />
        <Route path="/dashboard/admin"        element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/distribution" element={<ProtectedRoute allowedRoles={["admin","distribution"]}><DistributionDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/marketing"    element={<ProtectedRoute allowedRoles={["admin","marketing"]}><MarketingDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/sponsorships" element={<ProtectedRoute allowedRoles={["admin","sponsorships"]}><SponsorsDashboard /></ProtectedRoute>} />

        {/* CRM team dashboards */}
        <Route path="/admin/stevie" element={<CrmProtectedRoute allowedRoles={["admin"]}><StevieDashboard /></CrmProtectedRoute>} />
        <Route path="/admin/mike"   element={<CrmProtectedRoute allowedRoles={["admin","mike"]}><MikeDashboard /></CrmProtectedRoute>} />
        <Route path="/admin/steven" element={<CrmProtectedRoute allowedRoles={["admin","steven"]}><StevenDashboard /></CrmProtectedRoute>} />
        <Route path="/admin/jay"    element={<CrmProtectedRoute allowedRoles={["admin","jay"]}><JayDashboard /></CrmProtectedRoute>} />
        <Route path="/admin/editor" element={<CrmProtectedRoute allowedRoles={["admin","editor","jay"]}><EditorDashboard /></CrmProtectedRoute>} />
        <Route path="/admin/reports/deliverables" element={<CrmProtectedRoute allowedRoles={["admin","jay"]}><DeliverablesReport /></CrmProtectedRoute>} />
        <Route path="/admin/audit" element={<CrmProtectedRoute allowedRoles={["admin"]}><AuditLog /></CrmProtectedRoute>} />
      </Routes>
    );
  }

  return (
    <PageTransition key={location.pathname}>
      <PublicLayout>
        <Routes location={location}>
          <Route path="/"              element={<Index />} />
          <Route path="/artists"       element={<Artists />} />
          <Route path="/artists/:id"   element={<ArtistDetail />} />
          <Route path="/distribution"  element={<Distribution />} />
          <Route path="/store"         element={<Store />} />
          <Route path="/store/:id"     element={<ProductDetail />} />
          <Route path="/propworld"     element={<Propworld />} />
          <Route path="/contact"       element={<Contact />} />
          <Route path="/events"        element={<Events />} />
          <Route path="/publication"        element={<Publication />} />
          <Route path="/publication/:slug"  element={<PublicationDetail />} />
          <Route path="*"              element={<NotFound />} />
        </Routes>
      </PublicLayout>
    </PageTransition>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SmoothScroll>
          <CustomCursor />
          <AppRoutes />
        </SmoothScroll>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
