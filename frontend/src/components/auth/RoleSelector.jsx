import { motion } from "framer-motion";
import { Building2, Server, Store, User, CheckCircle2 } from "lucide-react";

export const AUTH_ROLES = [
  {
    id: "Manufacturer",
    title: "Manufacturer",
    category: "Genesis & Minting",
    description: "Drug origin, active batch formulation, AI packaging baseline, & digital QR stamping.",
    icon: Building2,
    gradient: "from-sky-600 to-sky-700",
    color: "#0284C7",
    bgSoft: "bg-sky-50 text-sky-700 border-sky-200",
    badge: "Genesis Node",
    codeLabel: "Manufacturer Code / License Number",
    codePlaceholder: "e.g. MFR-SUN-772",
  },
  {
    id: "Distributor",
    title: "Distributor",
    category: "Transit Logistics",
    description: "Cold-chain custody confirmation, transit telemetry, & warehouse distribution relay.",
    icon: Server,
    gradient: "from-teal-600 to-teal-700",
    color: "#0D9488",
    bgSoft: "bg-teal-50 text-teal-700 border-teal-200",
    badge: "Logistics Node",
    codeLabel: "Distributor License / Logistics Code",
    codePlaceholder: "e.g. DST-MH-102",
  },
  {
    id: "Pharmacy",
    title: "Pharmacy",
    category: "Dispensary & Retail",
    description: "Dispensary batch receipt, shelf-life audit, tamper inspection, & patient POS.",
    icon: Store,
    gradient: "from-blue-600 to-cyan-700",
    color: "#2563EB",
    bgSoft: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "Dispensary Node",
    codeLabel: "Pharmacy License / Store Registration",
    codePlaceholder: "e.g. PH-APL-404",
  },
  {
    id: "Customer",
    title: "Customer / Public",
    category: "Zero-Trust Public",
    description: "Public zero-trust camera QR scanning, AI blister verification, & instant report.",
    icon: User,
    gradient: "from-emerald-600 to-teal-700",
    color: "#059669",
    bgSoft: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "Public Consumer",
    codeLabel: "",
    codePlaceholder: "",
  },
];

/**
 * Interactive Role Selector Cards
 * Polished interactive cards with animated active border, hover effects, and accessible keyboard support
 */
export default function RoleSelector({ selectedRole, onSelectRole }) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {AUTH_ROLES.map((role) => {
          const Icon = role.icon;
          const isSelected = selectedRole === role.id;

          return (
            <motion.div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectRole(role.id);
                }
              }}
              tabIndex={0}
              role="radio"
              aria-checked={isSelected}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border text-left flex flex-col justify-between select-none ${
                isSelected
                  ? "bg-white border-sky-500 shadow-md shadow-sky-900/5 ring-2 ring-sky-200/80"
                  : "bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${
                      isSelected
                        ? "bg-gradient-to-tr " + role.gradient + " text-white shadow-sm"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon size={20} />
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${role.bgSoft}`}
                  >
                    {role.badge}
                  </span>
                </div>

                {/* Role Title & Category */}
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  {role.title}
                </h4>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                  {role.category}
                </p>

                {/* Description */}
                <p className="text-xs text-slate-500 mt-2.5 leading-relaxed line-clamp-2">
                  {role.description}
                </p>
              </div>

              {/* Bottom State Pill */}
              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold ${
                    isSelected ? "text-sky-600" : "text-slate-400"
                  }`}
                >
                  {isSelected ? "Active Selection" : "Select Role"}
                </span>

                {isSelected ? (
                  <CheckCircle2 size={16} className="text-sky-600" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
