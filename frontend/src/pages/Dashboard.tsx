import { useState } from "react";
import { useViex } from "../hooks/useViex";
import { StablecoinState } from "../hooks/useViex";
import { useWallet } from "@solana/wallet-adapter-react";
import { Link } from "react-router-dom";
import { BN } from "@coral-xyz/anchor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAmount(bn: BN): string {
  const str = bn.toString();
  if (str.length <= 6) return str;
  const whole = str.slice(0, str.length - 6);
  const dec = str.slice(str.length - 6, str.length - 4);
  return `${Number(whole).toLocaleString()}.${dec}`;
}

function truncateAddress(addr: string, chars = 4): string {
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

function deriveComplianceLevel(sc: StablecoinState): "SSS-1" | "SSS-2" | "SSS-3" {
  if (sc.enableTransferHook && sc.enablePermanentDelegate) return "SSS-3";
  if (sc.enableTransferHook) return "SSS-2";
  return "SSS-1";
}

function complianceBadgeColors(level: string) {
  switch (level) {
    case "SSS-3":
      return "bg-violet-500/15 text-violet-400 border-violet-500/30";
    case "SSS-2":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    default:
      return "bg-gray-500/15 text-gray-400 border-gray-500/30";
  }
}

// ---------------------------------------------------------------------------
// Copy Button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-gray-500 hover:text-emerald-400 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function SkeletonPulse({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700/50 rounded ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
            <SkeletonPulse className="h-4 w-20 mb-3" />
            <SkeletonPulse className="h-8 w-32 mb-2" />
            <SkeletonPulse className="h-3 w-24" />
          </div>
        ))}
      </div>
      {/* Treasury info */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <SkeletonPulse className="h-5 w-40 mb-6" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex justify-between py-3">
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-4 w-48" />
          </div>
        ))}
      </div>
      {/* Table */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <SkeletonPulse className="h-5 w-48 mb-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-6 py-3">
            <SkeletonPulse className="h-4 w-16" />
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-4 w-32" />
            <SkeletonPulse className="h-4 w-20" />
            <SkeletonPulse className="h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5">
            <SkeletonPulse className="h-8 w-8 rounded-lg mb-3" />
            <SkeletonPulse className="h-5 w-28 mb-2" />
            <SkeletonPulse className="h-3 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

const icons = {
  treasury: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  currencies: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ),
  kyc: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  threshold: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  mint: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  compliance: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </svg>
  ),
  roles: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  convert: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  ),
  travelRule: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
  arrow: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  ),
  activity: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
  accentColor = "emerald",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accentColor?: "emerald" | "amber" | "rose" | "violet";
}) {
  const borderColors: Record<string, string> = {
    emerald: "border-l-emerald-500",
    amber: "border-l-amber-500",
    rose: "border-l-rose-500",
    violet: "border-l-violet-500",
  };
  const iconBgColors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
    violet: "bg-violet-500/10 text-violet-400",
  };

  return (
    <div
      className={`bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5 border-l-2 ${borderColors[accentColor]} hover:bg-gray-900/70 transition-all duration-200`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${iconBgColors[accentColor]}`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Action Card
// ---------------------------------------------------------------------------

const quickActions = [
  {
    title: "Mint Tokens",
    description: "Issue new stablecoin tokens to recipients",
    path: "/mint-burn",
    icon: icons.mint,
    accentColor: "emerald",
  },
  {
    title: "Manage Compliance",
    description: "Configure blacklists and compliance rules",
    path: "/compliance",
    icon: icons.compliance,
    accentColor: "violet",
  },
  {
    title: "KYC Registry",
    description: "Approve or revoke KYC verifications",
    path: "/kyc",
    icon: icons.kyc,
    accentColor: "amber",
  },
  {
    title: "Assign Roles",
    description: "Grant minter, burner, and pauser roles",
    path: "/roles",
    icon: icons.roles,
    accentColor: "emerald",
  },
  {
    title: "FX Convert",
    description: "Convert between registered stablecoins",
    path: "/convert",
    icon: icons.convert,
    accentColor: "violet",
  },
  {
    title: "Travel Rule",
    description: "Attach FATF travel rule messages",
    path: "/travel-rule",
    icon: icons.travelRule,
    accentColor: "amber",
  },
] as const;

function QuickActionCard({
  title,
  description,
  path,
  icon,
  accentColor,
}: {
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  accentColor: string;
}) {
  const hoverColors: Record<string, string> = {
    emerald: "hover:border-emerald-500/40",
    violet: "hover:border-violet-500/40",
    amber: "hover:border-amber-500/40",
  };
  const iconBgColors: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20",
    violet: "bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20",
    amber: "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20",
  };

  return (
    <Link
      to={path}
      className={`group bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-5 transition-all duration-200 hover:bg-gray-900/70 ${hoverColors[accentColor]} block`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg transition-colors ${iconBgColors[accentColor]}`}>
          {icon}
        </div>
        <span className="text-gray-600 group-hover:text-gray-400 transition-colors group-hover:translate-x-1 transform duration-200">
          {icons.arrow}
        </span>
      </div>
      <h3 className="text-white font-semibold mt-4 mb-1">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { treasury, stablecoins, loading } = useViex();
  const { publicKey } = useWallet();

  // ---- No wallet ----
  if (!publicKey) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Connect your wallet to get started
          </h2>
          <p className="text-gray-400 leading-relaxed">
            VIEX Treasury provides institutional-grade stablecoin management with
            built-in compliance, KYC verification, and cross-border FX conversion
            on Solana.
          </p>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Token-2022
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              FATF Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Multi-currency
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---- Loading ----
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ---- No treasury ----
  if (!treasury) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center max-w-lg">
          <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Initialize a treasury to get started
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            No treasury account was found for your wallet. Create one to begin
            managing stablecoins with full compliance controls.
          </p>
          <Link
            to="/initialize"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
          >
            Initialize Treasury
            {icons.arrow}
          </Link>
        </div>
      </div>
    );
  }

  // ---- Compute stats ----
  const stablecoinList = Array.from(stablecoins.values());

  const totalCirculating = stablecoinList.reduce(
    (sum, sc) => sum.add(sc.totalMinted.sub(sc.totalBurned)),
    new BN(0)
  );

  const activeCurrencies = treasury.mints.length;

  // ---- Main dashboard ----
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {treasury.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Institutional Treasury Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* ---- Top Stats Row ---- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={icons.treasury}
          label="Total Treasury Value"
          value={formatAmount(totalCirculating)}
          accentColor="emerald"
        />
        <StatCard
          icon={icons.currencies}
          label="Active Currencies"
          value={activeCurrencies.toString()}
          accentColor="violet"
        />
        <StatCard
          icon={icons.kyc}
          label="KYC Status"
          value={treasury.kycRequired ? "Required" : "Not Required"}
          accentColor={treasury.kycRequired ? "emerald" : "amber"}
        />
        <StatCard
          icon={icons.threshold}
          label="Travel Rule Threshold"
          value={`${formatAmount(treasury.travelRuleThreshold)} ${treasury.baseCurrency}`}
          accentColor="rose"
        />
      </div>

      {/* ---- Treasury Info Card ---- */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
          Treasury Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
          {/* Name */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm text-white font-medium">{treasury.name}</span>
          </div>
          {/* Authority */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">Authority</span>
            <span className="flex items-center text-sm text-white font-mono">
              {truncateAddress(treasury.authority.toBase58(), 6)}
              <CopyButton text={treasury.authority.toBase58()} />
            </span>
          </div>
          {/* Base Currency */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">Base Currency</span>
            <span className="text-sm text-white font-medium">{treasury.baseCurrency}</span>
          </div>
          {/* Created */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">Created</span>
            <span className="text-sm text-white">
              {new Date(treasury.createdAt.toNumber() * 1000).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          {/* KYC Badge */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">KYC Enforcement</span>
            <span
              className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                treasury.kycRequired
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border-amber-500/30"
              }`}
            >
              {treasury.kycRequired ? "Enabled" : "Disabled"}
            </span>
          </div>
          {/* Mints registered */}
          <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
            <span className="text-sm text-gray-500">Registered Mints</span>
            <span className="text-sm text-white font-medium">{treasury.mints.length}</span>
          </div>
        </div>
      </div>

      {/* ---- Registered Currencies Table ---- */}
      {treasury.mints.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
            Registered Currencies
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800/50">
                  <th className="pb-3 pr-4 font-medium">Symbol</th>
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Mint</th>
                  <th className="pb-3 pr-4 font-medium text-right">Circulating</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total Minted</th>
                  <th className="pb-3 pr-4 font-medium text-right">Total Burned</th>
                  <th className="pb-3 pr-4 font-medium text-right">Supply Cap</th>
                  <th className="pb-3 pr-4 font-medium">Compliance</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/30">
                {treasury.mints.map((mint) => {
                  const sc = stablecoins.get(mint.toBase58());
                  if (!sc) return null;
                  const circulating = sc.totalMinted.sub(sc.totalBurned);
                  const level = deriveComplianceLevel(sc);

                  return (
                    <tr
                      key={mint.toBase58()}
                      className="text-sm hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="py-3.5 pr-4 font-semibold text-white">
                        {sc.symbol}
                      </td>
                      <td className="py-3.5 pr-4 text-gray-300">{sc.name}</td>
                      <td className="py-3.5 pr-4">
                        <span className="flex items-center font-mono text-xs text-gray-500">
                          {truncateAddress(mint.toBase58(), 4)}
                          <CopyButton text={mint.toBase58()} />
                        </span>
                      </td>
                      <td className="py-3.5 pr-4 text-right font-medium text-white tabular-nums">
                        {formatAmount(circulating)}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-gray-400 tabular-nums">
                        {formatAmount(sc.totalMinted)}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-gray-400 tabular-nums">
                        {formatAmount(sc.totalBurned)}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-gray-400 tabular-nums">
                        {sc.supplyCap.isZero() ? (
                          <span className="text-gray-600">Unlimited</span>
                        ) : (
                          formatAmount(sc.supplyCap)
                        )}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${complianceBadgeColors(level)}`}
                        >
                          {level}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {sc.paused ? (
                          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full border bg-rose-500/15 text-rose-400 border-rose-500/30">
                            Paused
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Quick Actions Grid (2x3) ---- */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <QuickActionCard key={action.path} {...action} />
          ))}
        </div>
      </div>

      {/* ---- Recent Activity (placeholder) ---- */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-gray-400">{icons.activity}</span>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Recent Events
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            Connect wallet and select a treasury to view recent activity
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Mint, burn, freeze, and compliance events will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
