import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const KYC_LEVELS = [
  { value: 0, label: "Basic" },
  { value: 1, label: "Enhanced" },
  { value: 2, label: "Institutional" },
];

export default function Kyc() {
  const { kycApprove, kycRevoke, kycClose, fetchKycEntry } = useViex();
  const { addToast } = useToast();

  const [target, setTarget] = useState("");
  const [kycLevel, setKycLevel] = useState("0");
  const [jurisdiction, setJurisdiction] = useState("USA");
  const [provider, setProvider] = useState("");
  const [expiry, setExpiry] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  const [closeTarget, setCloseTarget] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const [checkTarget, setCheckTarget] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const jurisdictionBytes = jurisdiction
        .split("")
        .map((c) => c.charCodeAt(0))
        .slice(0, 3);
      while (jurisdictionBytes.length < 3) jurisdictionBytes.push(0);

      const expiryTimestamp = expiry
        ? Math.floor(new Date(expiry).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      const tx = await kycApprove(
        new PublicKey(target),
        parseInt(kycLevel),
        jurisdictionBytes,
        provider,
        expiryTimestamp
      );
      addToast("success", "KYC Approved", `KYC approved for ${target.slice(0, 12)}...`, tx);
      setTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setApproveLoading(false);
    }
  };

  const handleRevoke = async () => {
    setRevokeLoading(true);
    try {
      const tx = await kycRevoke(new PublicKey(revokeTarget));
      addToast("success", "KYC Revoked", "KYC entry revoked", tx);
      setRevokeTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setRevokeLoading(false);
    }
  };

  const handleClose = async () => {
    setCloseLoading(true);
    try {
      const tx = await kycClose(new PublicKey(closeTarget));
      addToast("success", "KYC Closed", "KYC entry closed, rent reclaimed", tx);
      setCloseTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const handleCheck = async () => {
    setCheckLoading(true);
    try {
      const entry = await fetchKycEntry(new PublicKey(checkTarget));
      setCheckResult(entry);
      if (!entry) {
        addToast("info", "Not Found", "No KYC entry found for this address");
      }
    } catch (err) {
      addToast("error", "Failed", parseError(err));
      setCheckResult(null);
    } finally {
      setCheckLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">KYC Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage Know Your Customer entries for treasury participants
        </p>
      </div>

      {/* Approve KYC */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Approve KYC</h2>
        <p className="text-sm text-gray-500 mb-6">
          Create or update a KYC entry for an address.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
            <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Wallet address" className="w-full font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">KYC Level</label>
            <select value={kycLevel} onChange={(e) => setKycLevel(e.target.value)} className="w-full">
              {KYC_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Jurisdiction (3-letter)</label>
            <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase().slice(0, 3))} placeholder="USA" maxLength={3} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Provider</label>
            <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Chainalysis, Elliptic..." className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Expiry Date</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full" />
          </div>
        </div>
        <button onClick={handleApprove} disabled={!target || !provider || approveLoading} className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {approveLoading ? "Approving..." : "Approve KYC"}
        </button>
      </div>

      {/* Revoke KYC */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Revoke KYC</h2>
        <p className="text-sm text-gray-500 mb-6">Deactivate an existing KYC entry.</p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
          <input type="text" value={revokeTarget} onChange={(e) => setRevokeTarget(e.target.value)} placeholder="Address to revoke" className="w-full font-mono text-sm" />
        </div>
        <button onClick={handleRevoke} disabled={!revokeTarget || revokeLoading} className="mt-4 px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {revokeLoading ? "Revoking..." : "Revoke KYC"}
        </button>
      </div>

      {/* Close KYC */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Close KYC Entry</h2>
        <p className="text-sm text-gray-500 mb-6">Reclaim rent from a revoked KYC entry.</p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
          <input type="text" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} placeholder="Address" className="w-full font-mono text-sm" />
        </div>
        <button onClick={handleClose} disabled={!closeTarget || closeLoading} className="mt-4 px-6 py-2.5 bg-dark-600 hover:bg-dark-700 text-white rounded-lg font-medium text-sm transition-colors border border-dark-500 disabled:opacity-50">
          {closeLoading ? "Closing..." : "Close Entry (Reclaim Rent)"}
        </button>
      </div>

      {/* Check KYC */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Check KYC Status</h2>
        <p className="text-sm text-gray-500 mb-6">Look up the KYC status of an address.</p>
        <div className="flex gap-3">
          <input type="text" value={checkTarget} onChange={(e) => setCheckTarget(e.target.value)} placeholder="Address to check" className="flex-1 font-mono text-sm" />
          <button onClick={handleCheck} disabled={!checkTarget || checkLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
            {checkLoading ? "Checking..." : "Check"}
          </button>
        </div>
        {checkResult && (
          <div className="mt-4 p-4 rounded-lg bg-dark-700/50 border border-dark-600">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span className={checkResult.active ? "text-accent-400" : "text-red-400"}>
                  {checkResult.active ? "Active" : "Revoked"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Level:</span>{" "}
                <span className="text-white">
                  {checkResult.kycLevel?.basic !== undefined ? "Basic" : checkResult.kycLevel?.enhanced !== undefined ? "Enhanced" : "Institutional"}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Jurisdiction:</span>{" "}
                <span className="text-white">
                  {String.fromCharCode(...checkResult.jurisdiction.filter((b: number) => b > 0))}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Provider:</span>{" "}
                <span className="text-white">{checkResult.provider}</span>
              </div>
              <div>
                <span className="text-gray-500">Expires:</span>{" "}
                <span className="text-white">
                  {new Date(checkResult.expiresAt.toNumber() * 1000).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Approved:</span>{" "}
                <span className="text-white">
                  {new Date(checkResult.approvedAt.toNumber() * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
