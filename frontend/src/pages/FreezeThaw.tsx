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
    return getAssociatedTokenAddressSync(
      new PublicKey(mint),
      new PublicKey(owner),
      false,
      TOKEN_2022_PROGRAM_ID
    );
  };

  const handleFreeze = async () => {
    setFreezeLoading(true);
    try {
      const tokenAccount = getTokenAccount(freezeMint, freezeOwner, freezeCustomAta);
      const tx = await freezeAccount(new PublicKey(freezeMint), tokenAccount);
      addToast("success", "Account Frozen", `Token account frozen`, tx);
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
      addToast("success", "Account Thawed", `Token account thawed`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setThawLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Freeze / Thaw</h1>
        <p className="text-sm text-gray-400 mt-1">
          Freeze or thaw individual token accounts
        </p>
      </div>

      {/* Freeze */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">Freeze Account</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Freeze Authority
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Prevents the token account from sending or receiving tokens.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={freezeMint} onChange={(e) => setFreezeMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Account Owner</label>
            <input type="text" value={freezeOwner} onChange={(e) => setFreezeOwner(e.target.value)} placeholder="Owner wallet (derives ATA)" className="w-full font-mono text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Custom Token Account (optional)
            </label>
            <input type="text" value={freezeCustomAta} onChange={(e) => setFreezeCustomAta(e.target.value)} placeholder="Leave empty to use ATA" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleFreeze} disabled={!freezeMint || !freezeOwner || freezeLoading} className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {freezeLoading ? "Freezing..." : "Freeze Account"}
        </button>
      </div>

      {/* Thaw */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">Thaw Account</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-accent-500/15 text-accent-400 border border-accent-500/30">
            Restore Access
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Unfreezes a previously frozen token account.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={thawMint} onChange={(e) => setThawMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Account Owner</label>
            <input type="text" value={thawOwner} onChange={(e) => setThawOwner(e.target.value)} placeholder="Owner wallet (derives ATA)" className="w-full font-mono text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Custom Token Account (optional)
            </label>
            <input type="text" value={thawCustomAta} onChange={(e) => setThawCustomAta(e.target.value)} placeholder="Leave empty to use ATA" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleThaw} disabled={!thawMint || !thawOwner || thawLoading} className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {thawLoading ? "Thawing..." : "Thaw Account"}
        </button>
      </div>
    </div>
  );
}
