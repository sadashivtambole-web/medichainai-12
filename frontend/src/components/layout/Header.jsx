import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "../../context/AppContext";
import {
  ShieldCheck,
  LogOut,
  ChevronDown,
  LogIn,
  UserPlus,
  Menu,
  X,
  Activity,
  Layers,
  LayoutDashboard
} from "lucide-react";

export default function Header() {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(path));

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileNavOpen(false);
    navigate("/login");
  };

  const userRole = (user?.role || "").toLowerCase().trim();

  // Role-specific navigation items
  const getNavLinks = () => {
    if (!user) {
      return [
        { label: "Home", path: "/" },
        { label: "About Network", path: "/about" },
        { label: "Verify Medicine", path: "/customer" },
      ];
    }

    switch (userRole) {
      case "creator":
        return [
          { label: "Console", path: "/creator" },
          { label: "Pending Approvals", path: "/creator/approvals" },
          { label: "Participants", path: "/creator/users" },
          { label: "Medicine Registry", path: "/creator/medicines" },
          { label: "Blockchain", path: "/creator/blockchain" },
          { label: "Verify", path: "/customer" },
        ];
      case "manufacturer":
        return [
          { label: "Home", path: "/" },
          { label: "Manufacturer Portal", path: "/manufacturer" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "distributor":
        return [
          { label: "Home", path: "/" },
          { label: "Distributor Portal", path: "/distributor" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "pharmacy":
        return [
          { label: "Home", path: "/" },
          { label: "Pharmacy Portal", path: "/pharmacy" },
          { label: "Verify Medicine", path: "/customer" },
          { label: "Profile", path: "/profile" },
        ];
      case "customer":
        return [
          { label: "Home", path: "/" },
          { label: "Verification Desk", path: "/customer" },
          { label: "About", path: "/about" },
          { label: "Profile", path: "/profile" },
        ];
      default:
        return [{ label: "Home", path: "/" }];
    }
  };

  const navLinks = getNavLinks();

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case "creator":
        return { bg: "#F0F9FF", border: "#BAE6FD", text: "#0369A1", dot: "#0284C7" };
      case "manufacturer":
        return { bg: "#F0FDFA", border: "#99F6E4", text: "#0F766E", dot: "#0D9488" };
      case "distributor":
        return { bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8", dot: "#2563EB" };
      case "pharmacy":
        return { bg: "#ECFDF5", border: "#A7F3D0", text: "#047857", dot: "#059669" };
      default:
        return { bg: "#F8FAFC", border: "#E2E8F0", text: "#475569", dot: "#64748B" };
    }
  };

  const roleStyle = getRoleBadgeColor(user?.role);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_rgba(2,132,199,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 group text-decoration-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                Medi<span className="text-sky-600">Chain</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/80 uppercase tracking-wider">
                AI
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 tracking-wide hidden sm:block">
              Healthcare Supply-Chain Integrity
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-50/80 p-1.5 rounded-xl border border-slate-200/60">
          {navLinks.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                  active
                    ? "text-sky-700 font-bold"
                    : "text-slate-600 hover:text-sky-600 hover:bg-slate-100/70"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavTab"
                    className="absolute inset-0 bg-white rounded-lg border border-sky-100 shadow-sm"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Auth & User Menu */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-600 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 max-w-[120px] truncate">
                    {user.name}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: roleStyle.dot }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: roleStyle.text }}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 ${
                    menuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 p-1.5 z-50"
                  >
                    <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Signed in as
                      </p>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.email}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        const roleDashboard = {
                          creator: "/creator",
                          manufacturer: "/manufacturer",
                          distributor: "/distributor",
                          pharmacy: "/pharmacy",
                          customer: "/customer",
                        };
                        navigate(roleDashboard[userRole] || "/");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-700 hover:bg-sky-50 transition-colors text-left"
                    >
                      <LayoutDashboard size={14} /> My Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                    >
                      <Layers size={14} /> Account Profile
                    </button>

                    <div className="h-px bg-slate-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-sky-600 hover:border-sky-300 hover:bg-sky-50/50 transition-all"
              >
                <LogIn size={13} /> Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 hover:-translate-y-0.5 transition-all"
              >
                <UserPlus size={13} /> Join Network
              </Link>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Toggle navigation menu"
          >
            {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileNavOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 bg-white/98 backdrop-blur-lg px-4 py-3 space-y-1"
          >
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileNavOpen(false)}
                className={`block px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive(item.path)
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <div className="pt-2 border-t border-slate-100 flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-bold border border-slate-200 rounded-xl"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-bold bg-sky-600 text-white rounded-xl"
                >
                  Register
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
