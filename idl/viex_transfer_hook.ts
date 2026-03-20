/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/viex_transfer_hook.json`.
 */
export type ViexTransferHook = {
  "address": "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY",
  "metadata": {
    "name": "viexTransferHook",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "VIEX Transfer Hook: Enforces blacklist and KYC checks on every Token-2022 transfer"
  },
  "instructions": [
    {
      "name": "execute",
      "docs": [
        "Called by Token-2022 on every transfer.",
        "Enforces blacklist (AML) and KYC checks."
      ],
      "discriminator": [
        130,
        221,
        242,
        154,
        13,
        193,
        189,
        29
      ],
      "accounts": [
        {
          "name": "sourceAccount"
        },
        {
          "name": "mint"
        },
        {
          "name": "destinationAccount"
        },
        {
          "name": "authority"
        },
        {
          "name": "stablecoin"
        },
        {
          "name": "sourceBlacklist",
          "optional": true
        },
        {
          "name": "destinationBlacklist",
          "optional": true
        },
        {
          "name": "sourceKyc",
          "optional": true
        },
        {
          "name": "destKyc",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initializeExtraAccountMetaList",
      "docs": [
        "Initialize extra account metas for blacklist + KYC PDA resolution.",
        "Layout:",
        "0: source, 1: mint, 2: dest, 3: authority, 4: extraAccountMetaList",
        "5: extra[0] = viex-treasury program ID",
        "6: extra[1] = stablecoin PDA",
        "7: extra[2] = source blacklist PDA",
        "8: extra[3] = dest blacklist PDA",
        "9: extra[4] = source KYC PDA (seeded by [kyc, treasury, source_owner])",
        "10: extra[5] = dest KYC PDA (seeded by [kyc, treasury, dest_owner])"
      ],
      "discriminator": [
        92,
        197,
        174,
        197,
        41,
        124,
        19,
        3
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "extraAccountMetaList",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "senderBlacklisted",
      "msg": "Sender is blacklisted"
    },
    {
      "code": 6001,
      "name": "recipientBlacklisted",
      "msg": "Recipient is blacklisted"
    },
    {
      "code": 6002,
      "name": "senderKycNotApproved",
      "msg": "Sender KYC not approved or expired"
    },
    {
      "code": 6003,
      "name": "recipientKycNotApproved",
      "msg": "Recipient KYC not approved or expired"
    }
  ]
};
