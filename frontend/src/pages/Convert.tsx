import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

export default function Convert() {
  const { treasury, stablecoins, configureFxPair, convert } = useViex();
  const { addToast } = useToast();

  const [sourceMint, setSourceMint] = useState("");
  const [destMint, setDestMint] = useState("");
  const [sourceAmount, setSourceAmount] = useState("");
  const [minDestAmount, setMinDestAmount] = useState("");
  const [priceFeed, setPriceFeed] = useState("");
  const [convertLoading, setConvertLoading] = useState(false);

  const [fxSourceMint, setFxSourceMint] = useState("");
  const [fxDestMint, setFxDestMint] = useState("");
  const [fxPriceFeed, setFxPriceFeed] = useState("");
  const [fxStaleness, setFxStaleness] = useState("300");
  const [fxSlippage, setFxSlippage] = useState("50");
  const [fxEnabled, setFxEnabled] = useState(true);
  const [fxLoading, setFxLoading] = useState(false);

  const mintList = treasury?.mints || [];

  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleConfigureFx = async () => {
    setFxLoading(true);
    try {
      const tx = await configureFxPair(
        new PublicKey(fxSourceMint),
        new PublicKey(fxDestMint),
        new PublicKey(fxPriceFeed),
        parseInt(fxStaleness),
        parseInt(fxSlippage),
        fxEnabled
      );
      addToast("success", "FX Pair Configured", "Price feed linked", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setFxLoading(false);
    }
  };

  const handleConvert = async () => {
    setConvertLoading(true);
    try {
      const tx = await convert(
        new PublicKey(sourceMint),
        new PublicKey(destMint),
        parseInt(sourceAmount),
        parseInt(minDestAmount),
        new PublicKey(priceFeed)
      );
      addToast("success", "Converted", "FX conversion successful", tx);
      setSourceAmount("");
      setMinDestAmount("");
    } catch (err) {
      addToast("error", "Conversion Failed", parseError(err));
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">FX Conversion</h1>
        <p className="text-sm text-gray-400 mt-1">
          Convert between stablecoin currencies using oracle price feeds
        </p>
      </div>

      {/* Configure FX Pair */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Configure FX Pair
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Link a Pyth price feed to an FX currency pair. Authority only.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Source Currency
            </label>
            <select
              value={fxSourceMint}
              onChange={(e) => setFxSourceMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select source...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Destination Currency
            </label>
            <select
              value={fxDestMint}
              onChange={(e) => setFxDestMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select destination...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Pyth Price Feed Address
            </label>
            <input
              type="text"
              value={fxPriceFeed}
              onChange={(e) => setFxPriceFeed(e.target.value)}
              placeholder="Pyth price feed public key"
              className="w-full font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Max Staleness (seconds)
            </label>
            <input
              type="number"
              value={fxStaleness}
              onChange={(e) => setFxStaleness(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Max Slippage (bps)
            </label>
            <input
              type="number"
              value={fxSlippage}
              onChange={(e) => setFxSlippage(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={fxEnabled}
              onChange={(e) => setFxEnabled(e.target.checked)}
              className="w-5 h-5 rounded bg-dark-700 border-dark-600"
            />
            <span className="text-sm text-gray-300">Enabled</span>
          </label>
        </div>
        <button
          onClick={handleConfigureFx}
          disabled={!fxSourceMint || !fxDestMint || !fxPriceFeed || fxLoading}
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {fxLoading ? "Configuring..." : "Configure FX Pair"}
        </button>
      </div>

      {/* Convert */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Convert Currency
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Burn source tokens and mint destination tokens at the oracle FX rate.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              From Currency
            </label>
            <select
              value={sourceMint}
              onChange={(e) => setSourceMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select source...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              To Currency
            </label>
            <select
              value={destMint}
              onChange={(e) => setDestMint(e.target.value)}
              className="w-full"
            >
              <option value="">Select destination...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Source Amount
            </label>
            <input
              type="number"
              value={sourceAmount}
              onChange={(e) => setSourceAmount(e.target.value)}
              placeholder="1000000"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Min Destination Amount
            </label>
            <input
              type="number"
              value={minDestAmount}
              onChange={(e) => setMinDestAmount(e.target.value)}
              placeholder="Slippage protection"
              className="w-full"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-400 mb-1.5">
              Price Feed Address
            </label>
            <input
              type="text"
              value={priceFeed}
              onChange={(e) => setPriceFeed(e.target.value)}
              placeholder="Pyth price feed public key"
              className="w-full font-mono text-sm"
            />
          </div>
        </div>
        <button
          onClick={handleConvert}
          disabled={
            !sourceMint ||
            !destMint ||
            !sourceAmount ||
            !minDestAmount ||
            !priceFeed ||
            convertLoading
          }
          className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {convertLoading ? "Converting..." : "Convert"}
        </button>
      </div>
    </div>
  );
}
