import { useMemo, useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN, Idl } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import idlJson from "../idl/viex_treasury.json";
import {
  VIEX_TREASURY_PROGRAM_ID,
  VIEX_TRANSFER_HOOK_PROGRAM_ID,
  findTreasuryPDA,
  findStablecoinPDA,
  findBlacklistPDA,
  findRolePDA,
  findMinterInfoPDA,
  findAllowlistPDA,
  findKycPDA,
  findTravelRulePDA,
  findFxPairPDA,
  findOracleConfigPDA,
} from "../utils/pda";

export interface TreasuryState {
  authority: PublicKey;
  name: string;
  mints: PublicKey[];
  baseCurrency: string;
  travelRuleThreshold: BN;
  kycRequired: boolean;
  createdAt: BN;
  bump: number;
}

export interface StablecoinState {
  authority: PublicKey;
  mint: PublicKey;
  treasury: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  paused: boolean;
  enablePermanentDelegate: boolean;
  enableTransferHook: boolean;
  enableAllowlist: boolean;
  totalMinted: BN;
  totalBurned: BN;
  supplyCap: BN;
  pendingAuthority: PublicKey | null;
  bump: number;
}

const ROLE_MAP: Record<string, any> = {
  minter: { minter: {} },
  burner: { burner: {} },
  blacklister: { blacklister: {} },
  pauser: { pauser: {} },
  seizer: { seizer: {} },
};

