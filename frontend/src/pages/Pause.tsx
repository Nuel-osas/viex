import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function Pause() {
  const { treasury, stablecoins, pause, unpause } = useViex();
  const { addToast } = useToast();

  const [pauseMint, setPauseMint] = useState("");
  const [pauseLoading, setPauseLoading] = useState(false);

  const [unpauseMint, setUnpauseMint] = useState("");
  const [unpauseLoading, setUnpauseLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handlePause = async () => {
    setPauseLoading(true);
    try {
      const tx = await pause(new PublicKey(pauseMint));
      addToast("success", "Paused", `${getSymbol(pauseMint)} is now paused`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setPauseLoading(false);
    }
  };

  const handleUnpause = async () => {
    setUnpauseLoading(true);
    try {
      const tx = await unpause(new PublicKey(unpauseMint));
      addToast("success", "Unpaused", `${getSymbol(unpauseMint)} is now active`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setUnpauseLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Pause / Unpause</h1>
        <p className="text-sm text-gray-400 mt-1">
          Emergency pause to halt all minting and burning operations
        </p>
      </div>

      {/* Current Status */}
      {treasury && treasury.mints.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Current Status
          </h2>
          <div className="space-y-3">
            {treasury.mints.map((m) => {
              const sc = stablecoins.get(m.toBase58());
              if (!sc) return null;
              return (
                <div
                  key={m.toBase58()}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-dark-700/50 border border-dark-600"
                >
                  <div>
                    <span className="font-semibold text-white">{sc.symbol}</span>
                    <span className="text-gray-500 text-sm ml-2">
                      {sc.name}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      sc.paused
                        ? "bg-red-500/15 text-red-400 border-red-500/30"
                        : "bg-accent-500/15 text-accent-400 border-accent-500/30"
                    }`}
                  >
                    {sc.paused ? "PAUSED" : "ACTIVE"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pause */}
      <div className="bg-dark-800 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">
            Pause Stablecoin
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            Emergency
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Halts all minting and burning operations. Existing tokens remain in
          holders' accounts.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Select Stablecoin
          </label>
          <select
            value={pauseMint}
            onChange={(e) => setPauseMint(e.target.value)}
            className="w-full max-w-md"
          >
            <option value="">Select...</option>
            {mintList
              .filter((m) => {
                const sc = stablecoins.get(m.toBase58());
                return sc && !sc.paused;
              })
              .map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} - Active
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={handlePause}
          disabled={!pauseMint || pauseLoading}
          className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {pauseLoading ? "Pausing..." : "Pause Stablecoin"}
        </button>
      </div>

      {/* Unpause */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Unpause Stablecoin
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Resume normal operations for a paused stablecoin.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Select Stablecoin
          </label>
          <select
            value={unpauseMint}
            onChange={(e) => setUnpauseMint(e.target.value)}
            className="w-full max-w-md"
          >
            <option value="">Select...</option>
            {mintList
              .filter((m) => {
                const sc = stablecoins.get(m.toBase58());
                return sc && sc.paused;
              })
              .map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} - Paused
                </option>
              ))}
          </select>
        </div>
        <button
          onClick={handleUnpause}
          disabled={!unpauseMint || unpauseLoading}
          className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {unpauseLoading ? "Unpausing..." : "Unpause Stablecoin"}
        </button>
      </div>
    </div>
  );
}
