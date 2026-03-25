import { useState, useEffect, useCallback } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

type Tab = "blacklist" | "seize";

interface BlacklistInfo {
  address: string;
  active: boolean;
  reason: string;
}

export default function Compliance() {
  const { treasury, stablecoins, addToBlacklist, removeFromBlacklist, closeBlacklistEntry, seize, isBlacklisted, program } = useViex();
  const { addToast } = useToast();
  const wallet = useWallet();

  const [activeTab, setActiveTab] = useState<Tab>("blacklist");

  // Blacklist - Add
  const [addMint, setAddMint] = useState("");
  const [addTarget, setAddTarget] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Blacklist - Remove
  const [removeMint, setRemoveMint] = useState("");
  const [removeTarget, setRemoveTarget] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  // Blacklist - Close
  const [closeMint, setCloseMint] = useState("");
  const [closeTarget, setCloseTarget] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  // Check status
  const [checkMint, setCheckMint] = useState("");
  const [checkTarget, setCheckTarget] = useState("");
  const [checkResult, setCheckResult] = useState<"blacklisted" | "clear" | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);

  // Seize
  const [seizeMint, setSeizeMint] = useState("");
  const [seizeFrom, setSeizeFrom] = useState("");
  const [seizeTo, setSeizeTo] = useState(wallet.publicKey?.toBase58() || "");
  const [seizeLoading, setSeizeLoading] = useState(false);

  // Shared blacklist data per mint
  const [blacklistData, setBlacklistData] = useState<Map<string, BlacklistInfo[]>>(new Map());
  const [fetchingBlacklist, setFetchingBlacklist] = useState(false);

  // Auto-fill destination with connected wallet
  useEffect(() => {
    if (wallet.publicKey && !seizeTo) {
      setSeizeTo(wallet.publicKey.toBase58());
    }
  }, [wallet.publicKey]);

  // Fetch all blacklisted addresses for a given mint
  const fetchBlacklistForMint = useCallback(async (mint: string) => {
    if (!mint || !program) return;
    if (blacklistData.has(mint)) return; // already fetched
    setFetchingBlacklist(true);
    try {
      const accounts = await (program.account as any).blacklistEntry.all();
      const stablecoinPda = PublicKey.findProgramAddressSync(
        [Buffer.from("stablecoin"), new PublicKey(mint).toBuffer()],
        program.programId
      )[0];
      const entries: BlacklistInfo[] = accounts
        .filter((a: any) => a.account.stablecoin.toBase58() === stablecoinPda.toBase58())
        .map((a: any) => ({
          address: a.account.address.toBase58(),
          active: a.account.active,
          reason: a.account.reason || "",
        }));
      setBlacklistData((prev) => new Map(prev).set(mint, entries));
    } catch {
      // ignore
    } finally {
      setFetchingBlacklist(false);
    }
  }, [program]);

  // Refresh blacklist data (force re-fetch)
  const refreshBlacklist = useCallback((mint: string) => {
    setBlacklistData((prev) => { const m = new Map(prev); m.delete(mint); return m; });
    fetchBlacklistForMint(mint);
  }, [fetchBlacklistForMint]);

  // Fetch when any mint selector changes
  useEffect(() => { fetchBlacklistForMint(removeMint); }, [removeMint]);
  useEffect(() => { fetchBlacklistForMint(closeMint); }, [closeMint]);
  useEffect(() => { fetchBlacklistForMint(seizeMint); }, [seizeMint]);

  const getActiveBlacklisted = (mint: string) => (blacklistData.get(mint) || []).filter((e) => e.active);
  const getInactiveBlacklisted = (mint: string) => (blacklistData.get(mint) || []).filter((e) => !e.active);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleBlacklist = async () => {
    setAddLoading(true);
    try {
      const tx = await addToBlacklist(new PublicKey(addMint), new PublicKey(addTarget), addReason);
      addToast("success", "Blacklisted", "Address added to blacklist", tx);
      setAddTarget("");
      setAddReason("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async () => {
    setRemoveLoading(true);
    try {
      const tx = await removeFromBlacklist(new PublicKey(removeMint), new PublicKey(removeTarget));
      addToast("success", "Removed", "Address removed from blacklist", tx);
      setRemoveTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleClose = async () => {
    setCloseLoading(true);
    try {
      const tx = await closeBlacklistEntry(new PublicKey(closeMint), new PublicKey(closeTarget));
      addToast("success", "Closed", "Blacklist entry closed, rent reclaimed", tx);
      setCloseTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setCheckLoading(true);
    try {
      const result = await isBlacklisted(new PublicKey(checkMint), new PublicKey(checkTarget));
      setCheckResult(result ? "blacklisted" : "clear");
      addToast("info", "Status Check", "Check completed -- see result below");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
      setCheckResult(null);
    } finally {
      setCheckLoading(false);
    }
  };

  const handleSeize = async () => {
    setSeizeLoading(true);
    try {
      const tx = await seize(new PublicKey(seizeMint), new PublicKey(seizeFrom), new PublicKey(seizeTo));
      addToast("success", "Seized", "Tokens seized from blacklisted address", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setSeizeLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Compliance</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            RESTRICTED
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Blacklist management and token seizure for AML compliance
        </p>
      </div>

      {/* Tab UI */}
      <div className="flex gap-1 p-1 bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl">
        {([
          { key: "blacklist" as Tab, label: "Blacklist", badge: "BLACKLISTER" },
          { key: "seize" as Tab, label: "Seize", badge: "SEIZER" },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-gray-800 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${
              activeTab === tab.key
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : "bg-gray-700/50 text-gray-500 border border-gray-700"
            }`}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "blacklist" && (
        <>
          {/* Add to Blacklist */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Add to Blacklist</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-4">
              Block an address from transacting with a stablecoin.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
                <select value={addMint} onChange={(e) => setAddMint(e.target.value)} className={selectClass}>
                  <option value="">Select...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Reason</label>
                <input type="text" value={addReason} onChange={(e) => setAddReason(e.target.value)} placeholder="AML violation, sanctions..." className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
                <input type="text" value={addTarget} onChange={(e) => setAddTarget(e.target.value)} placeholder="Wallet address to blacklist" className={`${inputClass} font-mono text-sm`} />
              </div>
            </div>
            <button
              onClick={handleBlacklist}
              disabled={!addMint || !addTarget || !addReason || addLoading}
              className="mt-6 bg-rose-600 hover:bg-rose-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {addLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Add to Blacklist"
              )}
            </button>
          </div>

          {/* Remove from Blacklist */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Remove from Blacklist</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-4">
              Deactivate a blacklist entry (must close separately to reclaim rent).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
                <select value={removeMint} onChange={(e) => { setRemoveMint(e.target.value); setRemoveTarget(""); }} className={selectClass}>
                  <option value="">Select...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Blacklisted Address</label>
                {getActiveBlacklisted(removeMint).length > 0 ? (
                  <select value={removeTarget} onChange={(e) => setRemoveTarget(e.target.value)} className={selectClass}>
                    <option value="">Select blacklisted address...</option>
                    {getActiveBlacklisted(removeMint).map((e) => (
                      <option key={e.address} value={e.address}>{e.address.slice(0, 8)}...{e.address.slice(-6)} — {e.reason || "No reason"}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={removeTarget} onChange={(e) => setRemoveTarget(e.target.value)} placeholder={removeMint ? (fetchingBlacklist ? "Loading..." : "No active blacklist entries") : "Select a mint first"} className={`${inputClass} font-mono text-sm`} />
                )}
              </div>
            </div>
            <button
              onClick={async () => { await handleRemove(); refreshBlacklist(removeMint); }}
              disabled={!removeMint || !removeTarget || removeLoading}
              className="mt-6 bg-amber-600 hover:bg-amber-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {removeLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Removing...
                </span>
              ) : (
                "Remove from Blacklist"
              )}
            </button>
          </div>

          {/* Close Blacklist Entry */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Close Blacklist Entry</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4 ml-4">
              Reclaim rent from a deactivated blacklist entry.
            </p>
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
                <select value={closeMint} onChange={(e) => { setCloseMint(e.target.value); setCloseTarget(""); }} className={selectClass}>
                  <option value="">Select...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Deactivated Entry</label>
                {getInactiveBlacklisted(closeMint).length > 0 ? (
                  <select value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} className={selectClass}>
                    <option value="">Select deactivated entry...</option>
                    {getInactiveBlacklisted(closeMint).map((e) => (
                      <option key={e.address} value={e.address}>{e.address.slice(0, 8)}...{e.address.slice(-6)} — {e.reason || "No reason"}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} placeholder={closeMint ? (fetchingBlacklist ? "Loading..." : "No deactivated entries to close") : "Select a mint first"} className={`${inputClass} font-mono text-sm`} />
                )}
              </div>
            </div>
            <button
              onClick={async () => { await handleClose(); refreshBlacklist(closeMint); }}
              disabled={!closeMint || !closeTarget || closeLoading}
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

          {/* Check Status */}
          <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Check Blacklist Status</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6 ml-4">
              Check whether an address is currently blacklisted.
            </p>
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="flex-1">
                <select value={checkMint} onChange={(e) => setCheckMint(e.target.value)} className={selectClass}>
                  <option value="">Select stablecoin...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <input type="text" value={checkTarget} onChange={(e) => setCheckTarget(e.target.value)} placeholder="Address to check" className={`${inputClass} font-mono text-sm`} />
              </div>
              <button
                onClick={handleCheckStatus}
                disabled={!checkMint || !checkTarget || checkLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {checkLoading ? "Checking..." : "Check"}
              </button>
            </div>
            {checkResult && (
              <div className="mt-4 flex items-center gap-2">
                {checkResult === "blacklisted" ? (
                  <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    BLACKLISTED
                  </span>
                ) : (
                  <span className="px-3 py-1.5 text-sm font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    CLEAR
                  </span>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "seize" && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-rose-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Seize Tokens</h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
              SEIZER
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4 ml-4">
            Forcibly transfer tokens from a blacklisted address using permanent delegate authority.
          </p>

          <div className="mb-6 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
            <div className="flex items-start gap-2 text-sm text-rose-400">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>This action will transfer all tokens from the source account to the treasury account. The source must be blacklisted.</span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={seizeMint} onChange={(e) => setSeizeMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Source Account (blacklisted owner)</label>
                {getActiveBlacklisted(seizeMint).length > 0 ? (
                  <select value={seizeFrom} onChange={(e) => setSeizeFrom(e.target.value)} className={selectClass}>
                    <option value="">Select blacklisted address...</option>
                    {getActiveBlacklisted(seizeMint).map((e) => (
                      <option key={e.address} value={e.address}>{e.address.slice(0, 8)}...{e.address.slice(-6)} — {e.reason || "No reason"}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={seizeFrom} onChange={(e) => setSeizeFrom(e.target.value)} placeholder={fetchingBlacklist ? "Loading..." : "No blacklisted addresses found — enter manually"} className={`${inputClass} font-mono text-sm`} />
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Treasury Account (destination owner)</label>
                <div className="flex gap-2">
                  <input type="text" value={seizeTo} onChange={(e) => setSeizeTo(e.target.value)} placeholder="Destination wallet" className={`${inputClass} font-mono text-sm flex-1`} />
                  {wallet.publicKey && seizeTo !== wallet.publicKey.toBase58() && (
                    <button
                      onClick={() => setSeizeTo(wallet.publicKey!.toBase58())}
                      className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all whitespace-nowrap"
                    >
                      Use My Wallet
                    </button>
                  )}
                </div>
                {wallet.publicKey && seizeTo === wallet.publicKey.toBase58() && (
                  <p className="text-xs text-emerald-400 mt-1">Using your connected wallet</p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSeize}
            disabled={!seizeMint || !seizeFrom || !seizeTo || seizeLoading}
            className="mt-6 w-full bg-rose-600 hover:bg-rose-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {seizeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Seizing...
              </span>
            ) : (
              "Seize Tokens"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
