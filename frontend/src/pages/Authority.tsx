import { useState, useEffect } from "react";
import { useViex } from "../hooks/useViex";
import { useToast } from "../components/Toast";
import { parseError } from "../utils/errors";
import { PublicKey } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";

interface PendingNomination {
  mint: string;
  symbol: string;
  currentAuthority: string;
  stablecoinPda: string;
}

export default function Authority() {
  const { treasury, stablecoins, nominateAuthority, acceptAuthority, transferAuthority, program } = useViex();
  const { addToast } = useToast();
  const wallet = useWallet();
  const { connection } = useConnection();
  const [pendingNominations, setPendingNominations] = useState<PendingNomination[]>([]);
  const [scanLoading, setScanLoading] = useState(false);

  const [nomMint, setNomMint] = useState("");
  const [nomAddr, setNomAddr] = useState("");
  const [nomLoading, setNomLoading] = useState(false);

  const [acceptMint, setAcceptMint] = useState("");
  const [acceptLoading, setAcceptLoading] = useState(false);

  const [directMint, setDirectMint] = useState("");
  const [directAddr, setDirectAddr] = useState("");
  const [directLoading, setDirectLoading] = useState(false);
  const [confirmDirect, setConfirmDirect] = useState(false);

  // Scan all stablecoins from program for pending nominations to this wallet
  useEffect(() => {
    if (!program || !wallet.publicKey) return;
    const scan = async () => {
      setScanLoading(true);
      try {
        const allStablecoins = await (program.account as any).stablecoin.all();
        const pending: PendingNomination[] = [];
        for (const acc of allStablecoins) {
          const sc = acc.account;
          if (sc.pendingAuthority && sc.pendingAuthority.toBase58() === wallet.publicKey!.toBase58()) {
            pending.push({
              mint: sc.mint.toBase58(),
              symbol: sc.symbol || sc.name || sc.mint.toBase58().slice(0, 8),
              currentAuthority: sc.authority.toBase58(),
              stablecoinPda: acc.publicKey.toBase58(),
            });
          }
        }
        setPendingNominations(pending);
      } catch (err) {
        console.error("Failed to scan nominations:", err);
      } finally {
        setScanLoading(false);
      }
    };
    scan();
  }, [program, wallet.publicKey]);

  const handleAcceptPending = async (mint: string) => {
    setAcceptLoading(true);
    try {
      const tx = await acceptAuthority(new PublicKey(mint));
      addToast("success", "Authority Accepted", "You are now the authority", tx);
      // Remove from pending list
      setPendingNominations((prev) => prev.filter((p) => p.mint !== mint));
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAcceptLoading(false);
    }
  };

  const mintList = treasury?.mints || [];
  const getSymbol = (mint: string) => {
    const sc = stablecoins.get(mint);
    return sc ? sc.symbol : mint.slice(0, 8) + "...";
  };

  const handleNominate = async () => {
    setNomLoading(true);
    try {
      const tx = await nominateAuthority(new PublicKey(nomMint), new PublicKey(nomAddr));
      addToast("success", "Authority Nominated", `New authority nominated: ${nomAddr.slice(0, 12)}...`, tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setNomLoading(false);
    }
  };

  const handleAccept = async () => {
    setAcceptLoading(true);
    try {
      const tx = await acceptAuthority(new PublicKey(acceptMint));
      addToast("success", "Authority Accepted", "You are now the authority", tx);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleDirect = async () => {
    if (!confirmDirect) {
      setConfirmDirect(true);
      return;
    }
    setDirectLoading(true);
    try {
      const tx = await transferAuthority(new PublicKey(directMint), new PublicKey(directAddr));
      addToast("success", "Authority Transferred", `Authority transferred to ${directAddr.slice(0, 12)}...`, tx);
      setConfirmDirect(false);
    } catch (err) {
      addToast("error", "Failed", parseError(err));
    } finally {
      setDirectLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";
  const selectClass = "w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all outline-none";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Authority Transfer</h1>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            AUTHORITY
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          Transfer control of a stablecoin to a new authority
        </p>
      </div>

      {/* Pending Nominations for Connected Wallet */}
      {scanLoading && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 text-amber-400">
            <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            <span className="text-sm">Scanning for pending nominations to your wallet...</span>
          </div>
        </div>
      )}

      {pendingNominations.length > 0 && (
        <div className="bg-amber-500/5 backdrop-blur-sm border border-amber-500/30 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Pending Nominations for You</h2>
            <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {pendingNominations.length} PENDING
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-4 ml-4">
            You have been nominated as the new authority for the following stablecoins. Accept to take control.
          </p>
          <div className="space-y-3">
            {pendingNominations.map((nom) => (
              <div key={nom.mint} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-amber-500/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{nom.symbol}</span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      AWAITING ACCEPTANCE
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Mint: <span className="font-mono text-gray-400">{nom.mint.slice(0, 16)}...</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Current authority: <span className="font-mono text-gray-400">{nom.currentAuthority.slice(0, 16)}...</span>
                  </p>
                </div>
                <button
                  onClick={() => handleAcceptPending(nom.mint)}
                  disabled={acceptLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all disabled:opacity-40"
                >
                  {acceptLoading ? "Accepting..." : "Accept Authority"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-Step Flow Diagram */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Transfer Flow</h2>
        </div>

        <div className="flex items-center justify-center gap-4 py-6">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-lg mb-2">
              1
            </div>
            <p className="text-sm font-medium text-white">Nominate</p>
            <p className="text-xs text-gray-500 max-w-[120px] mt-1">Current authority nominates a successor</p>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0 -mt-8">
            <svg className="w-12 h-8 text-gray-600" fill="none" viewBox="0 0 48 32">
              <path d="M4 16h36m0 0l-8-8m8 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-blue-400 font-bold text-lg mb-2">
              2
            </div>
            <p className="text-sm font-medium text-white">Accept</p>
            <p className="text-xs text-gray-500 max-w-[120px] mt-1">Nominee accepts from their wallet</p>
          </div>
        </div>
      </div>

      {/* Current Authorities */}
      {treasury && treasury.mints.length > 0 && (
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Current Authorities</h2>
          </div>
          <div className="space-y-3">
            {treasury.mints.map((m) => {
              const sc = stablecoins.get(m.toBase58());
              if (!sc) return null;
              return (
                <div key={m.toBase58()} className="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 border border-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-emerald-400">{sc.symbol.slice(0, 2)}</span>
                    </div>
                    <span className="text-sm font-semibold text-white">{sc.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-gray-400">{sc.authority.toBase58()}</p>
                    {sc.pendingAuthority && (
                      <div className="flex items-center gap-1.5 mt-1 justify-end">
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          PENDING
                        </span>
                        <span className="text-xs font-mono text-amber-400">
                          {sc.pendingAuthority.toBase58().slice(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Nominate */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Step 1: Nominate New Authority</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          The nominee must call Accept Authority from their wallet to complete the transfer.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={nomMint} onChange={(e) => setNomMint(e.target.value)} className={selectClass}>
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">New Authority Address</label>
            <input type="text" value={nomAddr} onChange={(e) => setNomAddr(e.target.value)} placeholder="New authority address" className={`${inputClass} font-mono text-sm`} />
          </div>
        </div>
        <button
          onClick={handleNominate}
          disabled={!nomMint || !nomAddr || nomLoading}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {nomLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Nominating...
            </span>
          ) : (
            "Nominate Authority"
          )}
        </button>
      </div>

      {/* Accept */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-lg font-semibold text-white">Step 2: Accept Authority</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6 ml-4">
          Call this from the nominated wallet to complete the transfer.
        </p>
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Stablecoin Mint Address</label>
          <input type="text" value={acceptMint} onChange={(e) => setAcceptMint(e.target.value)} placeholder="Paste the mint address you were nominated for" className={`${inputClass} font-mono text-sm max-w-lg`} />
          {mintList.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Or select from your treasury: </span>
              {mintList.map((m) => (
                <button key={m.toBase58()} onClick={() => setAcceptMint(m.toBase58())} className="text-xs text-emerald-400 hover:text-emerald-300 mx-1">
                  {getSymbol(m.toBase58())}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={handleAccept}
          disabled={!acceptMint || acceptLoading}
          className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {acceptLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Accepting...
            </span>
          ) : (
            "Accept Authority"
          )}
        </button>
      </div>

      {/* Direct Transfer */}
      <div className="bg-gray-900/50 backdrop-blur-sm border border-rose-500/20 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
            <h2 className="text-lg font-semibold text-white">Direct Transfer</h2>
          </div>
          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
            IRREVERSIBLE
          </span>
        </div>

        <div className="mt-4 mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30">
          <div className="flex items-start gap-2 text-sm text-rose-400">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <p className="font-medium">This action is irreversible</p>
              <p className="text-xs text-rose-400/70 mt-1">
                Immediately transfers authority without the 2-step nomination process. You will lose all control over this stablecoin. Use the 2-step process above for a safer transfer.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Stablecoin</label>
            <select value={directMint} onChange={(e) => { setDirectMint(e.target.value); setConfirmDirect(false); }} className={selectClass}>
              <option value="">Select...</option>
              {mintList.map((m) => (
                <option key={m.toBase58()} value={m.toBase58()}>{getSymbol(m.toBase58())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">New Authority</label>
            <input type="text" value={directAddr} onChange={(e) => { setDirectAddr(e.target.value); setConfirmDirect(false); }} placeholder="New authority address" className={`${inputClass} font-mono text-sm`} />
          </div>
        </div>

        <button
          onClick={handleDirect}
          disabled={!directMint || !directAddr || directLoading}
          className={`mt-6 text-white font-medium px-6 py-3 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            confirmDirect
              ? "bg-rose-700 hover:bg-rose-600 animate-pulse"
              : "bg-rose-600 hover:bg-rose-500"
          }`}
        >
          {directLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Transferring...
            </span>
          ) : confirmDirect ? (
            "Click Again to Confirm Transfer"
          ) : (
            "Transfer Authority Now"
          )}
        </button>
        {confirmDirect && (
          <button onClick={() => setConfirmDirect(false)} className="mt-2 text-sm text-gray-400 hover:text-gray-300 transition-colors">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
