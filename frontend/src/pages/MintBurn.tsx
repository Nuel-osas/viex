import { useState, useMemo } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function MintBurn() {
  const { treasury, stablecoins, mintTokens, burnTokens } = useViex();
  const { addToast } = useToast();

  const [selectedMint, setSelectedMint] = useState("");
  const [mintAmount, setMintAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [mintLoading, setMintLoading] = useState(false);

  const [burnMint, setBurnMint] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [burnLoading, setBurnLoading] = useState(false);

  const mintList = treasury?.mints || [];

  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const getDecimals = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.decimals : 6;
  };

  const mintHumanReadable = useMemo(() => {
    if (!mintAmount || !selectedMint) return "";
    const dec = getDecimals(selectedMint);
    return (parseInt(mintAmount) / Math.pow(10, dec)).toLocaleString(undefined, { maximumFractionDigits: dec });
  }, [mintAmount, selectedMint, stablecoins]);

  const burnHumanReadable = useMemo(() => {
    if (!burnAmount || !burnMint) return "";
    const dec = getDecimals(burnMint);
    return (parseInt(burnAmount) / Math.pow(10, dec)).toLocaleString(undefined, { maximumFractionDigits: dec });
  }, [burnAmount, burnMint, stablecoins]);

  const handleMint = async () => {
    setMintLoading(true);
    try {
      const tx = await mintTokens(new PublicKey(selectedMint), Math.floor(Number(mintAmount) || 0), new PublicKey(recipient));
      addToast("success", "Tokens Minted", `${mintAmount} tokens minted`, tx);
      setMintAmount("");
    } catch (err) {
      addToast("error", "Mint Failed", parseError(err));
    } finally {
      setMintLoading(false);
    }
  };

  const handleBurn = async () => {
    setBurnLoading(true);
    try {
      const tx = await burnTokens(new PublicKey(burnMint), Math.floor(Number(burnAmount) || 0));
      addToast("success", "Tokens Burned", `${burnAmount} tokens burned`, tx);
      setBurnAmount("");
    } catch (err) {
      addToast("error", "Burn Failed", parseError(err));
    } finally {
      setBurnLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Mint & Burn</h1>
        <p className="text-sm text-gray-400 mt-1">
          Issue new tokens or remove them from circulation
        </p>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mint Panel */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Mint Tokens</h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              MINTER
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">
            Mint new tokens to a recipient's associated token account.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Select Mint</label>
              <select value={selectedMint} onChange={(e) => setSelectedMint(e.target.value)} className={selectClass}>
                <option value="">Select a stablecoin...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>
                    {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Amount (raw units)</label>
              <input type="number" value={mintAmount} onChange={(e) => setMintAmount(e.target.value)} placeholder="1000000" className={inputClass} />
              {mintHumanReadable && (
                <p className="text-xs text-emerald-400 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  {mintHumanReadable} {selectedMint ? getSymbol(selectedMint) : "tokens"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Recipient Address</label>
              <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Recipient wallet public key" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleMint}
            disabled={!selectedMint || !mintAmount || !recipient || mintLoading}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {mintLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Minting...
              </span>
            ) : (
              "Mint Tokens"
            )}
          </button>
        </div>

        {/* Burn Panel */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Burn Tokens</h2>
            </div>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
              BURNER
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">
            Burns tokens from your own token account.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Select Mint</label>
              <select value={burnMint} onChange={(e) => setBurnMint(e.target.value)} className={selectClass}>
                <option value="">Select a stablecoin...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>
                    {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Amount (raw units)</label>
              <input type="number" value={burnAmount} onChange={(e) => setBurnAmount(e.target.value)} placeholder="1000000" className={inputClass} />
              {burnHumanReadable && (
                <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                  </svg>
                  {burnHumanReadable} {burnMint ? getSymbol(burnMint) : "tokens"}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleBurn}
            disabled={!burnMint || !burnAmount || burnLoading}
            className="mt-6 w-full bg-rose-600 hover:bg-rose-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {burnLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Burning...
              </span>
            ) : (
              "Burn Tokens"
            )}
          </button>
        </div>
      </div>

      {/* Recent Operations Placeholder */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Recent Operations</h2>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30">
              <div className="w-16 h-4 bg-gray-700/50 rounded animate-pulse" />
              <div className="flex-1 h-4 bg-gray-700/50 rounded animate-pulse" />
              <div className="w-24 h-4 bg-gray-700/50 rounded animate-pulse" />
            </div>
          ))}
          <p className="text-center text-xs text-gray-600 mt-2">
            Operations will appear here after transactions
          </p>
        </div>
      </div>
    </div>
  );
}
