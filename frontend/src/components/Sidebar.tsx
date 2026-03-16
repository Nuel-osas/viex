import { NavLink } from "react-router-dom";

const navItems = [
  { path: "/", label: "Dashboard", icon: "[D]" },
  { path: "/initialize", label: "Initialize", icon: "[+]" },
  { path: "/mint-burn", label: "Mint & Burn", icon: "[M]" },
  { path: "/convert", label: "FX Convert", icon: "[X]" },
  { path: "/compliance", label: "Compliance", icon: "[C]" },
  { path: "/kyc", label: "KYC", icon: "[K]" },
  { path: "/travel-rule", label: "Travel Rule", icon: "[T]" },
  { path: "/roles", label: "Roles", icon: "[R]" },
  { path: "/authority", label: "Authority", icon: "[A]" },
  { path: "/holders", label: "Holders", icon: "[H]" },
  { path: "/freeze-thaw", label: "Freeze/Thaw", icon: "[F]" },
  { path: "/pause", label: "Pause", icon: "[P]" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold text-sm">
            VX
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              VIEX
            </h1>
            <p className="text-[10px] text-gray-500 -mt-0.5 tracking-wider uppercase">
              Treasury
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary-500/15 text-primary-400 border border-primary-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-dark-700/50 border border-transparent"
              }`
            }
          >
            <span className="text-xs font-mono w-6 text-center opacity-70">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-dark-700">
        <div className="text-[10px] text-gray-600 text-center">
          VIEX Treasury v1.0.0
        </div>
      </div>
    </aside>
  );
}
