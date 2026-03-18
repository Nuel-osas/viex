import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const KYC_LEVELS = [
  {
    value: 0,
    label: "Basic",
    desc: "Individual identity verification with document check",
    color: "emerald",
    requirements: ["Government ID", "Selfie verification", "Basic AML screening"],
  },
  {
    value: 1,
    label: "Enhanced",
    desc: "Extended due diligence with source of funds verification",
    color: "blue",
    requirements: ["All Basic requirements", "Proof of address", "Source of funds", "Enhanced AML/PEP screening"],
  },
  {
    value: 2,
    label: "Institutional",
    desc: "Full corporate verification with beneficial ownership",
    color: "purple",
    requirements: ["All Enhanced requirements", "Corporate registration", "Beneficial ownership", "Board resolution", "Annual review"],
  },
];

type Section = "approve" | "revoke" | "status";

export default function Kyc() {
  const { kycApprove, kycRevoke, kycClose, fetchKycEntry } = useViex();
  const { addToast } = useToast();

  const [activeSection, setActiveSection] = useState<Section>("approve");

  // Approve
  const [target, setTarget] = useState("");
  const [kycLevel, setKycLevel] = useState("0");
  const [jurisdiction, setJurisdiction] = useState("USA");
  const [provider, setProvider] = useState("");
  const [expiry, setExpiry] = useState("");
  const [approveLoading, setApproveLoading] = useState(false);

  // Revoke
  const [revokeTarget, setRevokeTarget] = useState("");
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Close
  const [closeTarget, setCloseTarget] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  // Check
  const [checkTarget, setCheckTarget] = useState("");
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  const handleApprove = async () => {
    setApproveLoading(true);
    try {
      const jurisdictionBytes = jurisdiction.split("").map((c) => c.charCodeAt(0)).slice(0, 3);
      while (jurisdictionBytes.length < 3) jurisdictionBytes.push(0);
      const expiryTimestamp = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      const tx = await kycApprove(new PublicKey(target), parseInt(kycLevel), jurisdictionBytes, provider, expiryTimestamp);
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

  const getKycLevelLabel = (result: any) => {
    if (result?.kycLevel?.basic !== undefined) return "Basic";
    if (result?.kycLevel?.enhanced !== undefined) return "Enhanced";
    return "Institutional";
  };

  const isExpired = (result: any) => {
    if (!result?.expiresAt) return false;
    return result.expiresAt.toNumber() * 1000 < Date.now();
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">KYC Management</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Manage Know Your Customer entries for treasury participants
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl">
        {([
          { key: "approve" as Section, label: "Approve" },
          { key: "revoke" as Section, label: "Revoke" },
          { key: "status" as Section, label: "Check Status" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.key
                ? "bg-gray-800 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSection === "approve" && (
        <>
          {/* KYC Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {KYC_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setKycLevel(String(level.value))}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  kycLevel === String(level.value)
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                    : "border-gray-800/50 bg-gray-900/50 hover:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-bold text-sm ${kycLevel === String(level.value) ? "text-emerald-400" : "text-white"}`}>
                    {level.label}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    kycLevel === String(level.value)
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-700/50 text-gray-500"
                  }`}>
                    Level {level.value}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{level.desc}</p>
                <div className="space-y-1.5">
                  {level.requirements.map((req) => (
                    <div key={req} className="flex items-center gap-2 text-xs">
                      <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-400">{req}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Approve Form */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Approve KYC</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-4">
              Create or update a KYC entry for an address.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
                <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Wallet address" className={`${inputClass} font-mono text-sm`} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">KYC Level</label>
                <select value={kycLevel} onChange={(e) => setKycLevel(e.target.value)} className={selectClass}>
                  {KYC_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label} (Level {l.value})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Jurisdiction (3-letter ISO)</label>
                <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value.toUpperCase().slice(0, 3))} placeholder="USA" maxLength={3} className={inputClass} />
                {jurisdiction.length > 0 && jurisdiction.length < 3 && (
                  <p className="text-amber-400 text-xs mt-1">Must be exactly 3 characters</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Provider</label>
                <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Chainalysis, Elliptic..." className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Expiry Date</label>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputClass} />
                {!expiry && <p className="text-gray-500 text-xs mt-1">Defaults to 1 year from now</p>}
              </div>
            </div>

            <button
              onClick={handleApprove}
              disabled={!target || !provider || approveLoading}
              className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {approveLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Approving...
                </span>
              ) : (
                "Approve KYC"
              )}
            </button>
          </div>
        </>
      )}

      {activeSection === "revoke" && (
        <>
          {/* Revoke KYC */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Revoke KYC</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-4">Deactivate an existing KYC entry.</p>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
              <input type="text" value={revokeTarget} onChange={(e) => setRevokeTarget(e.target.value)} placeholder="Address to revoke" className={`${inputClass} font-mono text-sm`} />
            </div>
            <button
              onClick={handleRevoke}
              disabled={!revokeTarget || revokeLoading}
              className="mt-6 bg-amber-600 hover:bg-amber-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {revokeLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Revoking...
                </span>
              ) : (
                "Revoke KYC"
              )}
            </button>
          </div>

          {/* Close KYC */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Close KYC Entry</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 ml-4">Reclaim rent from a revoked KYC entry.</p>
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="flex items-center gap-2 text-sm text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                SOL rent will be returned to your wallet
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
              <input type="text" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} placeholder="Address" className={`${inputClass} font-mono text-sm`} />
            </div>
            <button
              onClick={handleClose}
              disabled={!closeTarget || closeLoading}
              className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {closeLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Closing...
                </span>
              ) : (
                "Close Entry (Reclaim Rent)"
              )}
            </button>
          </div>
        </>
      )}

      {activeSection === "status" && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Check KYC Status</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">Look up the KYC status of any address.</p>

          <div className="flex gap-3 flex-col sm:flex-row">
            <input type="text" value={checkTarget} onChange={(e) => setCheckTarget(e.target.value)} placeholder="Address to check" className={`flex-1 ${inputClass} font-mono text-sm`} />
            <button
              onClick={handleCheck}
              disabled={!checkTarget || checkLoading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {checkLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking...
                </span>
              ) : (
                "Check Status"
              )}
            </button>
          </div>

          {checkResult && (
            <div className="mt-6 p-5 rounded-xl bg-gray-800/50 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">KYC Entry Details</h3>
                <div className="flex items-center gap-2">
                  {checkResult.active ? (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      REVOKED
                    </span>
                  )}
                  {isExpired(checkResult) && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      EXPIRED
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500 mb-1">Level</p>
                  <p className="text-sm font-medium text-white">{getKycLevelLabel(checkResult)}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500 mb-1">Jurisdiction</p>
                  <p className="text-sm font-medium text-white">
                    {String.fromCharCode(...checkResult.jurisdiction.filter((b: number) => b > 0))}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500 mb-1">Provider</p>
                  <p className="text-sm font-medium text-white">{checkResult.provider}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500 mb-1">Expires</p>
                  <p className={`text-sm font-medium ${isExpired(checkResult) ? "text-rose-400" : "text-white"}`}>
                    {new Date(checkResult.expiresAt.toNumber() * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/50">
                  <p className="text-xs text-gray-500 mb-1">Approved</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(checkResult.approvedAt.toNumber() * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {checkResult === null && checkTarget && !checkLoading && (
            <div className="mt-6 p-5 rounded-xl bg-gray-800/30 border border-gray-700 text-center">
              <p className="text-gray-500 text-sm">No KYC entry found for this address</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
