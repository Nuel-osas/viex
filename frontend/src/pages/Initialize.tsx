import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";

const SSS_PRESETS = {
  "SSS-1": {
    label: "SSS-1: Basic Stablecoin",
    desc: "Minimal compliance. Freeze + burn authority only.",
    config: {
      enablePermanentDelegate: true,
      enableTransferHook: false,
      enableAllowlist: false,
      enableDefaultAccountState: false,
      enableConfidentialTransfer: false,
    },
  },
  "SSS-2": {
    label: "SSS-2: Compliant Stablecoin",
    desc: "Blacklist + transfer hook for compliance checks.",
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
    desc: "Allowlist + transfer hook + default frozen accounts.",
    config: {
      enablePermanentDelegate: true,
      enableTransferHook: true,
      enableAllowlist: true,
      enableDefaultAccountState: true,
      enableConfidentialTransfer: false,
    },
  },
};

export default function Initialize() {
  const { initTreasury, initStablecoin, registerMint, treasury } = useViex();
  const { addToast } = useToast();

  const [treasuryName, setTreasuryName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [threshold, setThreshold] = useState("1000000000");
  const [kycRequired, setKycRequired] = useState(true);
  const [treasuryLoading, setTreasuryLoading] = useState(false);

  const [coinName, setCoinName] = useState("");
  const [coinSymbol, setCoinSymbol] = useState("");
  const [coinUri, setCoinUri] = useState("");
  const [coinDecimals, setCoinDecimals] = useState("6");
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof SSS_PRESETS>("SSS-2");
  const [coinLoading, setCoinLoading] = useState(false);

  const [registerMintAddr, setRegisterMintAddr] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);

  const handleInitTreasury = async () => {
    setTreasuryLoading(true);
    try {
      const tx = await initTreasury(
        treasuryName,
        baseCurrency,
        parseInt(threshold),
        kycRequired
      );
      addToast("success", "Treasury Created", `Treasury "${treasuryName}" initialized`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setTreasuryLoading(false);
    }
  };

  const handleInitStablecoin = async () => {
    setCoinLoading(true);
    try {
      const preset = SSS_PRESETS[selectedPreset];
      const result = await initStablecoin(
        coinName,
        coinSymbol,
        coinUri || "",
        parseInt(coinDecimals),
        preset.config
      );
      addToast(
        "success",
        "Stablecoin Created",
        `${coinSymbol} mint: ${result.mint.toBase58().slice(0, 12)}...`,
        result.tx
      );
      setRegisterMintAddr(result.mint.toBase58());
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setCoinLoading(false);
    }
  };

  const handleRegister = async () => {
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Initialize</h1>
        <p className="text-sm text-gray-400 mt-1">
          Create your treasury and stablecoin currencies
        </p>
      </div>

      {/* Init Treasury */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Create Treasury
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          One treasury per authority wallet. Manages all your stablecoins.
        </p>
        {treasury && (
          <div className="mb-4 p-3 rounded-lg bg-accent-500/10 border border-accent-500/30 text-accent-400 text-sm">
            Treasury already exists: {treasury.name}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Treasury Name
            </label>
            <input
              type="text"
              value={treasuryName}
              onChange={(e) => setTreasuryName(e.target.value)}
              placeholder="VIEX Global Treasury"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Base Currency
            </label>
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value)}
              className="w-full"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="NGN">NGN</option>
              <option value="JPY">JPY</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Travel Rule Threshold (lamports)
            </label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="1000000000"
              className="w-full"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={kycRequired}
                onChange={(e) => setKycRequired(e.target.checked)}
                className="w-5 h-5 rounded bg-dark-700 border-dark-600 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-300">Require KYC</span>
            </label>
          </div>
        </div>
        <button
          onClick={handleInitTreasury}
          disabled={!treasuryName || treasuryLoading || !!treasury}
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {treasuryLoading ? "Creating..." : "Create Treasury"}
        </button>
      </div>

      {/* Init Stablecoin */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Initialize Stablecoin
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Create a new Token-2022 mint with compliance extensions.
        </p>

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">
            Compliance Preset
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(SSS_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => setSelectedPreset(key as keyof typeof SSS_PRESETS)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selectedPreset === key
                    ? "border-primary-500 bg-primary-500/10"
                    : "border-dark-600 bg-dark-700/50 hover:border-dark-500"
                }`}
              >
                <p className="font-semibold text-sm text-white">{key}</p>
                <p className="text-xs text-gray-400 mt-1">{preset.desc}</p>
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
              onChange={(e) => setCoinName(e.target.value)}
              placeholder="VIEX Dollar"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Symbol
            </label>
            <input
              type="text"
              value={coinSymbol}
              onChange={(e) => setCoinSymbol(e.target.value)}
              placeholder="vUSD"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Metadata URI
            </label>
            <input
              type="text"
              value={coinUri}
              onChange={(e) => setCoinUri(e.target.value)}
              placeholder="https://..."
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Decimals
            </label>
            <select
              value={coinDecimals}
              onChange={(e) => setCoinDecimals(e.target.value)}
              className="w-full"
            >
              <option value="6">6 (standard)</option>
              <option value="9">9</option>
              <option value="2">2</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-dark-700/50 border border-dark-600">
          <p className="text-xs text-gray-500 mb-2">Enabled Extensions:</p>
          <div className="flex flex-wrap gap-2">
            {SSS_PRESETS[selectedPreset].config.enablePermanentDelegate && (
              <span className="px-2 py-0.5 text-xs bg-primary-500/10 text-primary-400 rounded border border-primary-500/20">
                Permanent Delegate
              </span>
            )}
            {SSS_PRESETS[selectedPreset].config.enableTransferHook && (
              <span className="px-2 py-0.5 text-xs bg-primary-500/10 text-primary-400 rounded border border-primary-500/20">
                Transfer Hook
              </span>
            )}
            {SSS_PRESETS[selectedPreset].config.enableAllowlist && (
              <span className="px-2 py-0.5 text-xs bg-primary-500/10 text-primary-400 rounded border border-primary-500/20">
                Allowlist
              </span>
            )}
            {SSS_PRESETS[selectedPreset].config.enableDefaultAccountState && (
              <span className="px-2 py-0.5 text-xs bg-primary-500/10 text-primary-400 rounded border border-primary-500/20">
                Default Frozen
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleInitStablecoin}
          disabled={!coinName || !coinSymbol || coinLoading || !treasury}
          className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {coinLoading ? "Creating Mint..." : "Create Stablecoin"}
        </button>
      </div>

      {/* Register Mint */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          Register Mint in Treasury
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          After creating a stablecoin, register its mint with the treasury.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">
            Mint Address
          </label>
          <input
            type="text"
            value={registerMintAddr}
            onChange={(e) => setRegisterMintAddr(e.target.value)}
            placeholder="Mint public key..."
            className="w-full font-mono text-sm"
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={!registerMintAddr || registerLoading || !treasury}
          className="mt-4 px-6 py-2.5 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {registerLoading ? "Registering..." : "Register Mint"}
        </button>
      </div>
    </div>
  );
}
