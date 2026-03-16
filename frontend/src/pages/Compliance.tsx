import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";

export default function Compliance() {
  const { treasury, stablecoins, addToBlacklist, removeFromBlacklist, closeBlacklistEntry, seize } = useViex();
  const { addToast } = useToast();
  const { publicKey } = useWallet();

  const [selectedMint, setSelectedMint] = useState("");
  const [targetAddr, setTargetAddr] = useState("");
  const [reason, setReason] = useState("");
  const [blLoading, setBlLoading] = useState(false);

  const [removeMint, setRemoveMint] = useState("");
  const [removeTarget, setRemoveTarget] = useState("");
  const [removeLoading, setRemoveLoading] = useState(false);

  const [closeMint, setCloseMint] = useState("");
  const [closeTarget, setCloseTarget] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const [seizeMint, setSeizeMint] = useState("");
  const [seizeFrom, setSeizeFrom] = useState("");
  const [seizeTo, setSeizeTo] = useState("");
  const [seizeLoading, setSeizeLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleBlacklist = async () => {
    setBlLoading(true);
    try {
      const tx = await addToBlacklist(
        new PublicKey(selectedMint),
        new PublicKey(targetAddr),
        reason
      );
      addToast("success", "Blacklisted", `Address added to blacklist`, tx);
      setTargetAddr("");
      setReason("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setBlLoading(false);
    }
  };

  const handleRemove = async () => {
    setRemoveLoading(true);
    try {
      const tx = await removeFromBlacklist(
        new PublicKey(removeMint),
        new PublicKey(removeTarget)
      );
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
      const tx = await closeBlacklistEntry(
        new PublicKey(closeMint),
        new PublicKey(closeTarget)
      );
      addToast("success", "Closed", "Blacklist entry closed, rent reclaimed", tx);
      setCloseTarget("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const handleSeize = async () => {
    setSeizeLoading(true);
    try {
      const tx = await seize(
        new PublicKey(seizeMint),
        new PublicKey(seizeFrom),
        new PublicKey(seizeTo)
      );
      addToast("success", "Seized", "Tokens seized from blacklisted address", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setSeizeLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance</h1>
        <p className="text-sm text-gray-400 mt-1">
          Blacklist management and token seizure for AML compliance
        </p>
      </div>

      {/* Add to Blacklist */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">Add to Blacklist</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            Restricted
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Block an address from transacting with a stablecoin.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm text-gray-400 mb-1.5">Reason</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="AML violation" className="w-full" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
            <input type="text" value={targetAddr} onChange={(e) => setTargetAddr(e.target.value)} placeholder="Wallet address to blacklist" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleBlacklist} disabled={!selectedMint || !targetAddr || !reason || blLoading} className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {blLoading ? "Processing..." : "Add to Blacklist"}
        </button>
      </div>

      {/* Remove from Blacklist */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Remove from Blacklist</h2>
        <p className="text-sm text-gray-500 mb-6">Deactivate a blacklist entry (must close separately to reclaim rent).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={removeMint} onChange={(e) => setRemoveMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
            <input type="text" value={removeTarget} onChange={(e) => setRemoveTarget(e.target.value)} placeholder="Address to unblacklist" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleRemove} disabled={!removeMint || !removeTarget || removeLoading} className="mt-6 px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {removeLoading ? "Removing..." : "Remove from Blacklist"}
        </button>
      </div>

      {/* Close Blacklist Entry */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Close Blacklist Entry</h2>
        <p className="text-sm text-gray-500 mb-6">Reclaim rent from a deactivated blacklist entry.</p>
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
            <label className="block text-sm text-gray-400 mb-1.5">Target Address</label>
            <input type="text" value={closeTarget} onChange={(e) => setCloseTarget(e.target.value)} placeholder="Blacklisted address" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleClose} disabled={!closeMint || !closeTarget || closeLoading} className="mt-6 px-6 py-2.5 bg-dark-600 hover:bg-dark-700 text-white rounded-lg font-medium text-sm transition-colors border border-dark-500 disabled:opacity-50">
          {closeLoading ? "Closing..." : "Close Entry (Reclaim Rent)"}
        </button>
      </div>

      {/* Seize Tokens */}
      <div className="bg-dark-800 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-lg font-semibold text-white">Seize Tokens</h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            Enforcement
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Forcibly transfer tokens from a blacklisted address using permanent delegate authority.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={seizeMint} onChange={(e) => setSeizeMint(e.target.value)} className="w-full">
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Seize From (blacklisted owner)</label>
            <input type="text" value={seizeFrom} onChange={(e) => setSeizeFrom(e.target.value)} placeholder="Source wallet" className="w-full font-mono text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Seize To (treasury owner)</label>
            <input type="text" value={seizeTo} onChange={(e) => setSeizeTo(e.target.value)} placeholder="Destination wallet" className="w-full font-mono text-sm" />
          </div>
        </div>
        <button onClick={handleSeize} disabled={!seizeMint || !seizeFrom || !seizeTo || seizeLoading} className="mt-6 px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50">
          {seizeLoading ? "Seizing..." : "Seize Tokens"}
        </button>
      </div>
    </div>
  );
}
