import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";

export default function Header() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [network] = useState(() => {
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes("devnet")) return "Devnet";
    if (endpoint.includes("mainnet")) return "Mainnet";
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))
      return "Localnet";
    return "Custom";
  });

  const networkColor: Record<string, string> = {
    Devnet: "bg-amber-400",
    Mainnet: "bg-emerald-400",
    Localnet: "bg-blue-400",
    Custom: "bg-gray-400",
  };

  const truncatedAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  return (
    <header className="relative h-14 bg-navy-800/80 backdrop-blur-md flex items-center justify-between px-6 z-10">
      {/* Left: Logo + subtitle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
            <rect width="32" height="32" rx="8" fill="url(#hg)" />
            <path d="M8 12l8-5 8 5-8 5-8-5z" fill="white" fillOpacity="0.9" />
            <path d="M8 17l8 5 8-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
            <path d="M8 21l8 5 8-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.3" />
            <defs>
              <linearGradient id="hg" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#059669" />
                <stop offset="1" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>
          <div className="hidden sm:block">
            <span className="text-sm font-semibold text-white tracking-tight">VIEX</span>
            <span className="mx-2 text-gray-700">|</span>
            <span className="text-xs text-gray-500 font-medium">Cross-Border Treasury</span>
          </div>
        </div>
      </div>

      {/* Center: Network badge */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-900/80 border border-gray-800/50">
          <span className={`w-2 h-2 rounded-full ${networkColor[network] || networkColor.Custom} animate-pulse-subtle`} />
          <span className="text-xs font-medium text-gray-400">{network}</span>
        </div>
      </div>

      {/* Right: Wallet */}
      <div className="flex items-center gap-3">
        {truncatedAddress && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-900/60 border border-gray-800/40">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-400 font-mono">{truncatedAddress}</span>
          </div>
        )}
        <WalletMultiButton />
      </div>

      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/60 via-emerald-500/20 to-transparent" />
    </header>
  );
}
