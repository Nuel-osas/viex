import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";

/* ── Inline SVG Icons ────────────────────────────────── */
const icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  initialize: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  mint: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12M15 9.5c0-1.38-1.34-2.5-3-2.5s-3 1.12-3 2.5 1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5" />
    </svg>
  ),
  convert: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  ),
  holders: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  blacklist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M5.7 5.7l12.6 12.6" />
    </svg>
  ),
  freeze: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
    </svg>
  ),
  kyc: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  travel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  ),
  allowlist: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  roles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  authority: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1" />
    </svg>
  ),
  pause: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="10" y1="15" x2="10" y2="9" />
      <line x1="14" y1="15" x2="14" y2="9" />
    </svg>
  ),
  metadata: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  chevron: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
};

/* ── Section & Nav Item Types ────────────────────────── */
interface NavItem {
  path: string;
  label: string;
  icon: keyof typeof icons;
}

interface NavSection {
  title: string;
  role?: string;
  roleColor: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: "OVERVIEW",
    roleColor: "",
    items: [
      { path: "/", label: "Dashboard", icon: "dashboard" },
      { path: "/initialize", label: "Initialize", icon: "initialize" },
    ],
  },
  {
    title: "TREASURY OPS",
    role: "MINTER",
    roleColor: "role-pill-emerald",
    items: [
      { path: "/mint-burn", label: "Mint & Burn", icon: "mint" },
      { path: "/convert", label: "FX Convert", icon: "convert" },
      { path: "/holders", label: "Token Holders", icon: "holders" },
    ],
  },
  {
    title: "COMPLIANCE",
    role: "BLACKLISTER",
    roleColor: "role-pill-rose",
    items: [
      { path: "/compliance", label: "Blacklist & Seize", icon: "blacklist" },
      { path: "/freeze-thaw", label: "Freeze / Thaw", icon: "freeze" },
    ],
  },
  {
    title: "IDENTITY",
    role: "KYC ADMIN",
    roleColor: "role-pill-blue",
    items: [
      { path: "/kyc", label: "KYC Management", icon: "kyc" },
      { path: "/travel-rule", label: "Travel Rule", icon: "travel" },
    ],
  },
  {
    title: "ADMINISTRATION",
    role: "AUTHORITY",
    roleColor: "role-pill-purple",
    items: [
      { path: "/roles", label: "Role Management", icon: "roles" },
      { path: "/authority", label: "Authority Transfer", icon: "authority" },
      { path: "/pause", label: "Pause Controls", icon: "pause" },
    ],
  },
];

/* ── Collapsible Section ─────────────────────────────── */
function SidebarSection({ section }: { section: NavSection }) {
  const location = useLocation();
  const isActiveSection = section.items.some(
    (item) =>
      item.path === location.pathname ||
      (item.path !== "/" && location.pathname.startsWith(item.path))
  );
  const [isOpen, setIsOpen] = useState(isActiveSection || section.title === "OVERVIEW");

  return (
    <div className="mb-1">
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 group cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold tracking-widest text-gray-600 group-hover:text-gray-500 transition-colors">
            {section.title}
          </span>
          {section.role && (
            <span className={section.roleColor}>{section.role}</span>
          )}
        </div>
        <span
          className={`text-gray-600 transition-transform duration-200 ${
            isOpen ? "rotate-0" : "-rotate-90"
          }`}
        >
          {icons.chevron}
        </span>
      </button>

      {/* Collapsible Items */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-0.5 pb-2">
          {section.items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2 mx-1 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active left bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-500 rounded-r-full" />
                  )}
                  <span className={`flex-shrink-0 transition-colors ${isActive ? "text-emerald-400" : "text-gray-600 group-hover:text-gray-400"}`}>
                    {icons[item.icon]}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Sidebar ────────────────────────────────────── */
export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-navy-900/80 backdrop-blur-md border-r border-gray-800/40 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M8 12l8-5 8 5-8 5-8-5z" fill="white" fillOpacity="0.95" />
              <path d="M8 17l8 5 8-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.6" />
              <path d="M8 21l8 5 8-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.3" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              VIEX
            </h1>
            <p className="text-[9px] text-gray-600 tracking-[0.15em] uppercase mt-0.5">
              Treasury Platform
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {sections.map((section) => (
          <SidebarSection key={section.title} section={section} />
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-subtle" />
            <span className="text-[10px] text-gray-600 font-medium">System Active</span>
          </div>
          <span className="text-[10px] text-gray-700 font-mono">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
