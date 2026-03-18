import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const SSS_PRESETS = {
  "SSS-1": {
    label: "SSS-1: Basic",
    desc: "Minimal compliance stablecoin with freeze and burn authority only.",
    features: [
      { name: "Permanent Delegate", enabled: true },
      { name: "Transfer Hook", enabled: false },
      { name: "Allowlist", enabled: false },
      { name: "Default Frozen", enabled: false },
      { name: "Confidential Transfer", enabled: false },
    ],
    config: {
      enablePermanentDelegate: true,
      enableTransferHook: false,
      enableAllowlist: false,
      enableDefaultAccountState: false,
      enableConfidentialTransfer: false,
    },
  },
  "SSS-2": {
    label: "SSS-2: Compliant",
    desc: "Blacklist and transfer hook for on-chain compliance checks.",
    features: [
      { name: "Permanent Delegate", enabled: true },
      { name: "Transfer Hook", enabled: true },
      { name: "Allowlist", enabled: false },
      { name: "Default Frozen", enabled: false },
      { name: "Confidential Transfer", enabled: false },
    ],
    config: {
      enablePermanentDelegate: true,
      enableTransferHook: true,
      enableAllowlist: false,
      enableDefaultAccountState: false,
      enableConfidentialTransfer: false,
    },
  },
  "SSS-3": {
    label: "SSS-3: Full Compliance",
    desc: "Allowlist, transfer hook, and default frozen accounts for maximum control.",
    features: [
      { name: "Permanent Delegate", enabled: true },
      { name: "Transfer Hook", enabled: true },
      { name: "Allowlist", enabled: true },
      { name: "Default Frozen", enabled: true },
      { name: "Confidential Transfer", enabled: false },
    ],
    config: {
      enablePermanentDelegate: true,
      enableTransferHook: true,
      enableAllowlist: true,
      enableDefaultAccountState: true,
      enableConfidentialTransfer: false,
    },
  },
};

type PresetKey = keyof typeof SSS_PRESETS;

