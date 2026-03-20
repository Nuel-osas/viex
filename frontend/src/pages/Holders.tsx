import { useState, useCallback } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

interface TokenHolder {
  address: string;
  owner: string;
  amount: string;
  rawAmount: number;
  state: string;
}

export default function Holders() {
  const { treasury, stablecoins } = useViex();
  const { addToast } = useToast();
  const { connection } = useConnection();

  const [selectedMint, setSelectedMint] = useState("");
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const totalSupply = holders.reduce((sum, h) => sum + h.rawAmount, 0);

  const fetchHolders = useCallback(async () => {
    if (!selectedMint) return;
    setLoading(true);
    try {
      const mintPk = new PublicKey(selectedMint);

      // Use getTokenLargestAccounts for reliable Token-2022 support,
      // then fetch each account's parsed data for owner + state info.
      const largest = await connection.getTokenLargestAccounts(mintPk);

      const parsed: TokenHolder[] = [];
      // Fetch parsed info for each account
      const accountInfos = await Promise.all(
        largest.value.map((acc) =>
          connection.getParsedAccountInfo(acc.address)
        )
      );

      for (let i = 0; i < largest.value.length; i++) {
        const entry = largest.value[i];
        const info = accountInfos[i];
        const data = (info.value?.data as any)?.parsed?.info;

        const uiAmt = entry.uiAmountString || entry.amount || "0";
        const rawAmt = parseFloat(entry.amount || "0");
        const owner = data?.owner || "Unknown";
        const state = data?.state || "initialized";

        // Skip zero-balance accounts
        if (rawAmt === 0) continue;

        parsed.push({
          address: entry.address.toBase58(),
          owner,
          amount: uiAmt,
          rawAmount: rawAmt,
          state,
        });
      }

      setHolders(parsed.sort((a, b) => b.rawAmount - a.rawAmount));
      if (parsed.length === 0) {
        addToast("info", "No Holders", "No token accounts found for this mint");
      }
    } catch (err) {
      addToast("error", "Fetch Failed", parseError(err));
      setHolders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMint, connection]);

  const sortedHolders = [...holders].sort((a, b) =>
    sortAsc ? a.rawAmount - b.rawAmount : b.rawAmount - a.rawAmount
  );

  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Token Holders</h1>
        <p className="text-sm text-gray-400 mt-1">
          View all token accounts and balances for a stablecoin
        </p>
      </div>

      {/* Mint Selector */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex gap-4 items-end flex-col sm:flex-row">
          <div className="flex-1 w-full">
            <label className="block text-sm text-gray-400 mb-1.5">Select Stablecoin</label>
            <select value={selectedMint} onChange={(e) => setSelectedMint(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>
                  {getSymbol(m.toBase58())} ({m.toBase58().slice(0, 12)}...)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchHolders}
            disabled={!selectedMint || loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </span>
            ) : (
              "Fetch Holders"
            )}
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-gray-800/30">
                <div className="w-8 h-4 bg-gray-700/50 rounded animate-pulse" />
                <div className="flex-1 h-4 bg-gray-700/50 rounded animate-pulse" />
                <div className="w-32 h-4 bg-gray-700/50 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-700/50 rounded animate-pulse" />
                <div className="w-16 h-6 bg-gray-700/50 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Holders Table */}
      {!loading && holders.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-lg font-semibold text-white">{getSymbol(selectedMint)} Holders</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                {holders.length} account{holders.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Owner</th>
                  <th className="pb-3 pr-4">Token Account</th>
                  <th
                    className="pb-3 pr-4 text-right cursor-pointer hover:text-gray-300 transition-colors"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    Balance {sortAsc ? "^" : "v"}
                  </th>
                  <th className="pb-3 pr-4 text-right">% Supply</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {sortedHolders.map((h, i) => (
                  <tr key={h.address} className="text-sm hover:bg-gray-800/20 transition-colors">
                    <td className="py-3 pr-4 text-gray-500 text-xs">{i + 1}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400 truncate max-w-[200px]">
                      {h.owner}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500 truncate max-w-[200px]">
                      {h.address}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-white tabular-nums">
                      {h.amount}
                    </td>
                    <td className="py-3 pr-4 text-right text-xs text-gray-400">
                      {totalSupply > 0 ? ((h.rawAmount / totalSupply) * 100).toFixed(2) : "0.00"}%
                    </td>
                    <td className="py-3">
                      {h.state === "frozen" ? (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Frozen
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && holders.length === 0 && selectedMint && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-500">No holders found. Click "Fetch Holders" to search.</p>
        </div>
      )}
    </div>
  );
}
