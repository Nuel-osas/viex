import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export default function FreezeThaw() {
  const { treasury, stablecoins, freezeAccount, thawAccount } = useViex();
  const { addToast } = useToast();

  const [freezeMint, setFreezeMint] = useState("");
  const [freezeOwner, setFreezeOwner] = useState("");
  const [freezeCustomAta, setFreezeCustomAta] = useState("");
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [thawMint, setThawMint] = useState("");
  const [thawOwner, setThawOwner] = useState("");
  const [thawCustomAta, setThawCustomAta] = useState("");
  const [thawLoading, setThawLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const getTokenAccount = (mint: string, owner: string, customAta: string) => {
    if (customAta) return new PublicKey(customAta);
    return getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner), false, TOKEN_2022_PROGRAM_ID);
  };

  const handleFreeze = async () => {
    setFreezeLoading(true);
    try {
      const tokenAccount = getTokenAccount(freezeMint, freezeOwner, freezeCustomAta);
      const tx = await freezeAccount(new PublicKey(freezeMint), tokenAccount);
      addToast("success", "Account Frozen", "Token account frozen", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleThaw = async () => {
    setThawLoading(true);
    try {
      const tokenAccount = getTokenAccount(thawMint, thawOwner, thawCustomAta);
      const tx = await thawAccount(new PublicKey(thawMint), tokenAccount);
      addToast("success", "Account Thawed", "Token account thawed", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setThawLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Freeze & Thaw</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            PAUSER
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Freeze or thaw individual token accounts
        </p>
      </div>

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Freeze Panel */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Freeze Account</h2>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">
            Prevents the token account from sending or receiving tokens.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={freezeMint} onChange={(e) => setFreezeMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account Owner</label>
              <input type="text" value={freezeOwner} onChange={(e) => setFreezeOwner(e.target.value)} placeholder="Owner wallet (derives ATA)" className={`${inputClass} font-mono text-sm`} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Custom Token Account <span className="text-gray-600">(optional)</span>
              </label>
              <input type="text" value={freezeCustomAta} onChange={(e) => setFreezeCustomAta(e.target.value)} placeholder="Leave empty to use ATA" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleFreeze}
            disabled={!freezeMint || !freezeOwner || freezeLoading}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {freezeLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Freezing...
              </span>
            ) : (
              "Freeze Account"
            )}
          </button>
        </div>

        {/* Thaw Panel */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">Thaw Account</h2>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-6 ml-4">
            Unfreezes a previously frozen token account, restoring access.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
              <select value={thawMint} onChange={(e) => setThawMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account Owner</label>
              <input type="text" value={thawOwner} onChange={(e) => setThawOwner(e.target.value)} placeholder="Owner wallet (derives ATA)" className={`${inputClass} font-mono text-sm`} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Custom Token Account <span className="text-gray-600">(optional)</span>
              </label>
              <input type="text" value={thawCustomAta} onChange={(e) => setThawCustomAta(e.target.value)} placeholder="Leave empty to use ATA" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>

          <button
            onClick={handleThaw}
            disabled={!thawMint || !thawOwner || thawLoading}
            className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {thawLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Thawing...
              </span>
            ) : (
              "Thaw Account"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
