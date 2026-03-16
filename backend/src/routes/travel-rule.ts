import { Router, Request, Response, NextFunction } from "express";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import * as crypto from "crypto";
import {
  program,
  operatorKeypair,
  findTreasuryPda,
  findTravelRuleMessagePda,
} from "../config";
import { createError } from "../middleware/error";

const router = Router();

function toPubkey(value: string, fieldName: string): PublicKey {
  try {
    return new PublicKey(value);
  } catch {
    throw createError(`Invalid ${fieldName} address`, 400);
  }
}

// ---------------------------------------------------------------------------
// POST /api/v1/travel-rule — attach travel rule data
// ---------------------------------------------------------------------------

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      sourceMint,
      originator,
      beneficiary,
      transferSignature,
      amount,
      originatorName,
      originatorVasp,
      beneficiaryName,
      beneficiaryVasp,
    } = req.body;

    if (
      !sourceMint ||
      !originator ||
      !beneficiary ||
      !transferSignature ||
      !amount ||
      !originatorName ||
      !originatorVasp ||
      !beneficiaryName ||
      !beneficiaryVasp
    ) {
      throw createError("All travel rule fields are required", 400);
    }

    const [treasuryPda] = findTreasuryPda(operatorKeypair.publicKey);
    const sourceMintPubkey = toPubkey(sourceMint, "sourceMint");
    const originatorPubkey = toPubkey(originator, "originator");
    const beneficiaryPubkey = toPubkey(beneficiary, "beneficiary");

    // Convert transfer signature to 64-byte array
    const sigBytes = Buffer.from(transferSignature, "base64");
    if (sigBytes.length !== 64) {
      throw createError("transferSignature must be 64 bytes (base64 encoded)", 400);
    }

    // Generate sig_hash (SHA-256 of the signature)
    const sigHash = crypto.createHash("sha256").update(sigBytes).digest();
    const sigHashArray = Array.from(sigHash);

    const [travelRuleMessage] = findTravelRuleMessagePda(treasuryPda, sigHash);

    const tx = await (program.methods as any)
      .attachTravelRule(
        Array.from(sigBytes),
        sigHashArray,
        new BN(amount.toString()),
        originatorName,
        originatorVasp,
        beneficiaryName,
        beneficiaryVasp
      )
      .accounts({
        authority: operatorKeypair.publicKey,
        treasury: treasuryPda,
        sourceMint: sourceMintPubkey,
        originator: originatorPubkey,
        beneficiary: beneficiaryPubkey,
        travelRuleMessage,
        systemProgram: SystemProgram.programId,
      })
      .signers([operatorKeypair])
      .rpc();

    res.json({
      success: true,
      data: {
        signature: tx,
        sigHash: sigHash.toString("hex"),
        travelRuleMessageAddress: travelRuleMessage.toBase58(),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/travel-rule/:sigHash — get travel rule message
// ---------------------------------------------------------------------------

router.get(
  "/:sigHash",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sigHash = req.params.sigHash as string;
      if (!sigHash) throw createError("sigHash parameter is required", 400);

      const sigHashBuffer = Buffer.from(sigHash, "hex");
      if (sigHashBuffer.length !== 32) {
        throw createError("sigHash must be 32 bytes (hex encoded)", 400);
      }

      const [treasuryPda] = findTreasuryPda(operatorKeypair.publicKey);
      const [travelRuleMessage] = findTravelRuleMessagePda(
        treasuryPda,
        sigHashBuffer
      );

      const account = await (program.account as any).travelRuleMessage.fetch(
        travelRuleMessage
      );

      res.json({
        success: true,
        data: {
          treasury: account.treasury.toBase58(),
          transferSignature: Buffer.from(
            account.transferSignature
          ).toString("base64"),
          sourceMint: account.sourceMint.toBase58(),
          amount: account.amount.toString(),
          originatorName: account.originatorName,
          originatorVasp: account.originatorVasp,
          originatorAccount: account.originatorAccount.toBase58(),
          beneficiaryName: account.beneficiaryName,
          beneficiaryVasp: account.beneficiaryVasp,
          beneficiaryAccount: account.beneficiaryAccount.toBase58(),
          createdAt: account.createdAt.toNumber(),
          createdBy: account.createdBy.toBase58(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
