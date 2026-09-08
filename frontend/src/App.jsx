import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChangePassword from "./pages/ChangePassword";
import Profile from "./pages/Profile";
import About from "./pages/About";
import Creator from "./pages/Creator";
import Manufacturer from "./pages/Manufacturer";
import Distributor from "./pages/Distributor";
import Pharmacy from "./pages/Pharmacy";
import Customer from "./pages/Customer";
import VerifyResult from "./pages/VerifyResult";

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/" element={<Home />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/about" element={<About />} />

      {/* Reached right after first login, before a role dashboard is available */}
      <Route path="/change-password" element={<ChangePassword />} />

      {/* ── Any authenticated, approved user ── */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/verify/:id"
        element={
          <ProtectedRoute>
            <VerifyResult />
          </ProtectedRoute>
        }
      />

      {/* ── Role dashboards ── */}
      <Route
        path="/creator/*"
        element={
          <ProtectedRoute allowedRoles={["Creator"]}>
            <Creator />
          </ProtectedRoute>
        }
      />
      <Route
        path="/manufacturer"
        element={
          <ProtectedRoute allowedRoles={["Manufacturer"]}>
            <Manufacturer />
          </ProtectedRoute>
        }
      />
      <Route
        path="/distributor"
        element={
          <ProtectedRoute allowedRoles={["Distributor"]}>
            <Distributor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pharmacy"
        element={
          <ProtectedRoute allowedRoles={["Pharmacy"]}>
            <Pharmacy />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={["Customer"]}>
            <Customer />
          </ProtectedRoute>
        }
      />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
