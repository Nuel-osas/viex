import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const ROLES = [
  { value: "minter", label: "Minter", desc: "Can mint new tokens" },
  { value: "burner", label: "Burner", desc: "Can burn tokens" },
  { value: "pauser", label: "Pauser", desc: "Can pause/unpause and freeze/thaw" },
  { value: "blacklister", label: "Blacklister", desc: "Can manage blacklist" },
  { value: "seizer", label: "Seizer", desc: "Can seize tokens from blacklisted accounts" },
];

export default function Roles() {
  const { treasury, stablecoins, assignRole, revokeRole, closeRole } = useViex();
  const { addToast } = useToast();

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
      const tx = await assignRole(
        new PublicKey(selectedMint),
        new PublicKey(assignee),
        role
      );
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
      const tx = await revokeRole(
        new PublicKey(revokeMint),
        new PublicKey(revokeAssignee),
        revokeRoleVal
      );
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
      const tx = await closeRole(
        new PublicKey(closeMint),
        new PublicKey(closeAddr)
      );
      addToast("success", "Role Closed", "Role assignment closed, rent reclaimed", tx);
      setCloseAddr("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Role Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Assign and revoke operational roles for stablecoin management
        </p>
      </div>

      {/* Role Reference */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Available Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {ROLES.map((r) => (
            <div key={r.value} className="p-3 rounded-lg bg-dark-700/50 border border-dark-600">
              <p className="font-semibold text-sm text-white capitalize">{r.label}</p>
              <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Assign Role */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Assign Role</h2>
        <p className="text-sm text-gray-500 mb-6">Grant a role to an address for a specific stablecoin.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={selectedMint} onChange={(e) => setSelectedMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Assignee</label>
            <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Wallet address" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleAssign} disabled={!selectedMint || !assignee || assignLoading} className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {assignLoading ? "Assigning..." : "Assign Role"}
        </button>
      </div>

      {/* Revoke Role */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Revoke Role</h2>
        <p className="text-sm text-gray-500 mb-6">Deactivate a role assignment.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={revokeMint} onChange={(e) => setRevokeMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Role</label>
            <select value={revokeRoleVal} onChange={(e) => setRevokeRoleVal(e.target.value)} className="w-full">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Assignee</label>
            <input type="text" value={revokeAssignee} onChange={(e) => setRevokeAssignee(e.target.value)} placeholder="Wallet address" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleRevoke} disabled={!revokeMint || !revokeAssignee || revokeLoading} className="mt-6 px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {revokeLoading ? "Revoking..." : "Revoke Role"}
        </button>
      </div>

      {/* Close Role */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Close Role</h2>
        <p className="text-sm text-gray-500 mb-6">Reclaim rent from a revoked role assignment account.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={closeMint} onChange={(e) => setCloseMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Role Assignment Account</label>
            <input type="text" value={closeAddr} onChange={(e) => setCloseAddr(e.target.value)} placeholder="Role assignment PDA" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleClose} disabled={!closeMint || !closeAddr || closeLoading} className="mt-4 px-6 py-2.5 bg-dark-600 hover:bg-dark-700 text-white rounded-lg font-medium text-sm transition-colors border border-dark-500 disabled:opacity-50">
          {closeLoading ? "Closing..." : "Close Role (Reclaim Rent)"}
        </button>
      </div>
    </div>
  );
}