export function useViex() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [treasury, setTreasury] = useState<TreasuryState | null>(null);
  const [stablecoins, setStablecoins] = useState<
    Map<string, StablecoinState>
  >(new Map());
  const [loading, setLoading] = useState(false);

  const provider = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;
    return new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
  }, [connection, wallet]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(idlJson as Idl, provider);
  }, [provider]);

  const fetchTreasury = useCallback(async () => {
    if (!program || !wallet.publicKey) return null;
    try {
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const data = await (program.account as any).treasury.fetch(treasuryPda);
      setTreasury(data as TreasuryState);
      return data as TreasuryState;
    } catch {
      setTreasury(null);
      return null;
    }
  }, [program, wallet.publicKey]);

  const fetchStablecoin = useCallback(
    async (mint: PublicKey) => {
      if (!program) return null;
      try {
        const [stablecoinPda] = findStablecoinPDA(mint);
        const data = await (program.account as any).stablecoin.fetch(
          stablecoinPda
        );
        setStablecoins((prev) => {
          const next = new Map(prev);
          next.set(mint.toBase58(), data as StablecoinState);
          return next;
        });
        return data as StablecoinState;
      } catch {
        return null;
      }
    },
    [program]
  );

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const t = await fetchTreasury();
      if (t && t.mints) {
        for (const mint of t.mints) {
          await fetchStablecoin(mint);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [fetchTreasury, fetchStablecoin]);

  useEffect(() => {
    if (wallet.publicKey && program) {
      refreshAll();
    }
  }, [wallet.publicKey, program]);

  // ---- Instructions ----

  const initTreasury = useCallback(
    async (
      name: string,
      baseCurrency: string,
      travelRuleThreshold: number,
      kycRequired: boolean
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const tx = await program.methods
        .initTreasury(
          name,
          baseCurrency,
          new BN(travelRuleThreshold),
          kycRequired
        )
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  const initStablecoin = useCallback(
    async (
      name: string,
      symbol: string,
      uri: string,
      decimals: number,
      config: {
        enablePermanentDelegate: boolean;
        enableTransferHook: boolean;
        enableAllowlist: boolean;
        enableDefaultAccountState: boolean;
        enableConfidentialTransfer: boolean;
      }
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const mintKeypair = Keypair.generate();
      const [stablecoinPda] = findStablecoinPDA(mintKeypair.publicKey);

      const accounts: any = {
        authority: wallet.publicKey,
        treasury: treasuryPda,
        mint: mintKeypair.publicKey,
        stablecoin: stablecoinPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      };
      if (config.enableTransferHook) {
        accounts.transferHookProgram = VIEX_TRANSFER_HOOK_PROGRAM_ID;
      }

      const tx = await program.methods
        .initialize(name, symbol, uri, decimals, config)
        .accounts(accounts)
        .signers([mintKeypair])
        .rpc();
      await refreshAll();
      return { tx, mint: mintKeypair.publicKey };
    },
    [program, wallet.publicKey, refreshAll]
  );

  const registerMint = useCallback(
    async (mintPubkey: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const tx = await program.methods
        .registerMint()
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          stablecoin: stablecoinPda,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  const mintTokens = useCallback(
    async (mintPubkey: PublicKey, amount: number, recipient: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      // Auto-create recipient ATA if it doesn't exist
      const recipientAta = await ensureAta(mintPubkey, recipient);

      // If caller is the authority, skip role/minterInfo (they don't need them)
      const rolePda = await getRoleOrNull(mintPubkey, "minter");
      let minterInfo: PublicKey | null = null;
      if (rolePda) {
        [minterInfo] = findMinterInfoPDA(stablecoinPda, wallet.publicKey);
      }

      const tx = await program.methods
        .mintTokens(new BN(amount))
        .accounts({
          minter: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          roleAssignment: rolePda,
          minterInfo,
          recipientTokenAccount: recipientAta,
          oracleConfig: null,
          priceFeed: null,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, stablecoins, refreshAll]
  );

  const burnTokens = useCallback(
    async (mintPubkey: PublicKey, amount: number) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const burnerAta = getAssociatedTokenAddressSync(
        mintPubkey,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      const rolePda = await getRoleOrNull(mintPubkey, "burner");

      const tx = await program.methods
        .burnTokens(new BN(amount))
        .accounts({
          burner: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          roleAssignment: rolePda,
          burnerTokenAccount: burnerAta,
          oracleConfig: null,
          priceFeed: null,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  // Helper: ensure ATA exists, create if needed
  const ensureAta = async (mint: PublicKey, owner: PublicKey): Promise<PublicKey> => {
    const ata = getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
    const info = await connection.getAccountInfo(ata);
    if (!info) {
      const ix = createAssociatedTokenAccountInstruction(
        wallet.publicKey!,
        ata,
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
      const tx = new Transaction().add(ix);
      await provider!.sendAndConfirm(tx);
    }
    return ata;
  };

  // Helper: returns role PDA or null if caller is the stablecoin authority.
  // Checks local cache first, then fetches on-chain if needed.
  const getRoleOrNull = async (mintPubkey: PublicKey, role: string): Promise<PublicKey | null> => {
    if (!wallet.publicKey || !program) return null;
    // Check local cache
    let authority = stablecoins.get(mintPubkey.toBase58())?.authority;
    // If not cached, fetch on-chain
    if (!authority) {
      try {
        const [stablecoinPda] = findStablecoinPDA(mintPubkey);
        const data = await program.account.stablecoin.fetch(stablecoinPda);
        authority = data.authority;
      } catch { /* ignore */ }
    }
    if (authority?.toBase58() === wallet.publicKey.toBase58()) return null;
    const [stablecoinPda] = findStablecoinPDA(mintPubkey);
    const [rolePda] = findRolePDA(stablecoinPda, role, wallet.publicKey);
    return rolePda;
  };

  const addToBlacklist = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey, reason: string) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [blacklistPda] = findBlacklistPDA(stablecoinPda, target);

      const tx = await program.methods
        .addToBlacklist(reason)
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          target,
          blacklistEntry: blacklistPda,
          roleAssignment: await getRoleOrNull(mintPubkey, "blacklister"),
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const removeFromBlacklist = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [blacklistPda] = findBlacklistPDA(stablecoinPda, target);

      const tx = await program.methods
        .removeFromBlacklist()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          blacklistEntry: blacklistPda,
          roleAssignment: await getRoleOrNull(mintPubkey, "blacklister"),
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const closeBlacklistEntry = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [blacklistPda] = findBlacklistPDA(stablecoinPda, target);

      const tx = await program.methods
        .closeBlacklistEntry()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          blacklistEntry: blacklistPda,
          roleAssignment: await getRoleOrNull(mintPubkey, "blacklister"),
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const seize = useCallback(
    async (
      mintPubkey: PublicKey,
      sourceOwner: PublicKey,
      treasuryOwner: PublicKey
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const sourceAta = getAssociatedTokenAddressSync(
        mintPubkey,
        sourceOwner,
        true,
        TOKEN_2022_PROGRAM_ID
      );
      const treasuryAta = await ensureAta(mintPubkey, treasuryOwner);
      const [blacklistPda] = findBlacklistPDA(stablecoinPda, sourceOwner);

      const tx = await program.methods
        .seize()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          sourceTokenAccount: sourceAta,
          treasuryTokenAccount: treasuryAta,
          blacklistEntry: blacklistPda,
          roleAssignment: await getRoleOrNull(mintPubkey, "seizer"),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const kycApprove = useCallback(
    async (
      target: PublicKey,
      kycLevel: number,
      jurisdiction: number[],
      provider_: string,
      expiresAt: number
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [kycPda] = findKycPDA(treasuryPda, target);

      const tx = await program.methods
        .kycApprove(kycLevel, jurisdiction, provider_, new BN(expiresAt))
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          target,
          kycEntry: kycPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const kycRevoke = useCallback(
    async (target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [kycPda] = findKycPDA(treasuryPda, target);

      const tx = await program.methods
        .kycRevoke()
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          kycEntry: kycPda,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const kycClose = useCallback(
    async (target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [kycPda] = findKycPDA(treasuryPda, target);

      const tx = await program.methods
        .kycClose()
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          kycEntry: kycPda,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const fetchKycEntry = useCallback(
    async (target: PublicKey) => {
      if (!program || !wallet.publicKey) return null;
      try {
        const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
        const [kycPda] = findKycPDA(treasuryPda, target);
        return await (program.account as any).kycEntry.fetch(kycPda);
      } catch {
        return null;
      }
    },
    [program, wallet.publicKey]
  );

  const attachTravelRule = useCallback(
    async (
      sourceMint: PublicKey,
      originator: PublicKey,
      beneficiary: PublicKey,
      transferSignature: number[],
      sigHash: number[],
      amount: number,
      originatorName: string,
      originatorVasp: string,
      beneficiaryName: string,
      beneficiaryVasp: string
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [travelRulePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("travel_rule"),
          treasuryPda.toBuffer(),
          Buffer.from(sigHash),
        ],
        VIEX_TREASURY_PROGRAM_ID
      );

      const tx = await program.methods
        .attachTravelRule(
          transferSignature,
          sigHash,
          new BN(amount),
          originatorName,
          originatorVasp,
          beneficiaryName,
          beneficiaryVasp
        )
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          sourceMint,
          originator,
          beneficiary,
          travelRuleMessage: travelRulePda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const closeTravelRule = useCallback(
    async (travelRuleMessage: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);

      const tx = await program.methods
        .closeTravelRule()
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          travelRuleMessage,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const assignRole = useCallback(
    async (mintPubkey: PublicKey, assignee: PublicKey, role: string) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const roleEnum = ROLE_MAP[role];
      if (!roleEnum) throw new Error(`Unknown role: ${role}`);

      const [rolePda] = findRolePDA(stablecoinPda, role, assignee);
      const accounts: any = {
        authority: wallet.publicKey,
        stablecoin: stablecoinPda,
        assignee,
        roleAssignment: rolePda,
        systemProgram: SystemProgram.programId,
      };

      if (role === "minter") {
        const [minterInfoPda] = findMinterInfoPDA(stablecoinPda, assignee);
        accounts.minterInfo = minterInfoPda;
      } else {
        accounts.minterInfo = null;
      }

      const tx = await program.methods
        .assignRole(roleEnum)
        .accounts(accounts)
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const revokeRole = useCallback(
    async (mintPubkey: PublicKey, assignee: PublicKey, role: string) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [rolePda] = findRolePDA(stablecoinPda, role, assignee);

      const tx = await program.methods
        .revokeRole()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          roleAssignment: rolePda,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const closeRole = useCallback(
    async (mintPubkey: PublicKey, roleAssignment: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .closeRole()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          roleAssignment,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const nominateAuthority = useCallback(
    async (mintPubkey: PublicKey, newAuthority: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .nominateAuthority(newAuthority)
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const acceptAuthority = useCallback(
    async (mintPubkey: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .acceptAuthority()
        .accounts({
          newAuthority: wallet.publicKey,
          stablecoin: stablecoinPda,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  const transferAuthority = useCallback(
    async (mintPubkey: PublicKey, newAuthority: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .transferAuthority(newAuthority)
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  const freezeAccount = useCallback(
    async (mintPubkey: PublicKey, tokenAccount: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .freezeAccount()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          tokenAccount,
          roleAssignment: await getRoleOrNull(mintPubkey, "pauser"),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const thawAccount = useCallback(
    async (mintPubkey: PublicKey, tokenAccount: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .thawAccount()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          tokenAccount,
          roleAssignment: await getRoleOrNull(mintPubkey, "pauser"),
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey, stablecoins]
  );

  const pause = useCallback(
    async (mintPubkey: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .pause()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          roleAssignment: await getRoleOrNull(mintPubkey, "pauser"),
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, stablecoins, refreshAll]
  );

  const unpause = useCallback(
    async (mintPubkey: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);

      const tx = await program.methods
        .unpause()
        .accounts({
          authority: wallet.publicKey,
          stablecoin: stablecoinPda,
          mint: mintPubkey,
          roleAssignment: await getRoleOrNull(mintPubkey, "pauser"),
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, stablecoins, refreshAll]
  );

  const configureFxPair = useCallback(
    async (
      sourceMint: PublicKey,
      destMint: PublicKey,
      priceFeed: PublicKey,
      maxStalenessSecs: number,
      maxSlippageBps: number,
      enabled: boolean
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [fxPairPda] = findFxPairPDA(treasuryPda, sourceMint, destMint);

      const tx = await program.methods
        .configureFxPair(
          priceFeed,
          new BN(maxStalenessSecs),
          maxSlippageBps,
          enabled
        )
        .accounts({
          authority: wallet.publicKey,
          treasury: treasuryPda,
          sourceMint,
          destMint,
          fxPairConfig: fxPairPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const convert = useCallback(
    async (
      sourceMint: PublicKey,
      destMint: PublicKey,
      sourceAmount: number,
      minDestAmount: number,
      priceFeedPubkey: PublicKey
    ) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");

      // Look up treasury authority from stablecoin data (converter may not be authority)
      const [sourceStablecoinPda] = findStablecoinPDA(sourceMint);
      let treasuryAuthority = wallet.publicKey;
      const sourceData = stablecoins.get(sourceMint.toBase58());
      if (sourceData?.authority) {
        treasuryAuthority = sourceData.authority;
      } else {
        try {
          const fetched = await program.account.stablecoin.fetch(sourceStablecoinPda);
          treasuryAuthority = fetched.authority;
        } catch { /* fallback to wallet */ }
      }

      const [treasuryPda] = findTreasuryPDA(treasuryAuthority);
      const [fxPairPda] = findFxPairPDA(treasuryPda, sourceMint, destMint);

      const converterSourceAta = getAssociatedTokenAddressSync(
        sourceMint,
        wallet.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );
      const converterDestAta = await ensureAta(destMint, wallet.publicKey);

      const [destStablecoinPda] = findStablecoinPDA(destMint);

      const tx = await program.methods
        .convert(new BN(sourceAmount), new BN(minDestAmount))
        .accounts({
          converter: wallet.publicKey,
          treasury: treasuryPda,
          sourceStablecoin: sourceStablecoinPda,
          destStablecoin: destStablecoinPda,
          sourceMint,
          destMint,
          converterSourceAccount: converterSourceAta,
          converterDestAccount: converterDestAta,
          fxPairConfig: fxPairPda,
          priceFeed: priceFeedPubkey,
          sourceTokenProgram: TOKEN_2022_PROGRAM_ID,
          destTokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  // ── Missing functions added ──

  const setSupplyCap = useCallback(
    async (mintPubkey: PublicKey, cap: number) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const tx = await program.methods
        .setSupplyCap(new BN(cap))
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda })
        .rpc();
      await refreshAll();
      return tx;
    },
    [program, wallet.publicKey, refreshAll]
  );

  const updateMinterQuota = useCallback(
    async (mintPubkey: PublicKey, minter: PublicKey, quota: number) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [minterInfoPda] = findMinterInfoPDA(stablecoinPda, minter);
      const tx = await program.methods
        .updateMinterQuota(new BN(quota))
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda, minterInfo: minterInfoPda })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const updateMetadata = useCallback(
    async (mintPubkey: PublicKey, uri: string) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const tx = await program.methods
        .updateMetadata(uri)
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda, mint: mintPubkey, tokenProgram: TOKEN_2022_PROGRAM_ID })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const configureOracle = useCallback(
    async (mintPubkey: PublicKey, priceFeed: PublicKey, maxDeviationBps: number, maxStalenessSecs: number, enabled: boolean) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [oracleConfigPda] = findOracleConfigPDA(stablecoinPda);
      const tx = await program.methods
        .configureOracle(priceFeed, maxDeviationBps, new BN(maxStalenessSecs), enabled)
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda, oracleConfig: oracleConfigPda, systemProgram: SystemProgram.programId })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const addToAllowlist = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [allowlistPda] = findAllowlistPDA(stablecoinPda, target);
      const tx = await program.methods
        .addToAllowlist()
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda, target, allowlistEntry: allowlistPda, systemProgram: SystemProgram.programId })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const removeFromAllowlist = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [stablecoinPda] = findStablecoinPDA(mintPubkey);
      const [allowlistPda] = findAllowlistPDA(stablecoinPda, target);
      const tx = await program.methods
        .removeFromAllowlist()
        .accounts({ authority: wallet.publicKey, stablecoin: stablecoinPda, allowlistEntry: allowlistPda })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const removeFxPair = useCallback(
    async (sourceMint: PublicKey, destMint: PublicKey) => {
      if (!program || !wallet.publicKey) throw new Error("Wallet not connected");
      const [treasuryPda] = findTreasuryPDA(wallet.publicKey);
      const [fxPairPda] = findFxPairPDA(treasuryPda, sourceMint, destMint);
      const tx = await program.methods
        .removeFxPair()
        .accounts({ authority: wallet.publicKey, treasury: treasuryPda, fxPairConfig: fxPairPda })
        .rpc();
      return tx;
    },
    [program, wallet.publicKey]
  );

  const isBlacklisted = useCallback(
    async (mintPubkey: PublicKey, target: PublicKey): Promise<boolean> => {
      if (!program) return false;
      try {
        const [stablecoinPda] = findStablecoinPDA(mintPubkey);
        const [blacklistPda] = findBlacklistPDA(stablecoinPda, target);
        const entry = await program.account.blacklistEntry.fetch(blacklistPda);
        return entry.active;
      } catch {
        return false;
      }
    },
    [program]
  );

  const transferTokens = useCallback(
    async (mintPubkey: PublicKey, to: PublicKey, amount: number) => {
      if (!program || !wallet.publicKey || !provider) throw new Error("Wallet not connected");
      const { createTransferCheckedWithTransferHookInstruction } = await import("@solana/spl-token");

      const senderAta = getAssociatedTokenAddressSync(mintPubkey, wallet.publicKey, false, TOKEN_2022_PROGRAM_ID);
      const destAta = await ensureAta(mintPubkey, to);

      const stablecoinData = stablecoins.get(mintPubkey.toBase58());
      const decimals = stablecoinData?.decimals || 6;

      // Build transfer instruction with hook account resolution
      const ix = await createTransferCheckedWithTransferHookInstruction(
        connection,
        senderAta,
        mintPubkey,
        destAta,
        wallet.publicKey,
        BigInt(amount),
        decimals,
        [],
        "confirmed",
        TOKEN_2022_PROGRAM_ID,
      );

      const tx = new Transaction().add(ix);
      const sig = await provider.sendAndConfirm(tx);
      await refreshAll();
      return sig;
    },
    [program, wallet.publicKey, provider, connection, stablecoins, refreshAll]
  );

  return {
    program,
    provider,
    treasury,
    stablecoins,
    loading,
    refreshAll,
    fetchTreasury,
    fetchStablecoin,
    fetchKycEntry,
    initTreasury,
    initStablecoin,
    registerMint,
    mintTokens,
    burnTokens,
    addToBlacklist,
    removeFromBlacklist,
    closeBlacklistEntry,
    seize,
    isBlacklisted,
    kycApprove,
    kycRevoke,
    kycClose,
    attachTravelRule,
    closeTravelRule,
    assignRole,
    revokeRole,
    closeRole,
    nominateAuthority,
    acceptAuthority,
    transferAuthority,
    freezeAccount,
    thawAccount,
    pause,
    unpause,
    configureFxPair,
    convert,
    setSupplyCap,
    updateMinterQuota,
    updateMetadata,
    configureOracle,
    addToAllowlist,
    removeFromAllowlist,
    removeFxPair,
    transferTokens,
  };
}
