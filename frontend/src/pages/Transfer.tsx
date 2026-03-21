import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function Transfer() {
  const { treasury, stablecoins, transferTokens, initExtraAccountMetaList } = useViex();
  const { addToast } = useToast();
  const [hookLoading, setHookLoading] = useState(false);

  const [selectedMint, setSelectedMint] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };
  const getDecimals = (mint: string) => stablecoins.get(mint)?.decimals || 6;

  const handleTransfer = async () => {
    setLoading(true);
    try {
      const rawAmount = Math.floor(Number(amount) || 0);
      if (rawAmount <= 0) throw new Error("Amount must be greater than 0");
      const tx = await transferTokens(
        new PublicKey(selectedMint),
        new PublicKey(recipient),
        rawAmount
      );
      addToast("success", "Transfer Successful", `Sent ${(rawAmount / Math.pow(10, getDecimals(selectedMint))).toLocaleString()} ${getSymbol(selectedMint)}`, tx);
      setAmount("");
      setRecipient("");
    } catch (err) {
      addToast("error", "Transfer Failed", parseError(err));
    } finally {
      setLoading(false);
    }
  };

  const stablecoinData = selectedMint ? stablecoins.get(selectedMint) : null;
  const hasHook = stablecoinData?.enableTransferHook;

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Transfer Tokens</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">ALL USERS</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Transfer tokens with automatic transfer hook resolution for compliance checks
        </p>
      </div>

      {/* Hook Info */}
      {hasHook && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-sm text-emerald-300">
            <p className="font-medium">Compliance-Enforced Transfer</p>
            <p className="text-emerald-400/80 mt-1">This stablecoin has an active transfer hook. Blacklist and KYC checks will be enforced automatically on every transfer.</p>
          </div>
        </div>
      )}

      {/* Init Hook (for existing mints that haven't had their ExtraAccountMetaList set up) */}
      {hasHook && selectedMint && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Transfer Hook Setup</p>
              <p className="text-xs text-gray-500 mt-0.5">If transfers fail with "account required", initialize the hook's account list for this mint.</p>
            </div>
            <button
              onClick={async () => {
                setHookLoading(true);
                try {
                  const tx = await initExtraAccountMetaList(new PublicKey(selectedMint));
                  addToast("success", "Hook Initialized", "Extra account meta list created", tx);
                } catch (err) {
                  addToast("error", "Hook Init Failed", parseError(err));
                } finally {
                  setHookLoading(false);
                }
              }}
              disabled={hookLoading}
              className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              {hookLoading ? "Initializing..." : "Init Hook"}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Form */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Send Tokens</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={selectedMint} onChange={(e) => setSelectedMint(e.target.value)} className={selectClass}>
              <option value="">Select stablecoin...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient wallet public key"
              className={`${inputClass} font-mono text-sm`}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Amount (raw units)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000000"
              className={inputClass}
            />
            {amount && selectedMint && (
              <p className="text-xs text-gray-400 mt-1">
                = {(Number(amount) / Math.pow(10, getDecimals(selectedMint))).toLocaleString()} {getSymbol(selectedMint)}
              </p>
            )}
          </div>

          <button
            onClick={handleTransfer}
            disabled={!selectedMint || !recipient || !amount || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transferring...
              </span>
            ) : (
              "Transfer"
            )}
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-gray-600 rounded-full" />
          <h2 className="text-lg font-semibold text-white">How Transfer Works</h2>
        </div>
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-medium">1</span>
            <p>Recipient's token account is auto-created if it doesn't exist</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-medium">2</span>
            <p>Transfer hook extra accounts are automatically resolved (blacklist + KYC PDAs)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-medium">3</span>
            <p>Token-2022 executes the transfer and invokes the hook for compliance checks</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-medium">4</span>
            <p>If sender or recipient is blacklisted, or KYC is missing/expired (SSS-3), transfer is rejected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
