import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import PageTransition from "./components/layout/PageTransition";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Creator from "./pages/Creator";
import Manufacturer from "./pages/Manufacturer";
import Distributor from "./pages/Distributor";
import Pharmacy from "./pages/Pharmacy";
import Customer from "./pages/Customer";
import VerifyResult from "./pages/VerifyResult";
import GenerateQr from "./pages/GenerateQr";
import OcrCheck from "./pages/OcrCheck";

export default function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* ── Public ── */}
        <Route
          path="/"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/home"
          element={
            <PageTransition>
              <Home />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Login />
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              <Register />
            </PageTransition>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <PageTransition>
              <ForgotPassword />
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <About />
            </PageTransition>
          }
        />
        <Route
          path="/verify/:id"
          element={
            <PageTransition>
              <VerifyResult />
            </PageTransition>
          }
        />
        <Route
          path="/verify"
          element={
            <PageTransition>
              <Customer />
            </PageTransition>
          }
        />
        <Route
          path="/ocr-check"
          element={
            <PageTransition>
              <OcrCheck />
            </PageTransition>
          }
        />
        <Route
          path="/generate-qr"
          element={
            <PageTransition>
              <GenerateQr />
            </PageTransition>
          }
        />

        {/* Reached right after first login, before a role dashboard is available */}
        <Route
          path="/change-password"
          element={
            <PageTransition>
              <ChangePassword />
            </PageTransition>
          }
        />

        {/* ── Any authenticated, approved user ── */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <PageTransition>
                <Profile />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* ── Role dashboards ── */}
        <Route
          path="/creator/*"
          element={
            <ProtectedRoute allowedRoles={["Creator"]}>
              <PageTransition>
                <Creator />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer"
          element={
            <ProtectedRoute allowedRoles={["Manufacturer"]}>
              <PageTransition>
                <Manufacturer />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/distributor"
          element={
            <ProtectedRoute allowedRoles={["Distributor"]}>
              <PageTransition>
                <Distributor />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute allowedRoles={["Pharmacy"]}>
              <PageTransition>
                <Pharmacy />
              </PageTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={["Customer"]}>
              <PageTransition>
                <Customer />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
