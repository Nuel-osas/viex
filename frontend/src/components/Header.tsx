import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useConnection } from "@solana/wallet-adapter-react";
import { useState } from "react";

export default function Header() {
  const { connection } = useConnection();
  const [network] = useState(() => {
    const endpoint = connection.rpcEndpoint;
    if (endpoint.includes("devnet")) return "Devnet";
    if (endpoint.includes("mainnet")) return "Mainnet";
    if (endpoint.includes("localhost") || endpoint.includes("127.0.0.1"))
      return "Localnet";
    return "Custom";
  });

  return (
    <header className="h-16 border-b border-dark-700 bg-dark-800/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-medium text-gray-300">
          Cross-Border Stablecoin Treasury
        </h2>
        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-primary-500/20 text-primary-400 border border-primary-500/30">
          {network}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700 !rounded-lg !h-10 !text-sm !font-medium" />
      </div>
    </header>
  );
}
