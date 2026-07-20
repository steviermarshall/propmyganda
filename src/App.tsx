import { lazy, Suspense } from "react";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { AuthProvider } from "@/hooks/AuthProvider";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CustomCursor from "@/components/webgl/CustomCursor";
import SmoothScroll from "@/components/webgl/SmoothScroll";
import PageTransition from "@/components/webgl/PageTransition";
import SocialDock from "@/components/SocialDock";
import ProtectedRoute from "@/components/dashboard/ProtectedRoute";
import CrmProtectedRoute from "@/components/dashboard/CrmProtectedRoute";

// Index is the landing page — keep it eager for a fast first paint.
import Index from "./pages/Index";

// Everything else is code-split so the public homepage doesn't ship the
// CRM, admin, and secondary-page bundles up front.
const Artists = lazy(() => import("./pages/Artists"));
const ArtistDetail = lazy(() => import("./pages/ArtistDetail"));
const Distribution = lazy(() => import("./pages/Distribution"));
const Store = lazy(() => import("./pages/Store"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const Propworld = lazy(() => import("./pages/Propworld"));
const Events = lazy(() => import("./pages/Events"));
const Publication = lazy(() => import("./pages/Publication"));
const PublicationDetail = lazy(() => import("./pages/PublicationDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const Login = lazy(() => import("./pages/auth/Login"));
const Callback = lazy(() => import("./pages/auth/Callback"));

const DashboardRoot = lazy(() => import("./pages/dashboard/index"));
const AdminDashboard = lazy(() => import("./pages/dashboard/AdminDashboard"));
const DistributionDashboard = lazy(() => import("./pages/dashboard/DistributionDashboard"));
const MarketingDashboard = lazy(() => import("./pages/dashboard/MarketingDashboard"));
const SponsorsDashboard = lazy(() => import("./pages/dashboard/SponsorsDashboard"));

const StevieDashboard = lazy(() => import("./pages/admin/StevieDashboard"));
const MikeDashboard = lazy(() => import("./pages/admin/MikeDashboard"));
const StevenDashboard = lazy(() => import("./pages/admin/StevenDashboard"));
const JayDashboard = lazy(() => import("./pages/admin/JayDashboard"));
const EditorDashboard = lazy(() => import("./pages/admin/EditorDashboard"));
const DeliverablesReport = lazy(() => import("./pages/admin/DeliverablesReport"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));

// Global query defaults + error surfacing. Previously a failed dashboard
// query (RLS denial, network) rendered nothing with no signal; now every
// failure raises a toast so "no data" is distinguishable from "broke".
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const label = Array.isArray(query.queryKey) ? String(query.queryKey[0]) : "data";
      const msg = error instanceof Error ? error.message : "Request failed";
      toast.error(`Couldn't load ${label}`, { description: msg });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin" />
  </div>
);

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
      <Suspense fallback={<RouteFallback />}>
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
      </Suspense>
    );
  }

  return (
    <PageTransition key={location.pathname}>
      <PublicLayout>
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </PublicLayout>
    </PageTransition>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SmoothScroll>
              <CustomCursor />
              <AppRoutes />
            </SmoothScroll>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
