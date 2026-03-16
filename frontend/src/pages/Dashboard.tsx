import { useViex } from "../hooks/useViex";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "react-router-dom";
import { BN } from "@coral-xyz/anchor";

function Card({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-dark-800 border border-dark-700 rounded-xl p-6 ${className}`}
    >
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    blue: "bg-primary-500/15 text-primary-400 border-primary-500/30",
    green: "bg-accent-500/15 text-accent-400 border-accent-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
    yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[color]}`}
    >
      {children}
    </span>
  );
}

export default function Dashboard() {
  const { treasury, stablecoins, loading } = useViex();
  const { publicKey } = useWallet();
  const navigate = useNavigate();

  if (!publicKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white">
            VX
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to VIEX Treasury
          </h2>
          <p className="text-gray-400 max-w-md">
            Connect your wallet to manage your cross-border stablecoin treasury
            with full compliance, KYC, and FX conversion capabilities.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading treasury data...</p>
        </div>
      </div>
    );
  }

  if (!treasury) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            No Treasury Found
          </h2>
          <p className="text-gray-400 mb-6">
            Create a new treasury to get started with VIEX.
          </p>
          <button
            onClick={() => navigate("/initialize")}
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Initialize Treasury
          </button>
        </div>
      </div>
    );
  }

  const totalMinted = Array.from(stablecoins.values()).reduce(
    (sum, sc) => sum.add(sc.totalMinted),
    new BN(0)
  );
  const totalBurned = Array.from(stablecoins.values()).reduce(
    (sum, sc) => sum.add(sc.totalBurned),
    new BN(0)
  );
  const totalSupply = totalMinted.sub(totalBurned);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{treasury.name}</h1>
          <p className="text-sm text-gray-400 mt-1">Treasury Dashboard</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/mint-burn")}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Mint Tokens
          </button>
          <button
            onClick={() => navigate("/compliance")}
            className="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm font-medium transition-colors border border-dark-600"
          >
            Compliance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Mints"
          value={treasury.mints.length.toString()}
          sub="Stablecoin currencies"
        />
        <StatCard
          label="Total Supply"
          value={formatAmount(totalSupply)}
          sub="Across all currencies"
        />
        <StatCard
          label="Base Currency"
          value={treasury.baseCurrency}
          sub="Treasury denomination"
        />
        <StatCard
          label="Travel Rule Threshold"
          value={formatAmount(treasury.travelRuleThreshold)}
          sub={treasury.baseCurrency}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Treasury Info" className="lg:col-span-2">
          <div className="space-y-3">
            <InfoRow label="Authority" value={treasury.authority.toBase58()} mono />
            <InfoRow
              label="KYC Required"
              value={
                treasury.kycRequired ? (
                  <Badge color="green">Enabled</Badge>
                ) : (
                  <Badge color="yellow">Disabled</Badge>
                )
              }
            />
            <InfoRow
              label="Created"
              value={new Date(
                treasury.createdAt.toNumber() * 1000
              ).toLocaleDateString()}
            />
            <InfoRow
              label="Mints"
              value={treasury.mints.length.toString()}
            />
          </div>
        </Card>

        <Card title="Quick Actions">
          <div className="space-y-2">
            {[
              { label: "Initialize Stablecoin", path: "/initialize", color: "primary" },
              { label: "Manage Roles", path: "/roles", color: "primary" },
              { label: "KYC Management", path: "/kyc", color: "primary" },
              { label: "FX Conversion", path: "/convert", color: "primary" },
              { label: "Freeze Account", path: "/freeze-thaw", color: "primary" },
            ].map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className="w-full text-left px-4 py-3 rounded-lg bg-dark-700/50 hover:bg-dark-700 text-gray-300 hover:text-white text-sm transition-colors border border-transparent hover:border-dark-600"
              >
                {action.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {treasury.mints.length > 0 && (
        <Card title="Registered Stablecoins">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-dark-700">
                  <th className="pb-3 pr-4">Symbol</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Decimals</th>
                  <th className="pb-3 pr-4">Total Minted</th>
                  <th className="pb-3 pr-4">Total Burned</th>
                  <th className="pb-3 pr-4">Net Supply</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Mint Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {treasury.mints.map((mint) => {
                  const sc = stablecoins.get(mint.toBase58());
                  if (!sc) return null;
                  const net = sc.totalMinted.sub(sc.totalBurned);
                  return (
                    <tr key={mint.toBase58()} className="text-sm">
                      <td className="py-3 pr-4 font-semibold text-white">
                        {sc.symbol}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{sc.name}</td>
                      <td className="py-3 pr-4 text-gray-400">
                        {sc.decimals}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {formatAmount(sc.totalMinted)}
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {formatAmount(sc.totalBurned)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">
                        {formatAmount(net)}
                      </td>
                      <td className="py-3 pr-4">
                        {sc.paused ? (
                          <Badge color="red">Paused</Badge>
                        ) : (
                          <Badge color="green">Active</Badge>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs text-gray-500 truncate max-w-[200px]">
                        {mint.toBase58()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-dark-700 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span
        className={`text-sm text-white ${
          mono ? "font-mono text-xs truncate max-w-[300px]" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatAmount(bn: BN): string {
  const str = bn.toString();
  if (str.length <= 6) return str;
  const whole = str.slice(0, str.length - 6);
  const dec = str.slice(str.length - 6, str.length - 4);
  return `${Number(whole).toLocaleString()}.${dec}`;
}
