import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { findTravelRulePDA } from "./pda";
import type {
  TravelRuleMessageAccount,
  TravelRuleOriginator,
  TravelRuleBeneficiary,
} from "./types";

/**
 * TravelRuleModule handles attaching and querying FATF Travel Rule
 * compliance messages for transfers within a VIEX Treasury.
 */
export class TravelRuleModule {
  constructor(
    private readonly program: Program<any>,
    private readonly authority: PublicKey,
    private readonly treasuryAddress: PublicKey
  ) {}

  /**
   * Attach a travel rule message to a transfer.
   *
   * @param transferSig   - 64-byte transfer signature (as Uint8Array or number[]).
   * @param mint          - The stablecoin mint involved in the transfer.
   * @param amount        - Transfer amount.
   * @param originator    - Originator info ({ name, vasp }).
   * @param beneficiary   - Beneficiary info ({ name, vasp }).
   */
  async attach(
    transferSig: Uint8Array | number[],
    mint: PublicKey,
    amount: BN | number,
    originator: TravelRuleOriginator,
    beneficiary: TravelRuleBeneficiary
  ): Promise<string> {
    const sigArray = Array.from(transferSig);
    if (sigArray.length !== 64) {
      throw new Error(
        `Transfer signature must be exactly 64 bytes, got ${sigArray.length}`
      );
    }

    const [travelRuleMessage] = findTravelRulePDA(
      this.treasuryAddress,
      sigArray,
      this.program.programId
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;

    return this.program.methods
      .attachTravelRule(
        sigArray,
        amountBn,
        originator.name,
        originator.vasp,
        beneficiary.name,
        beneficiary.vasp
      )
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        sourceMint: mint,
        originator: this.authority, // originator account key
        beneficiary: this.authority, // beneficiary account key — caller may override
        travelRuleMessage,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Attach a travel rule message with explicit originator and beneficiary accounts.
   */
  async attachFull(
    transferSig: Uint8Array | number[],
    mint: PublicKey,
    amount: BN | number,
    originatorAccount: PublicKey,
    beneficiaryAccount: PublicKey,
    originator: TravelRuleOriginator,
    beneficiary: TravelRuleBeneficiary
  ): Promise<string> {
    const sigArray = Array.from(transferSig);
    if (sigArray.length !== 64) {
      throw new Error(
        `Transfer signature must be exactly 64 bytes, got ${sigArray.length}`
      );
    }

    const [travelRuleMessage] = findTravelRulePDA(
      this.treasuryAddress,
      sigArray,
      this.program.programId
    );

    const amountBn = typeof amount === "number" ? new BN(amount) : amount;

    return this.program.methods
      .attachTravelRule(
        sigArray,
        amountBn,
        originator.name,
        originator.vasp,
        beneficiary.name,
        beneficiary.vasp
      )
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        sourceMint: mint,
        originator: originatorAccount,
        beneficiary: beneficiaryAccount,
        travelRuleMessage,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Close a travel rule message account to reclaim rent.
   */
  async close(transferSig: Uint8Array | number[]): Promise<string> {
    const sigArray = Array.from(transferSig);
    const [travelRuleMessage] = findTravelRulePDA(
      this.treasuryAddress,
      sigArray,
      this.program.programId
    );

    return this.program.methods
      .closeTravelRule()
      .accountsPartial({
        authority: this.authority,
        treasury: this.treasuryAddress,
        travelRuleMessage,
      })
      .rpc();
  }

  /**
   * Fetch a travel rule message. Returns null if not found.
   */
  async getMessage(
    transferSig: Uint8Array | number[]
  ): Promise<TravelRuleMessageAccount | null> {
    const sigArray = Array.from(transferSig);
    const [travelRuleMessage] = findTravelRulePDA(
      this.treasuryAddress,
      sigArray,
      this.program.programId
    );
    try {
      return (await this.program.account.travelRuleMessage.fetch(
        travelRuleMessage
      )) as unknown as TravelRuleMessageAccount;
    } catch {
      return null;
    }
  }
}
