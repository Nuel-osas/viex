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
      // Create 64-byte sig and 32-byte hash from the tx signature string
      const sigBytes = new Array(64).fill(0);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(txSig);
      for (let i = 0; i < Math.min(64, encoded.length); i++) {
        sigBytes[i] = encoded[i];
      }

      // Simple hash: take first 32 bytes of sig for sig_hash
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Travel Rule</h1>
        <p className="text-sm text-gray-400 mt-1">
          FATF Travel Rule compliance -- attach originator and beneficiary
          information to transfers
        </p>
      </div>

      {/* Attach Travel Rule */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Attach Travel Rule Data
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Record travel rule information for a transfer exceeding the threshold (
          {treasury
            ? `${treasury.travelRuleThreshold.toString()} ${treasury.baseCurrency}`
            : "N/A"}
          ).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Source Mint
            </label>
            <select
              value={sourceMint}
              onChange={(e) => setSourceMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Transfer Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Raw amount"
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Transfer Signature
            </label>
            <input
              type="text"
              value={txSig}
              onChange={(e) => setTxSig(e.target.value)}
              placeholder="Transaction signature"
              className="w-full font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Originator Address
            </label>
            <input
              type="text"
              value={originator}
              onChange={(e) => setOriginator(e.target.value)}
              placeholder="Originator wallet"
              className="w-full font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Beneficiary Address
            </label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              placeholder="Beneficiary wallet"
              className="w-full font-mono text-sm"
            />
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-dark-700/50 border border-dark-600">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            VASP Information
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Originator Name
              </label>
              <input
                type="text"
                value={originatorName}
                onChange={(e) => setOriginatorName(e.target.value)}
                placeholder="Full legal name"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Originator VASP
              </label>
              <input
                type="text"
                value={originatorVasp}
                onChange={(e) => setOriginatorVasp(e.target.value)}
                placeholder="VASP identifier"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Beneficiary Name
              </label>
              <input
                type="text"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
                placeholder="Full legal name"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Beneficiary VASP
              </label>
              <input
                type="text"
                value={beneficiaryVasp}
                onChange={(e) => setBeneficiaryVasp(e.target.value)}
                placeholder="VASP identifier"
                className="w-full"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleAttach}
          disabled={
            !sourceMint ||
            !originator ||
            !beneficiary ||
            !amount ||
            !originatorName ||
            !beneficiaryName ||
            attachLoading
          }
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {attachLoading ? "Attaching..." : "Attach Travel Rule Data"}
        </button>
      </div>

      {/* Close Travel Rule */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Close Travel Rule Message
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Reclaim rent from a travel rule message account.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Travel Rule Message Account
          </label>
          <input
            type="text"
            value={closeAddr}
            onChange={(e) => setCloseAddr(e.target.value)}
            placeholder="Travel rule message PDA address"
            className="w-full font-mono text-sm"
          />
        </div>
        <button
          onClick={handleClose}
          disabled={!closeAddr || closeLoading}
          className="mt-4 px-6 py-2.5 bg-dark-600 hover:bg-dark-700 text-white rounded-lg font-medium text-sm transition-colors border border-dark-500 disabled:opacity-50"
        >
          {closeLoading ? "Closing..." : "Close Message (Reclaim Rent)"}
        </button>
      </div>
    </div>
  );
}
