import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import StudentAuth from "./pages/auth/StudentAuth";
import DriverAuth from "./pages/auth/DriverAuth";
import AdminAuth from "./pages/auth/AdminAuth";
import StudentDashboard from "./pages/StudentDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/student" element={<StudentAuth />} />
          <Route path="/auth/driver" element={<DriverAuth />} />
          <Route path="/auth/admin" element={<AdminAuth />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
import Footer from "@/components/Footer";

function App() {
  return (
    <>
      {/* your routes / layout */}
      <RouterProvider router={router} />
      <Footer />
    </>
  );
}
