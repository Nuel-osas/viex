import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function Pause() {
  const { treasury, stablecoins, pause, unpause } = useViex();
  const { addToast } = useToast();

  const [selectedMint, setSelectedMint] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const selectedStablecoin = selectedMint ? stablecoins.get(selectedMint) : null;
  const isPaused = selectedStablecoin?.paused || false;

  const handleToggle = async () => {
    if (!selectedMint) return;
    setActionLoading(true);
    try {
      if (isPaused) {
        const tx = await unpause(new PublicKey(selectedMint));
        addToast("success", "Unpaused", `${getSymbol(selectedMint)} is now active`, tx);
      } else {
        const tx = await pause(new PublicKey(selectedMint));
        addToast("success", "Paused", `${getSymbol(selectedMint)} is now paused`, tx);
      }
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Pause Controls</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            PAUSER
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Emergency pause to halt all minting and burning operations
        </p>
      </div>

      {/* Status Overview */}
      {treasury && treasury.mints.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Stablecoin Status</h2>
          </div>
          <div className="space-y-3">
            {treasury.mints.map((m) => {
              const sc = stablecoins.get(m.toBase58());
              if (!sc) return null;
              return (
                <button
                  key={m.toBase58()}
                  onClick={() => setSelectedMint(m.toBase58())}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                    selectedMint === m.toBase58()
                      ? "bg-gray-800/50 border-emerald-500/50"
                      : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-700/50 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-300">{sc.symbol.slice(0, 3)}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-semibold text-white text-sm">{sc.symbol}</span>
                      <p className="text-xs text-gray-500">{sc.name}</p>
                    </div>
                  </div>
                  {sc.paused ? (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                      PAUSED
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Large Status Display & Toggle */}
      {selectedMint && (
        <div className={`bg-gray-900/50 backdrop-blur-sm border rounded-xl p-8 text-center ${
          isPaused ? "border-rose-500/30" : "border-emerald-500/30"
        }`}>
          {/* Large Status */}
          <div className="mb-6">
            <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
              isPaused
                ? "bg-rose-500/20 border-2 border-rose-500/50"
                : "bg-emerald-500/20 border-2 border-emerald-500/50"
            }`}>
              {isPaused ? (
                <svg className="w-10 h-10 text-rose-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <h3 className={`text-3xl font-bold ${isPaused ? "text-rose-400" : "text-emerald-400"}`}>
              {isPaused ? "PAUSED" : "ACTIVE"}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {getSymbol(selectedMint)} -- {selectedStablecoin?.name}
            </p>
          </div>

          {/* Warning */}
          {!isPaused && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-left max-w-md mx-auto">
              <div className="flex items-start gap-2 text-sm text-amber-400">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="font-medium">Pausing will affect:</p>
                  <ul className="text-xs text-amber-400/70 mt-1 space-y-0.5 list-disc list-inside">
                    <li>All minting operations</li>
                    <li>All burning operations</li>
                    <li>FX conversions involving this mint</li>
                  </ul>
                  <p className="text-xs text-amber-400/70 mt-1">Existing token transfers will still work.</p>
                </div>
              </div>
            </div>
          )}

          {isPaused && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-left max-w-md mx-auto">
              <div className="flex items-start gap-2 text-sm text-emerald-400">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Unpausing will restore:</p>
                  <ul className="text-xs text-emerald-400/70 mt-1 space-y-0.5 list-disc list-inside">
                    <li>Minting operations</li>
                    <li>Burning operations</li>
                    <li>FX conversions</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            onClick={handleToggle}
            disabled={actionLoading}
            className={`px-8 py-4 rounded-xl font-semibold text-lg text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              isPaused
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                : "bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-500/20"
            }`}
          >
            {actionLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {isPaused ? "Unpausing..." : "Pausing..."}
              </span>
            ) : isPaused ? (
              "Unpause Stablecoin"
            ) : (
              "Pause Stablecoin"
            )}
          </button>
        </div>
      )}

      {/* No Selection */}
      {!selectedMint && treasury && treasury.mints.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500">Select a stablecoin above to view its pause status</p>
        </div>
      )}
    </div>
  );
}
