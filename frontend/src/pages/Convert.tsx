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
  const [slippageBps, setSlippageBps] = useState("50");
  const [convertLoading, setConvertLoading] = useState(false);

  const [showFxConfig, setShowFxConfig] = useState(false);
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
        Math.floor(Number(fxStaleness) || 0),
        Math.floor(Number(fxSlippage) || 0),
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
      const parsedSourceAmount = Math.floor(Number(sourceAmount) || 0);
      const parsedSlippage = Math.floor(Number(slippageBps) || 0);
      const calculatedMin = Math.floor(Number(minDestAmount) || 0) || Math.floor(parsedSourceAmount * (10000 - parsedSlippage) / 10000);
      const tx = await convert(
        new PublicKey(sourceMint),
        new PublicKey(destMint),
        parsedSourceAmount,
        calculatedMin,
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

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">FX Conversion</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Convert between stablecoin currencies using oracle price feeds
        </p>
      </div>

      {/* Currency Pair Converter */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Convert Currency</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          Burn source tokens and mint destination tokens at the oracle FX rate.
        </p>

        {/* Currency Pair Selector */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1.5">From</label>
            <select value={sourceMint} onChange={(e) => setSourceMint(e.target.value)} className={selectClass}>
              <option value="">Select source...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 mt-6">
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1.5">To</label>
            <select value={destMint} onChange={(e) => setDestMint(e.target.value)} className={selectClass}>
              <option value="">Select destination...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Source Amount</label>
            <input type="number" value={sourceAmount} onChange={(e) => setSourceAmount(e.target.value)} placeholder="1000000" className={inputClass} />
            {sourceAmount && sourceMint && (
              <p className="text-xs text-gray-400 mt-1">
                You send: {(parseInt(sourceAmount) / Math.pow(10, stablecoins.get(sourceMint)?.decimals || 6)).toLocaleString()} {getSymbol(sourceMint)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Min Destination Amount</label>
            <input type="number" value={minDestAmount} onChange={(e) => setMinDestAmount(e.target.value)} placeholder="Slippage protection" className={inputClass} />
            {minDestAmount && destMint && (
              <p className="text-xs text-emerald-400 mt-1">
                You receive at least: {(parseInt(minDestAmount) / Math.pow(10, stablecoins.get(destMint)?.decimals || 6)).toLocaleString()} {getSymbol(destMint)}
              </p>
            )}
          </div>
        </div>

        {/* Slippage Tolerance */}
        <div className="mb-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Slippage Tolerance</span>
            <span className="text-sm font-medium text-white">{(parseInt(slippageBps) / 100).toFixed(2)}%</span>
          </div>
          <div className="flex gap-2">
            {["25", "50", "100", "200"].map((bps) => (
              <button
                key={bps}
                onClick={() => setSlippageBps(bps)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  slippageBps === bps
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                }`}
              >
                {(parseInt(bps) / 100).toFixed(2)}%
              </button>
            ))}
            <input
              type="number"
              value={slippageBps}
              onChange={(e) => setSlippageBps(e.target.value)}
              className="w-20 bg-gray-800/50 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white text-center outline-none focus:border-emerald-500"
              placeholder="bps"
            />
          </div>
        </div>

        {/* Price Feed */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-1.5">Price Feed Address</label>
          <input type="text" value={priceFeed} onChange={(e) => setPriceFeed(e.target.value)} placeholder="Pyth price feed public key" className={`${inputClass} font-mono text-sm`} />
        </div>

        <button
          onClick={handleConvert}
          disabled={!sourceMint || !destMint || !sourceAmount || !priceFeed || convertLoading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {convertLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Converting...
            </span>
          ) : (
            "Convert"
          )}
        </button>
      </div>

      {/* FX Pair Configuration (Collapsible) */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowFxConfig(!showFxConfig)}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-800/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Configure FX Pair</h2>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 ml-2">
              Admin
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${showFxConfig ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showFxConfig && (
          <div className="px-6 pb-6 border-t border-gray-800/50">
            <p className="text-sm text-gray-500 mt-4 mb-6">
              Link a Pyth price feed to an FX currency pair. Authority only.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Source Currency</label>
                <select value={fxSourceMint} onChange={(e) => setFxSourceMint(e.target.value)} className={selectClass}>
                  <option value="">Select source...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Destination Currency</label>
                <select value={fxDestMint} onChange={(e) => setFxDestMint(e.target.value)} className={selectClass}>
                  <option value="">Select destination...</option>
                  {mintList.map((m) => (
                    <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1.5">Pyth Price Feed Address</label>
                <input type="text" value={fxPriceFeed} onChange={(e) => setFxPriceFeed(e.target.value)} placeholder="Pyth price feed public key" className={`${inputClass} font-mono text-sm`} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Max Staleness (seconds)</label>
                <input type="number" value={fxStaleness} onChange={(e) => setFxStaleness(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Max Slippage (bps)</label>
                <input type="number" value={fxSlippage} onChange={(e) => setFxSlippage(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-11 h-6 rounded-full transition-colors ${fxEnabled ? "bg-emerald-600" : "bg-gray-700"}`}>
                  <input type="checkbox" checked={fxEnabled} onChange={(e) => setFxEnabled(e.target.checked)} className="sr-only" />
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${fxEnabled ? "translate-x-5" : ""}`} />
                </div>
                <span className="text-sm text-gray-300">Enabled</span>
              </label>
            </div>
            <button
              onClick={handleConfigureFx}
              disabled={!fxSourceMint || !fxDestMint || !fxPriceFeed || fxLoading}
              className="mt-6 bg-amber-600 hover:bg-amber-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {fxLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Configuring...
                </span>
              ) : (
                "Configure FX Pair"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
