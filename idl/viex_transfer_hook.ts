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
        "Enforces blacklist and allowlist (KYC gate) checks."
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
          "name": "sourceAllowlist",
          "optional": true
        },
        {
          "name": "destinationAllowlist",
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
        "Initialize extra account metas for blacklist + allowlist PDA resolution"
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
      "name": "senderNotAllowlisted",
      "msg": "Sender is not on the allowlist (KYC required)"
    },
    {
      "code": 6003,
      "name": "recipientNotAllowlisted",
      "msg": "Recipient is not on the allowlist (KYC required)"
    }
  ]
};
