import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { LangProvider } from "./context/LanguageContext";
import HomePage from "./pages/HomePage";
import JackPortfolio from "./pages/JackPortfolio";
import AdminLogin from "./pages/AdminLogin";
import AdminSetup from "./pages/AdminSetup";
import AdminDashboard from "./pages/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function PageTracker() {
  const location = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Home - AIPCA Bahati Cathedral",
      "/admin/login": "Admin Login",
      "/admin/dashboard": "Admin Dashboard",
    };
    fetch("/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location.pathname,
        title: titles[location.pathname] || document.title,
        referrer: document.referrer || null,
      }),
    }).catch(() => {});
  }, [location.pathname]);
  return null;
}

export default function App() {
  return (
    <LangProvider>
      <Routes>
        <Route path="/" element={<><PageTracker /><HomePage /></>} />
        <Route path="/jack" element={<JackPortfolio />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route path="/admin/setup" element={<AdminSetup />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </LangProvider>
  );
}
