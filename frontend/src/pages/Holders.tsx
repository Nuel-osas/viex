import { useState, useCallback } from "react";
import { useViex } from "../hooks/useViex";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

interface TokenHolder {
  address: string;
  owner: string;
  amount: string;
  state: string;
}

export default function Holders() {
  const { treasury, stablecoins } = useViex();
  const { connection } = useConnection();

  const [selectedMint, setSelectedMint] = useState("");
  const [holders, setHolders] = useState<TokenHolder[]>([]);
  const [loading, setLoading] = useState(false);

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const fetchHolders = useCallback(async () => {
    if (!selectedMint) return;
    setLoading(true);
    try {
      const mintPk = new PublicKey(selectedMint);
      const accounts = await connection.getParsedProgramAccounts(
        TOKEN_2022_PROGRAM_ID,
        {
          filters: [
            { dataSize: 182 },
            {
              memcmp: {
                offset: 0,
                bytes: mintPk.toBase58(),
              },
            },
          ],
        }
      );

      const parsed: TokenHolder[] = accounts.map((acc) => {
        const data = (acc.account.data as any)?.parsed?.info;
        return {
          address: acc.pubkey.toBase58(),
          owner: data?.owner || "Unknown",
          amount: data?.tokenAmount?.uiAmountString || data?.tokenAmount?.amount || "0",
          state: data?.state || "initialized",
        };
      });

      setHolders(parsed.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)));
    } catch (err) {
      console.error("Failed to fetch holders:", err);
      setHolders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedMint, connection]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Token Holders</h1>
        <p className="text-sm text-gray-400 mt-1">
          View all token accounts for a stablecoin
        </p>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1.5">
              Select Stablecoin
            </label>
            <select
              value={selectedMint}
              onChange={(e) => setSelectedMint(e.target.value)}
              className="w-full"
            >
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
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : "Fetch Holders"}
          </button>
        </div>
      </div>

      {holders.length > 0 && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {getSymbol(selectedMint)} Holders
            </h2>
            <span className="text-sm text-gray-500">
              {holders.length} account{holders.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-dark-700">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Owner</th>
                  <th className="pb-3 pr-4">Token Account</th>
                  <th className="pb-3 pr-4 text-right">Balance</th>
                  <th className="pb-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {holders.map((h, i) => (
                  <tr key={h.address} className="text-sm">
                    <td className="py-3 pr-4 text-gray-500">{i + 1}</td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-400 truncate max-w-[200px]">
                      {h.owner}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-500 truncate max-w-[200px]">
                      {h.address}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-white">
                      {h.amount}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                          h.state === "frozen"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                            : "bg-accent-500/15 text-accent-400 border-accent-500/30"
                        }`}
                      >
                        {h.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && holders.length === 0 && selectedMint && (
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-12 text-center">
          <p className="text-gray-500">
            No holders found. Click "Fetch Holders" to search.
          </p>
        </div>
      )}
    </div>
  );
}