export default function Initialize() {
  const { initTreasury, initStablecoin, registerMint, treasury } = useViex();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1
  const [treasuryName, setTreasuryName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [threshold, setThreshold] = useState("1000000000");
  const [kycRequired, setKycRequired] = useState(true);
  const [treasuryLoading, setTreasuryLoading] = useState(false);

  // Step 2
  const [coinName, setCoinName] = useState("");
  const [coinSymbol, setCoinSymbol] = useState("");
  const [coinUri, setCoinUri] = useState("");
  const [coinDecimals, setCoinDecimals] = useState("6");
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>("SSS-2");
  const [coinLoading, setCoinLoading] = useState(false);

  // Step 3
  const [registerMintAddr, setRegisterMintAddr] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (fields: Record<string, string>) => {
    const newErrors: Record<string, string> = {};
    Object.entries(fields).forEach(([key, val]) => {
      if (!val.trim()) newErrors[key] = "This field is required";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInitTreasury = async () => {
    if (!validate({ treasuryName })) return;
    setTreasuryLoading(true);
    try {
      const tx = await initTreasury(treasuryName, baseCurrency, parseInt(threshold), kycRequired);
      addToast("success", "Treasury Created", `Treasury "${treasuryName}" initialized`, tx);
      setCurrentStep(2);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setTreasuryLoading(false);
    }
  };

  const handleInitStablecoin = async () => {
    if (!validate({ coinName, coinSymbol })) return;
    setCoinLoading(true);
    try {
      const preset = SSS_PRESETS[selectedPreset];
      const result = await initStablecoin(coinName, coinSymbol, coinUri || "", parseInt(coinDecimals), preset.config);
      addToast("success", "Stablecoin Created", `${coinSymbol} mint: ${result.mint.toBase58().slice(0, 12)}...`, result.tx);
      setRegisterMintAddr(result.mint.toBase58());
      setCurrentStep(3);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCoinLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!validate({ registerMintAddr })) return;
    setRegisterLoading(true);
    try {
      const tx = await registerMint(new PublicKey(registerMintAddr));
      addToast("success", "Mint Registered", "Mint added to treasury", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setRegisterLoading(false);
    }
  };

  const steps = [
    { num: 1, label: "Create Treasury" },
    { num: 2, label: "Create Stablecoin" },
    { num: 3, label: "Register Mint" },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Treasury & Stablecoin Setup</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Initialize your treasury and deploy compliant stablecoins in three steps
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center flex-1">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                    currentStep > step.num
                      ? "bg-emerald-600 text-white"
                      : currentStep === step.num
                      ? "bg-emerald-600/20 text-emerald-400 border-2 border-emerald-500"
                      : "bg-gray-800 text-gray-500 border border-gray-700"
                  }`}
                >
                  {currentStep > step.num ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.num
                  )}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    currentStep >= step.num ? "text-white" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-4 ${
                    currentStep > step.num ? "bg-emerald-500" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Create Treasury */}
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 transition-all ${currentStep !== 1 && "opacity-60"}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Step 1: Create Treasury</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          One treasury per authority wallet. Manages all your stablecoins.
        </p>

        {treasury && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Treasury already exists: <span className="font-semibold">{treasury.name}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Treasury Name</label>
            <input
              type="text"
              value={treasuryName}
              onChange={(e) => { setTreasuryName(e.target.value); setErrors((p) => ({ ...p, treasuryName: "" })); }}
              placeholder="VIEX Global Treasury"
              className={`w-full bg-gray-800/50 border ${errors.treasuryName ? "border-rose-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none`}
            />
            {errors.treasuryName && <p className="text-rose-400 text-xs mt-1">{errors.treasuryName}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Base Currency</label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="NGN">NGN</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Travel Rule Threshold (lamports)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="1000000000"
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer h-[48px]">
              <div className={`relative w-11 h-6 rounded-full transition-colors ${kycRequired ? "bg-emerald-600" : "bg-gray-700"}`}>
                <input
                  type="checkbox"
                  checked={kycRequired}
                  onChange={(e) => setKycRequired(e.target.checked)}
                  className="sr-only"
                />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${kycRequired ? "translate-x-5" : ""}`} />
              </div>
              <span className="text-sm text-gray-300">Require KYC</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleInitTreasury}
          disabled={!treasuryName || treasuryLoading || !!treasury}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {treasuryLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            "Create Treasury"
          )}
        </button>
      </div>

      {/* Step 2: Create Stablecoin */}
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 transition-all ${currentStep < 2 && "opacity-40 pointer-events-none"}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Step 2: Create Stablecoin</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          Create a Token-2022 mint with compliance extensions.
        </p>

        {/* Preset Selector */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-3">Compliance Preset</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.entries(SSS_PRESETS) as [PresetKey, typeof SSS_PRESETS[PresetKey]][]).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSelectedPreset(key)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedPreset === key
                    ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/5"
                    : "border-gray-800/50 bg-gray-800/30 hover:border-gray-600"
                }`}
              >
                <p className={`font-bold text-sm ${selectedPreset === key ? "text-emerald-400" : "text-white"}`}>
                  {key}
                </p>
                <p className="text-xs text-gray-400 mt-1 mb-3">{preset.desc}</p>
                <div className="space-y-1.5">
                  {preset.features.map((f) => (
                    <div key={f.name} className="flex items-center gap-2 text-xs">
                      {f.enabled ? (
                        <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={f.enabled ? "text-gray-300" : "text-gray-600"}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Name</label>
            <input
              type="text"
              value={coinName}
              onChange={(e) => { setCoinName(e.target.value); setErrors((p) => ({ ...p, coinName: "" })); }}
              placeholder="VIEX Dollar"
              className={`w-full bg-gray-800/50 border ${errors.coinName ? "border-rose-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none`}
            />
            {errors.coinName && <p className="text-rose-400 text-xs mt-1">{errors.coinName}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Symbol</label>
            <input
              type="text"
              value={coinSymbol}
              onChange={(e) => { setCoinSymbol(e.target.value); setErrors((p) => ({ ...p, coinSymbol: "" })); }}
              placeholder="vUSD"
              className={`w-full bg-gray-800/50 border ${errors.coinSymbol ? "border-rose-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none`}
            />
            {errors.coinSymbol && <p className="text-rose-400 text-xs mt-1">{errors.coinSymbol}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Metadata URI</label>
            <input
              type="text"
              value={coinUri}
              onChange={(e) => setCoinUri(e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Decimals</label>
            <select
              value={coinDecimals}
              onChange={(e) => setCoinDecimals(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none"
            >
              <option value="6">6 (standard)</option>
              <option value="9">9</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleInitStablecoin}
          disabled={!coinName || !coinSymbol || coinLoading || !treasury}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {coinLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Mint...
            </span>
          ) : (
            "Create Stablecoin"
          )}
        </button>
      </div>

      {/* Step 3: Register Mint */}
      <div className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6 transition-all ${currentStep < 3 && "opacity-40 pointer-events-none"}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Step 3: Register Mint in Treasury</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          Link the newly created mint to your treasury.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Mint Address</label>
          <input
            type="text"
            value={registerMintAddr}
            onChange={(e) => { setRegisterMintAddr(e.target.value); setErrors((p) => ({ ...p, registerMintAddr: "" })); }}
            placeholder="Mint public key..."
            className={`w-full bg-gray-800/50 border ${errors.registerMintAddr ? "border-rose-500" : "border-gray-700"} rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none font-mono text-sm`}
          />
          {errors.registerMintAddr && <p className="text-rose-400 text-xs mt-1">{errors.registerMintAddr}</p>}
        </div>
        <button
          onClick={handleRegister}
          disabled={!registerMintAddr || registerLoading || !treasury}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {registerLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Registering...
            </span>
          ) : (
            "Register Mint"
          )}
        </button>
      </div>

      {/* Step Navigator */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous Step
        </button>
        <button
          onClick={() => setCurrentStep(Math.min(3, currentStep + 1))}
          disabled={currentStep === 3}
          className="bg-gray-700 hover:bg-gray-600 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next Step
        </button>
      </div>
    </div>
  );
}
