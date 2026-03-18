import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function TravelRule() {
  const { treasury, stablecoins, attachTravelRule, closeTravelRule } = useViex();
  const { addToast } = useToast();

  const [sourceMint, setSourceMint] = useState("");
  const [originator, setOriginator] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [txSig, setTxSig] = useState("");
  const [amount, setAmount] = useState("");
  const [originatorName, setOriginatorName] = useState("");
  const [originatorVasp, setOriginatorVasp] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryVasp, setBeneficiaryVasp] = useState("");
  const [attachLoading, setAttachLoading] = useState(false);

  const [closeAddr, setCloseAddr] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleAttach = async () => {
    setAttachLoading(true);
    try {
      const sigBytes = new Array(64).fill(0);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(txSig);
      for (let i = 0; i < Math.min(64, encoded.length); i++) {
        sigBytes[i] = encoded[i];
      }
      const hashBytes = sigBytes.slice(0, 32);

      const tx = await attachTravelRule(
        new PublicKey(sourceMint),
        new PublicKey(originator),
        new PublicKey(beneficiary),
        sigBytes,
        hashBytes,
        parseInt(amount),
        originatorName,
        originatorVasp,
        beneficiaryName,
        beneficiaryVasp
      );
      addToast("success", "Travel Rule Attached", "Compliance data recorded on-chain", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAttachLoading(false);
    }
  };

  const handleClose = async () => {
    setCloseLoading(true);
    try {
      const tx = await closeTravelRule(new PublicKey(closeAddr));
      addToast("success", "Closed", "Travel rule message closed, rent reclaimed", tx);
      setCloseAddr("");
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCloseLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Travel Rule</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          FATF Travel Rule compliance -- attach originator and beneficiary information to transfers
        </p>
      </div>

      {/* Threshold Indicator */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="text-sm font-medium text-amber-400">Travel Rule Required</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Required for transfers exceeding the threshold:{" "}
            <span className="font-mono font-semibold">
              {treasury ? `${treasury.travelRuleThreshold.toString()} ${treasury.baseCurrency}` : "N/A"}
            </span>
          </p>
        </div>
      </div>

      {/* Attach Travel Rule */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Attach Travel Rule Data</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          Record travel rule information for a qualifying transfer.
        </p>

        {/* Transfer Info Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-3 h-px bg-gray-600" />
            Transfer Information
            <div className="flex-1 h-px bg-gray-800" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Source Mint</label>
              <select value={sourceMint} onChange={(e) => setSourceMint(e.target.value)} className={selectClass}>
                <option value="">Select...</option>
                {mintList.map((m) => (
                  <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Transfer Amount</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Raw amount" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Transfer Signature</label>
              <input type="text" value={txSig} onChange={(e) => setTxSig(e.target.value)} placeholder="Tx signature" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>
        </div>

        {/* Originator Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-3 h-px bg-gray-600" />
            Originator
            <div className="flex-1 h-px bg-gray-800" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Name</label>
              <input type="text" value={originatorName} onChange={(e) => setOriginatorName(e.target.value)} placeholder="Full legal name" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">VASP</label>
              <input type="text" value={originatorVasp} onChange={(e) => setOriginatorVasp(e.target.value)} placeholder="VASP identifier" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account</label>
              <input type="text" value={originator} onChange={(e) => setOriginator(e.target.value)} placeholder="Wallet address" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>
        </div>

        {/* Beneficiary Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-3 h-px bg-gray-600" />
            Beneficiary
            <div className="flex-1 h-px bg-gray-800" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Name</label>
              <input type="text" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Full legal name" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">VASP</label>
              <input type="text" value={beneficiaryVasp} onChange={(e) => setBeneficiaryVasp(e.target.value)} placeholder="VASP identifier" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account</label>
              <input type="text" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} placeholder="Wallet address" className={`${inputClass} font-mono text-sm`} />
            </div>
          </div>
        </div>

        <button
          onClick={handleAttach}
          disabled={!sourceMint || !originator || !beneficiary || !amount || !originatorName || !beneficiaryName || attachLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {attachLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Attaching...
            </span>
          ) : (
            "Attach Travel Rule Data"
          )}
        </button>
      </div>

      {/* Close Travel Rule */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Close Travel Rule Message</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-4">
          Reclaim rent from a travel rule message account.
        </p>
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            SOL rent will be returned to your wallet
          </div>
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Travel Rule Message Account</label>
          <input type="text" value={closeAddr} onChange={(e) => setCloseAddr(e.target.value)} placeholder="Travel rule message PDA address" className={`${inputClass} font-mono text-sm`} />
        </div>
        <button
          onClick={handleClose}
          disabled={!closeAddr || closeLoading}
          className="mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {closeLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Closing...
            </span>
          ) : (
            "Close Message (Reclaim Rent)"
          )}
        </button>
      </div>
    </div>
  );
}
