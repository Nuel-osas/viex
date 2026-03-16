import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function Authority() {
  const { treasury, stablecoins, nominateAuthority, acceptAuthority, transferAuthority } = useViex();
  const { addToast } = useToast();

  const [nomMint, setNomMint] = useState("");
  const [nomAddr, setNomAddr] = useState("");
  const [nomLoading, setNomLoading] = useState(false);

  const [acceptMint, setAcceptMint] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);

  const [directMint, setDirectMint] = useState("");
  const [directAddr, setDirectAddr] = useState("");
  const [directLoading, setDirectLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleNominate = async () => {
    setNomLoading(true);
    try {
      const tx = await nominateAuthority(new PublicKey(nomMint), new PublicKey(nomAddr));
      addToast("success", "Authority Nominated", `New authority nominated: ${nomAddr.slice(0, 12)}...`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setNomLoading(false);
    }
  };

  const handleAccept = async () => {
    setAcceptLoading(true);
    try {
      const tx = await acceptAuthority(new PublicKey(acceptMint));
      addToast("success", "Authority Accepted", "You are now the authority", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleDirect = async () => {
    setDirectLoading(true);
    try {
      const tx = await transferAuthority(new PublicKey(directMint), new PublicKey(directAddr));
      addToast("success", "Authority Transferred", `Authority transferred to ${directAddr.slice(0, 12)}...`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setDirectLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Authority Transfer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Transfer control of a stablecoin to a new authority (2-step or direct)
        </p>
      </div>

      {/* Current Authorities */}
      {treasury && treasury.mints.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Authorities</h2>
          <div className="space-y-3">
            {treasury.mints.map((m) => {
              const sc = stablecoins.get(m.toBase58());
              if (!sc) return null;
              return (
                <div key={m.toBase58()} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
                  <span className="text-sm font-semibold text-white">{sc.symbol}</span>
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-400">{sc.authority.toBase58()}</p>
                    {sc.pendingAuthority && (
                      <p className="text-xs text-yellow-400 mt-0.5">
                        Pending: {sc.pendingAuthority.toBase58().slice(0, 16)}...
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nominate */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Nominate New Authority</h2>
        <p className="text-sm text-gray-500 mb-6">
          Step 1 of 2-step transfer. The nominee must call Accept Authority to complete.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={nomMint} onChange={(e) => setNomMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">New Authority</label>
            <input type="text" value={nomAddr} onChange={(e) => setNomAddr(e.target.value)} placeholder="New authority address" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleNominate} disabled={!nomMint || !nomAddr || nomLoading} className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {nomLoading ? "Nominating..." : "Nominate Authority"}
        </button>
      </div>

      {/* Accept */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Accept Authority</h2>
        <p className="text-sm text-gray-500 mb-6">
          Step 2 of 2-step transfer. Call this from the nominated wallet.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Stablecoin Mint</label>
          <select value={acceptMint} onChange={(e) => setAcceptMint(e.target.value)} className="w-full max-w-md">
            <option value="">Select...</option>
            {mintList.map((m) => (
              <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
            ))}
          </select>
        </div>
        <button onClick={handleAccept} disabled={!acceptMint || acceptLoading} className="mt-4 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {acceptLoading ? "Accepting..." : "Accept Authority"}
        </button>
      </div>

      {/* Direct Transfer */}
      <div className="bg-dark-800 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">Direct Transfer</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400 border border-red-500/30">Irreversible</span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Immediately transfer authority without 2-step process. Use with caution.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={directMint} onChange={(e) => setDirectMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">New Authority</label>
            <input type="text" value={directAddr} onChange={(e) => setDirectAddr(e.target.value)} placeholder="New authority address" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleDirect} disabled={!directMint || !directAddr || directLoading} className="mt-6 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {directLoading ? "Transferring..." : "Transfer Authority Now"}
        </button>
      </div>
    </div>
  );
}
