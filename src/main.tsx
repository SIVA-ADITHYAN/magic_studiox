import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage";
import RegisterPage from "./components/RegisterPage";
import LoginPage from "./components/LoginPage";
import App from "./App";
import { getSession } from "./lib/auth";
import "./styles.css";
import "./landing.css";
import "./auth.css";

function ProtectedApp() {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/app"      element={<ProtectedApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
