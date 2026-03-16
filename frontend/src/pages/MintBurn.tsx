import { useState } from "react";
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

  const handleMint = async () => {
    setMintLoading(true);
    try {
      const tx = await mintTokens(
        new PublicKey(selectedMint),
        parseInt(mintAmount),
        new PublicKey(recipient)
      );
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
      const tx = await burnTokens(new PublicKey(burnMint), parseInt(burnAmount));
      addToast("success", "Tokens Burned", `${burnAmount} tokens burned`, tx);
      setBurnAmount("");
    } catch (err) {
      addToast("error", "Burn Failed", parseError(err));
    } finally {
      setBurnLoading(false);
    }
  };

  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Mint & Burn</h1>
        <p className="text-sm text-gray-400 mt-1">
          Issue new tokens or remove from circulation
        </p>
      </div>

      {/* Mint */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Mint Tokens</h2>
        <p className="text-sm text-gray-500 mb-6">
          Requires minter role or authority. Tokens are minted to the recipient's
          associated token account.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Select Mint
            </label>
            <select
              value={selectedMint}
              onChange={(e) => setSelectedMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select a stablecoin...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Amount (raw units)
            </label>
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="1000000"
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient wallet public key"
              className="w-full font-mono text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleMint}
          disabled={!selectedMint || !mintAmount || !recipient || mintLoading}
          className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {mintLoading ? "Minting..." : "Mint Tokens"}
        </button>
      </div>

      {/* Burn */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Burn Tokens</h2>
        <p className="text-sm text-gray-500 mb-6">
          Burns tokens from your own token account.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Select Mint
            </label>
            <select
              value={burnMint}
              onChange={(e) => setBurnMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select a stablecoin...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Amount (raw units)
            </label>
            <input
              type="number"
              value={burnAmount}
              onChange={(e) => setBurnAmount(e.target.value)}
              placeholder="1000000"
              className="w-full"
            />
          </div>
        </div>
        <button
          onClick={handleBurn}
          disabled={!burnMint || !burnAmount || burnLoading}
          className="mt-6 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {burnLoading ? "Burning..." : "Burn Tokens"}
        </button>
      </div>
    </div>
  );
}
