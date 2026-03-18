import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const ROLES = [
  {
    value: "minter",
    label: "Minter",
    desc: "Can mint new tokens within quota limits",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    color: "emerald",
  },
  {
    value: "burner",
    label: "Burner",
    desc: "Can burn tokens from their account",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
    color: "rose",
  },
  {
    value: "pauser",
    label: "Pauser",
    desc: "Can pause/unpause and freeze/thaw",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "amber",
  },
  {
    value: "blacklister",
    label: "Blacklister",
    desc: "Can manage the blacklist",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    color: "purple",
  },
  {
    value: "seizer",
    label: "Seizer",
    desc: "Can seize tokens from blacklisted accounts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    color: "red",
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400", iconBg: "bg-rose-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", iconBg: "bg-amber-500/20" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-400", iconBg: "bg-purple-500/20" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", iconBg: "bg-red-500/20" },
};

type Tab = "assign" | "revoke" | "close";

export default function Roles() {
  const { treasury, stablecoins, assignRole, revokeRole, closeRole } = useViex();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("assign");

  const [selectedMint, setSelectedMint] = useState("");
  const [assignee, setAssignee] = useState("");
  const [role, setRole] = useState("minter");
  const [assignLoading, setAssignLoading] = useState(false);

  const [revokeMint, setRevokeMint] = useState("");
  const [revokeAssignee, setRevokeAssignee] = useState("");
  const [revokeRoleVal, setRevokeRoleVal] = useState("minter");
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [closeMint, setCloseMint] = useState("");
  const [closeAddr, setCloseAddr] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleAssign = async () => {
    setAssignLoading(true);
    try {
      const tx = await assignRole(new PublicKey(selectedMint), new PublicKey(assignee), role);
      addToast("success", "Role Assigned", `${role} role assigned to ${assignee.slice(0, 12)}...`, tx);
      setAssignee("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAssignLoading(false);
    }
  };

  const handleRevoke = async () => {
    setRevokeLoading(true);
    try {
      const tx = await revokeRole(new PublicKey(revokeMint), new PublicKey(revokeAssignee), revokeRoleVal);
      addToast("success", "Role Revoked", `${revokeRoleVal} role revoked`, tx);
      setRevokeAssignee("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleClose = async () => {
    setCloseLoading(true);
    try {
      const tx = await closeRole(new PublicKey(closeMint), new PublicKey(closeAddr));
      addToast("success", "Role Closed", "Role assignment closed, rent reclaimed", tx);
      setCloseAddr("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Role Management</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Assign and revoke operational roles for stablecoin management
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ROLES.map((r) => {
          const colors = colorMap[r.color];
          return (
            <div
              key={r.value}
              className={`p-4 rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-sm`}
            >
              <div className={`w-9 h-9 rounded-lg ${colors.iconBg} ${colors.text} flex items-center justify-center mb-3`}>
                {r.icon}
              </div>
              <p className={`font-semibold text-sm ${colors.text}`}>{r.label}</p>
              <p className="text-xs text-gray-400 mt-1">{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl">
        {([
          { key: "assign" as Tab, label: "Assign" },
          { key: "revoke" as Tab, label: "Revoke" },
          { key: "close" as Tab, label: "Close" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-gray-800 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "assign" && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Assign Role</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">Grant a role to an address for a specific stablecoin.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={selectedMint} onChange={(e) => setSelectedMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={selectClass}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Assignee</label>
              <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Wallet address" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleAssign}
            disabled={!selectedMint || !assignee || assignLoading}
            className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {assignLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assigning...
              </span>
            ) : (
              "Assign Role"
            )}
          </button>
        </div>
      )}

      {activeTab === "revoke" && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Revoke Role</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">Deactivate a role assignment.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={revokeMint} onChange={(e) => setRevokeMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Role</label>
              <select value={revokeRoleVal} onChange={(e) => setRevokeRoleVal(e.target.value)} className={selectClass}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Assignee</label>
              <input type="text" value={revokeAssignee} onChange={(e) => setRevokeAssignee(e.target.value)} placeholder="Wallet address" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleRevoke}
            disabled={!revokeMint || !revokeAssignee || revokeLoading}
            className="mt-6 bg-amber-600 hover:bg-amber-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {revokeLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Revoking...
              </span>
            ) : (
              "Revoke Role"
            )}
          </button>
        </div>
      )}

      {activeTab === "close" && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Close Role Assignment</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-4">Reclaim rent from a revoked role assignment account.</p>

          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              SOL rent will be returned to your wallet
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={closeMint} onChange={(e) => setCloseMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Role Assignment Account</label>
              <input type="text" value={closeAddr} onChange={(e) => setCloseAddr(e.target.value)} placeholder="Role assignment PDA" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleClose}
            disabled={!closeMint || !closeAddr || closeLoading}
            className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {closeLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Closing...
              </span>
            ) : (
              "Close Role (Reclaim Rent)"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
