/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/viex_treasury.json`.
 */
export type ViexTreasury = {
  "address": "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU",
  "metadata": {
    "name": "viexTreasury",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "VIEX Treasury: Cross-border multi-currency stablecoin treasury with KYC, AML, Travel Rule, and FX conversion"
  },
  "instructions": [
    {
      "name": "acceptAuthority",
      "discriminator": [
        107,
        86,
        198,
        91,
        33,
        12,
        107,
        160
      ],
      "accounts": [
        {
          "name": "newAuthority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "addToAllowlist",
      "discriminator": [
        149,
        143,
        78,
        134,
        241,
        244,
        7,
        56
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "target"
        },
        {
          "name": "allowlistEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  108,
                  108,
                  111,
                  119,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "target"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "addToBlacklist",
      "discriminator": [
        90,
        115,
        98,
        231,
        173,
        119,
        117,
        176
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "target"
        },
        {
          "name": "blacklistEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  97,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "target"
              }
            ]
          }
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  97,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "reason",
          "type": "string"
        }
      ]
    },
    {
      "name": "assignRole",
      "discriminator": [
        255,
        174,
        125,
        180,
        203,
        155,
        202,
        131
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "assignee"
        },
        {
          "name": "roleAssignment",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "arg",
                "path": "role"
              },
              {
                "kind": "account",
                "path": "assignee"
              }
            ]
          }
        },
        {
          "name": "minterInfo",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  105,
                  110,
                  102,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "assignee"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "role",
          "type": {
            "defined": {
              "name": "role"
            }
          }
        }
      ]
    },
    {
      "name": "attachTravelRule",
      "discriminator": [
        13,
        194,
        147,
        119,
        175,
        51,
        221,
        220
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "treasury.authority",
                "account": "treasury"
              }
            ]
          }
        },
        {
          "name": "sourceMint"
        },
        {
          "name": "originator"
        },
        {
          "name": "beneficiary"
        },
        {
          "name": "travelRuleMessage",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  118,
                  101,
                  108,
                  95,
                  114,
                  117,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "arg",
                "path": "sigHash"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "transferSignature",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "sigHash",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "originatorName",
          "type": "string"
        },
        {
          "name": "originatorVasp",
          "type": "string"
        },
        {
          "name": "beneficiaryName",
          "type": "string"
        },
        {
          "name": "beneficiaryVasp",
          "type": "string"
        }
      ]
    },
    {
      "name": "burnTokens",
      "discriminator": [
        76,
        15,
        51,
        254,
        229,
        215,
        121,
        66
      ],
      "accounts": [
        {
          "name": "burner",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  114,
                  110,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "burner"
              }
            ]
          }
        },
        {
          "name": "burnerTokenAccount",
          "writable": true
        },
        {
          "name": "oracleConfig",
          "optional": true
        },
        {
          "name": "priceFeed",
          "optional": true
        },
        {
          "name": "tokenProgram"
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
      "name": "closeBlacklistEntry",
      "discriminator": [
        72,
        4,
        209,
        30,
        100,
        165,
        217,
        216
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "blacklistEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  97,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "blacklist_entry.address",
                "account": "blacklistEntry"
              }
            ]
          }
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  97,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "closeRole",
      "discriminator": [
        139,
        108,
        157,
        18,
        175,
        150,
        155,
        26
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          },
          "relations": [
            "roleAssignment"
          ]
        },
        {
          "name": "roleAssignment",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "closeTravelRule",
      "discriminator": [
        79,
        211,
        206,
        241,
        63,
        37,
        73,
        211
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "treasury.authority",
                "account": "treasury"
              }
            ]
          },
          "relations": [
            "travelRuleMessage"
          ]
        },
        {
          "name": "travelRuleMessage",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "configureFxPair",
      "discriminator": [
        188,
        130,
        123,
        21,
        191,
        141,
        152,
        78
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "sourceMint"
        },
        {
          "name": "destMint"
        },
        {
          "name": "fxPairConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  120,
                  95,
                  112,
                  97,
                  105,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "sourceMint"
              },
              {
                "kind": "account",
                "path": "destMint"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "priceFeed",
          "type": "pubkey"
        },
        {
          "name": "maxStalenessSecs",
          "type": "u64"
        },
        {
          "name": "maxSlippageBps",
          "type": "u16"
        },
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "configureOracle",
      "discriminator": [
        245,
        58,
        202,
        16,
        204,
        36,
        82,
        199
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "stablecoin"
          ]
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "oracleConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  97,
                  99,
                  108,
                  101,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "priceFeed",
          "type": "pubkey"
        },
        {
          "name": "maxDeviationBps",
          "type": "u16"
        },
        {
          "name": "maxStalenessSecs",
          "type": "u64"
        },
        {
          "name": "enabled",
          "type": "bool"
        }
      ]
    },
    {
      "name": "convert",
      "discriminator": [
        122,
        80,
        212,
        208,
        92,
        200,
        34,
        161
      ],
      "accounts": [
        {
          "name": "converter",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "treasury.authority",
                "account": "treasury"
              }
            ]
          }
        },
        {
          "name": "sourceStablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "sourceMint"
              }
            ]
          }
        },
        {
          "name": "destStablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "destMint"
              }
            ]
          }
        },
        {
          "name": "sourceMint",
          "writable": true
        },
        {
          "name": "destMint",
          "writable": true
        },
        {
          "name": "converterSourceAccount",
          "writable": true
        },
        {
          "name": "converterDestAccount",
          "writable": true
        },
        {
          "name": "fxPairConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  120,
                  95,
                  112,
                  97,
                  105,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "sourceMint"
              },
              {
                "kind": "account",
                "path": "destMint"
              }
            ]
          }
        },
        {
          "name": "priceFeed"
        },
        {
          "name": "sourceTokenProgram"
        },
        {
          "name": "destTokenProgram"
        }
      ],
      "args": [
        {
          "name": "sourceAmount",
          "type": "u64"
        },
        {
          "name": "minDestAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "freezeAccount",
      "discriminator": [
        253,
        75,
        82,
        133,
        167,
        238,
        43,
        130
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "initTreasury",
      "discriminator": [
        105,
        152,
        173,
        51,
        158,
        151,
        49,
        14
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "baseCurrency",
          "type": "string"
        },
        {
          "name": "travelRuleThreshold",
          "type": "u64"
        },
        {
          "name": "kycRequired",
          "type": "bool"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury"
        },
        {
          "name": "mint",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "transferHookProgram",
          "optional": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "uri",
          "type": "string"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "config",
          "type": {
            "defined": {
              "name": "stablecoinInitConfig"
            }
          }
        }
      ]
    },
    {
      "name": "kycApprove",
      "discriminator": [
        33,
        226,
        84,
        95,
        254,
        251,
        68,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "target"
        },
        {
          "name": "kycEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "target"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "kycLevel",
          "type": "u8"
        },
        {
          "name": "jurisdiction",
          "type": {
            "array": [
              "u8",
              3
            ]
          }
        },
        {
          "name": "provider",
          "type": "string"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "kycClose",
      "discriminator": [
        95,
        55,
        51,
        63,
        94,
        138,
        170,
        91
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "kycEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "kyc_entry.address",
                "account": "kycEntry"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "kycRevoke",
      "discriminator": [
        27,
        217,
        8,
        144,
        155,
        195,
        204,
        93
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "kycEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  107,
                  121,
                  99
                ]
              },
              {
                "kind": "account",
                "path": "treasury"
              },
              {
                "kind": "account",
                "path": "kyc_entry.address",
                "account": "kycEntry"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "mintTokens",
      "discriminator": [
        59,
        132,
        24,
        246,
        122,
        39,
        8,
        243
      ],
      "accounts": [
        {
          "name": "minter",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "minter"
              }
            ]
          }
        },
        {
          "name": "minterInfo",
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116,
                  101,
                  114,
                  95,
                  105,
                  110,
                  102,
                  111
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "minter"
              }
            ]
          }
        },
        {
          "name": "recipientTokenAccount",
          "writable": true
        },
        {
          "name": "oracleConfig",
          "optional": true
        },
        {
          "name": "priceFeed",
          "optional": true
        },
        {
          "name": "tokenProgram"
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
      "name": "nominateAuthority",
      "discriminator": [
        148,
        182,
        144,
        91,
        186,
        12,
        118,
        18
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "pause",
      "discriminator": [
        211,
        22,
        221,
        251,
        74,
        121,
        193,
        47
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "registerMint",
      "discriminator": [
        242,
        43,
        74,
        162,
        217,
        214,
        191,
        171
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "stablecoin"
        }
      ],
      "args": []
    },
    {
      "name": "removeFromAllowlist",
      "discriminator": [
        45,
        46,
        214,
        56,
        189,
        77,
        242,
        227
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "allowlistEntry",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  108,
                  108,
                  111,
                  119,
                  108,
                  105,
                  115,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "account",
                "path": "allowlist_entry.address",
                "account": "allowlistEntry"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "removeFromBlacklist",
      "discriminator": [
        47,
        105,
        20,
        10,
        165,
        168,
        203,
        219
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "blacklistEntry",
          "writable": true
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  98,
                  108,
                  97,
                  99,
                  107,
                  108,
                  105,
                  115,
                  116,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "removeFxPair",
      "discriminator": [
        137,
        226,
        98,
        41,
        99,
        231,
        68,
        171
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "treasury"
          ]
        },
        {
          "name": "treasury",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          },
          "relations": [
            "fxPairConfig"
          ]
        },
        {
          "name": "fxPairConfig",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "revokeRole",
      "discriminator": [
        179,
        232,
        2,
        180,
        48,
        227,
        82,
        7
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "roleAssignment",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "seize",
      "discriminator": [
        129,
        159,
        143,
        31,
        161,
        224,
        241,
        84
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "sourceTokenAccount",
          "writable": true
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true
        },
        {
          "name": "blacklistEntry"
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  115,
                  101,
                  105,
                  122,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "setSupplyCap",
      "discriminator": [
        26,
        229,
        174,
        213,
        12,
        59,
        220,
        71
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "supplyCap",
          "type": "u64"
        }
      ]
    },
    {
      "name": "thawAccount",
      "discriminator": [
        115,
        152,
        79,
        213,
        213,
        169,
        184,
        35
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "tokenAccount",
          "writable": true
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "transferAuthority",
      "discriminator": [
        48,
        169,
        76,
        72,
        229,
        180,
        55,
        161
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newAuthority",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "unpause",
      "discriminator": [
        169,
        144,
        4,
        38,
        10,
        141,
        188,
        255
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "roleAssignment",
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  111,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin"
              },
              {
                "kind": "const",
                "value": [
                  112,
                  97,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateMetadata",
      "discriminator": [
        170,
        182,
        43,
        239,
        97,
        78,
        225,
        186
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "stablecoin"
          ]
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": [
        {
          "name": "uri",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateMinterQuota",
      "discriminator": [
        221,
        28,
        229,
        118,
        214,
        28,
        220,
        247
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "stablecoin",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  116,
                  97,
                  98,
                  108,
                  101,
                  99,
                  111,
                  105,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "stablecoin.mint",
                "account": "stablecoin"
              }
            ]
          }
        },
        {
          "name": "minterInfo",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "newQuota",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "allowlistEntry",
      "discriminator": [
        42,
        59,
        88,
        1,
        124,
        138,
        92,
        236
      ]
    },
    {
      "name": "blacklistEntry",
      "discriminator": [
        218,
        179,
        231,
        40,
        141,
        25,
        168,
        189
      ]
    },
    {
      "name": "fxPairConfig",
      "discriminator": [
        97,
        140,
        45,
        187,
        110,
        107,
        65,
        244
      ]
    },
    {
      "name": "kycEntry",
      "discriminator": [
        43,
        113,
        165,
        70,
        7,
        3,
        232,
        8
      ]
    },
    {
      "name": "minterInfo",
      "discriminator": [
        158,
        4,
        176,
        199,
        251,
        15,
        209,
        131
      ]
    },
    {
      "name": "oracleConfig",
      "discriminator": [
        133,
        196,
        152,
        50,
        27,
        21,
        145,
        254
      ]
    },
    {
      "name": "roleAssignment",
      "discriminator": [
        205,
        130,
        191,
        231,
        211,
        225,
        155,
        246
      ]
    },
    {
      "name": "stablecoin",
      "discriminator": [
        253,
        100,
        162,
        223,
        228,
        151,
        56,
        155
      ]
    },
    {
      "name": "travelRuleMessage",
      "discriminator": [
        191,
        52,
        110,
        78,
        7,
        61,
        185,
        65
      ]
    },
    {
      "name": "treasury",
      "discriminator": [
        238,
        239,
        123,
        238,
        89,
        1,
        168,
        253
      ]
    }
  ],
  "events": [
    {
      "name": "accountFrozen",
      "discriminator": [
        221,
        214,
        59,
        29,
        246,
        50,
        119,
        206
      ]
    },
    {
      "name": "accountThawed",
      "discriminator": [
        49,
        63,
        73,
        105,
        129,
        190,
        40,
        119
      ]
    },
    {
      "name": "allowlistAdded",
      "discriminator": [
        102,
        147,
        146,
        236,
        103,
        153,
        16,
        151
      ]
    },
    {
      "name": "allowlistRemoved",
      "discriminator": [
        47,
        69,
        78,
        173,
        196,
        109,
        163,
        172
      ]
    },
    {
      "name": "authorityNominated",
      "discriminator": [
        83,
        253,
        94,
        222,
        179,
        41,
        95,
        127
      ]
    },
    {
      "name": "authorityTransferred",
      "discriminator": [
        245,
        109,
        179,
        54,
        135,
        92,
        22,
        64
      ]
    },
    {
      "name": "blacklistAdded",
      "discriminator": [
        214,
        13,
        214,
        145,
        233,
        250,
        4,
        236
      ]
    },
    {
      "name": "blacklistEntryClosed",
      "discriminator": [
        119,
        58,
        190,
        89,
        137,
        89,
        178,
        147
      ]
    },
    {
      "name": "blacklistRemoved",
      "discriminator": [
        56,
        84,
        216,
        61,
        23,
        245,
        29,
        236
      ]
    },
    {
      "name": "currencyConverted",
      "discriminator": [
        153,
        197,
        144,
        6,
        173,
        220,
        149,
        214
      ]
    },
    {
      "name": "fxPairConfigured",
      "discriminator": [
        46,
        82,
        250,
        233,
        88,
        136,
        149,
        225
      ]
    },
    {
      "name": "fxPairRemoved",
      "discriminator": [
        124,
        182,
        229,
        156,
        231,
        30,
        251,
        213
      ]
    },
    {
      "name": "kycApproved",
      "discriminator": [
        227,
        219,
        154,
        170,
        3,
        168,
        249,
        2
      ]
    },
    {
      "name": "kycEntryClosed",
      "discriminator": [
        88,
        72,
        129,
        99,
        128,
        249,
        150,
        32
      ]
    },
    {
      "name": "kycRevoked",
      "discriminator": [
        205,
        46,
        180,
        9,
        213,
        21,
        197,
        62
      ]
    },
    {
      "name": "metadataUpdated",
      "discriminator": [
        132,
        36,
        215,
        246,
        166,
        90,
        189,
        44
      ]
    },
    {
      "name": "mintRegistered",
      "discriminator": [
        91,
        135,
        88,
        182,
        239,
        182,
        5,
        85
      ]
    },
    {
      "name": "oracleConfigured",
      "discriminator": [
        111,
        102,
        175,
        86,
        180,
        219,
        55,
        79
      ]
    },
    {
      "name": "paused",
      "discriminator": [
        172,
        248,
        5,
        253,
        49,
        255,
        255,
        232
      ]
    },
    {
      "name": "roleAssigned",
      "discriminator": [
        15,
        207,
        225,
        171,
        169,
        117,
        98,
        131
      ]
    },
    {
      "name": "roleClosed",
      "discriminator": [
        104,
        151,
        154,
        97,
        124,
        28,
        148,
        108
      ]
    },
    {
      "name": "roleRevoked",
      "discriminator": [
        167,
        183,
        52,
        229,
        126,
        206,
        62,
        61
      ]
    },
    {
      "name": "stablecoinInitialized",
      "discriminator": [
        238,
        217,
        135,
        14,
        147,
        33,
        221,
        169
      ]
    },
    {
      "name": "supplyCapUpdated",
      "discriminator": [
        162,
        231,
        73,
        4,
        93,
        188,
        91,
        148
      ]
    },
    {
      "name": "tokensBurned",
      "discriminator": [
        230,
        255,
        34,
        113,
        226,
        53,
        227,
        9
      ]
    },
    {
      "name": "tokensMinted",
      "discriminator": [
        207,
        212,
        128,
        194,
        175,
        54,
        64,
        24
      ]
    },
    {
      "name": "tokensSeized",
      "discriminator": [
        51,
        129,
        131,
        114,
        206,
        234,
        140,
        122
      ]
    },
    {
      "name": "travelRuleAttached",
      "discriminator": [
        47,
        97,
        155,
        82,
        214,
        176,
        132,
        81
      ]
    },
    {
      "name": "travelRuleClosed",
      "discriminator": [
        74,
        67,
        29,
        98,
        128,
        38,
        122,
        166
      ]
    },
    {
      "name": "treasuryCreated",
      "discriminator": [
        190,
        59,
        58,
        105,
        76,
        234,
        21,
        199
      ]
    },
    {
      "name": "unpaused",
      "discriminator": [
        156,
        150,
        47,
        174,
        120,
        216,
        93,
        117
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "paused",
      "msg": "Stablecoin is paused"
    },
    {
      "code": 6001,
      "name": "unauthorized",
      "msg": "Not authorized"
    },
    {
      "code": 6002,
      "name": "blacklisted",
      "msg": "Address is blacklisted"
    },
    {
      "code": 6003,
      "name": "frozen",
      "msg": "Account is frozen"
    },
    {
      "code": 6004,
      "name": "minterQuotaExceeded",
      "msg": "Minter quota exceeded"
    },
    {
      "code": 6005,
      "name": "supplyCapExceeded",
      "msg": "Supply cap exceeded"
    },
    {
      "code": 6006,
      "name": "invalidName",
      "msg": "Invalid name length"
    },
    {
      "code": 6007,
      "name": "invalidSymbol",
      "msg": "Invalid symbol length"
    },
    {
      "code": 6008,
      "name": "invalidUri",
      "msg": "Invalid URI length"
    },
    {
      "code": 6009,
      "name": "invalidDecimals",
      "msg": "Invalid decimals"
    },
    {
      "code": 6010,
      "name": "complianceNotEnabled",
      "msg": "Compliance not enabled on this stablecoin"
    },
    {
      "code": 6011,
      "name": "allowlistNotEnabled",
      "msg": "Allowlist not enabled on this stablecoin"
    },
    {
      "code": 6012,
      "name": "alreadyBlacklisted",
      "msg": "Already blacklisted"
    },
    {
      "code": 6013,
      "name": "notBlacklisted",
      "msg": "Not blacklisted"
    },
    {
      "code": 6014,
      "name": "alreadyOnAllowlist",
      "msg": "Already on allowlist"
    },
    {
      "code": 6015,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6016,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6017,
      "name": "noPendingAuthority",
      "msg": "Authority transfer not pending"
    },
    {
      "code": 6018,
      "name": "invalidPendingAuthority",
      "msg": "Invalid pending authority"
    },
    {
      "code": 6019,
      "name": "reasonTooLong",
      "msg": "Reason too long"
    },
    {
      "code": 6020,
      "name": "oraclePriceStale",
      "msg": "Oracle price is stale"
    },
    {
      "code": 6021,
      "name": "oraclePriceDepegged",
      "msg": "Oracle price deviates from peg"
    },
    {
      "code": 6022,
      "name": "invalidOracleAccount",
      "msg": "Invalid oracle account"
    },
    {
      "code": 6023,
      "name": "treasuryAlreadyInitialized",
      "msg": "Treasury already initialized"
    },
    {
      "code": 6024,
      "name": "mintNotInTreasury",
      "msg": "Mint not registered in treasury"
    },
    {
      "code": 6025,
      "name": "treasuryFull",
      "msg": "Treasury full — maximum mints reached"
    },
    {
      "code": 6026,
      "name": "mintAlreadyRegistered",
      "msg": "Mint already registered in treasury"
    },
    {
      "code": 6027,
      "name": "sameCurrencyConversion",
      "msg": "Same currency conversion not allowed"
    },
    {
      "code": 6028,
      "name": "fxRateStale",
      "msg": "FX rate is stale"
    },
    {
      "code": 6029,
      "name": "fxSlippageExceeded",
      "msg": "FX slippage exceeds maximum"
    },
    {
      "code": 6030,
      "name": "invalidFxRate",
      "msg": "Invalid FX rate"
    },
    {
      "code": 6031,
      "name": "kycNotApproved",
      "msg": "KYC not approved"
    },
    {
      "code": 6032,
      "name": "kycExpired",
      "msg": "KYC expired"
    },
    {
      "code": 6033,
      "name": "kycLevelInsufficient",
      "msg": "KYC level insufficient"
    },
    {
      "code": 6034,
      "name": "invalidKycLevel",
      "msg": "Invalid KYC level"
    },
    {
      "code": 6035,
      "name": "invalidJurisdiction",
      "msg": "Invalid jurisdiction code"
    },
    {
      "code": 6036,
      "name": "travelRuleRequired",
      "msg": "Travel rule data required for this transfer amount"
    },
    {
      "code": 6037,
      "name": "originatorNameRequired",
      "msg": "Originator name required"
    },
    {
      "code": 6038,
      "name": "beneficiaryNameRequired",
      "msg": "Beneficiary name required"
    },
    {
      "code": 6039,
      "name": "vaspIdRequired",
      "msg": "VASP ID required"
    },
    {
      "code": 6040,
      "name": "travelRuleDataTooLong",
      "msg": "Travel rule data too long"
    },
    {
      "code": 6041,
      "name": "accountStillActive",
      "msg": "Account is still active — deactivate before closing"
    }
  ],
  "types": [
    {
      "name": "accountFrozen",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "account",
            "type": "pubkey"
          },
          {
            "name": "frozenBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "accountThawed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "account",
            "type": "pubkey"
          },
          {
            "name": "thawedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "allowlistAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "addedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "allowlistEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stablecoin",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "addedAt",
            "type": "i64"
          },
          {
            "name": "addedBy",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "allowlistRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "removedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "authorityNominated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          },
          {
            "name": "nominatedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "authorityTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "oldAuthority",
            "type": "pubkey"
          },
          {
            "name": "newAuthority",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "blacklistAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "addedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "blacklistEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stablecoin",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "reason",
            "type": "string"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "blacklistedAt",
            "type": "i64"
          },
          {
            "name": "blacklistedBy",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "blacklistEntryClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "blacklistRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "removedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "currencyConverted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "destMint",
            "type": "pubkey"
          },
          {
            "name": "sourceAmount",
            "type": "u64"
          },
          {
            "name": "destAmount",
            "type": "u64"
          },
          {
            "name": "fxRate",
            "type": "i64"
          },
          {
            "name": "fxExpo",
            "type": "i32"
          },
          {
            "name": "convertedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fxPairConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "destMint",
            "type": "pubkey"
          },
          {
            "name": "priceFeed",
            "type": "pubkey"
          },
          {
            "name": "maxStalenessSecs",
            "type": "u64"
          },
          {
            "name": "maxSlippageBps",
            "type": "u16"
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "fxPairConfigured",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "destMint",
            "type": "pubkey"
          },
          {
            "name": "priceFeed",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "fxPairRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "destMint",
            "type": "pubkey"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "kycApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "kycLevel",
            "type": "u8"
          },
          {
            "name": "jurisdiction",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "provider",
            "type": "string"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "approvedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "kycEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "kycLevel",
            "type": {
              "defined": {
                "name": "kycLevel"
              }
            }
          },
          {
            "name": "jurisdiction",
            "type": {
              "array": [
                "u8",
                3
              ]
            }
          },
          {
            "name": "provider",
            "type": "string"
          },
          {
            "name": "approvedAt",
            "type": "i64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "approvedBy",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    },
    {
      "name": "kycEntryClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "kycLevel",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "basic"
          },
          {
            "name": "enhanced"
          },
          {
            "name": "institutional"
          }
        ]
      }
    },
    {
      "name": "kycRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "revokedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "metadataUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "mintRegistered",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "minterInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stablecoin",
            "type": "pubkey"
          },
          {
            "name": "minter",
            "type": "pubkey"
          },
          {
            "name": "quota",
            "type": "u64"
          },
          {
            "name": "minted",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "oracleConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stablecoin",
            "type": "pubkey"
          },
          {
            "name": "priceFeed",
            "type": "pubkey"
          },
          {
            "name": "maxDeviationBps",
            "type": "u16"
          },
          {
            "name": "maxStalenessSecs",
            "type": "u64"
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "oracleConfigured",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "priceFeed",
            "type": "pubkey"
          },
          {
            "name": "maxDeviationBps",
            "type": "u16"
          },
          {
            "name": "maxStalenessSecs",
            "type": "u64"
          },
          {
            "name": "enabled",
            "type": "bool"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "paused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "pausedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "role",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "minter"
          },
          {
            "name": "burner"
          },
          {
            "name": "blacklister"
          },
          {
            "name": "pauser"
          },
          {
            "name": "seizer"
          }
        ]
      }
    },
    {
      "name": "roleAssigned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "assignee",
            "type": "pubkey"
          },
          {
            "name": "assignedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleAssignment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "stablecoin",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": {
              "defined": {
                "name": "role"
              }
            }
          },
          {
            "name": "assignee",
            "type": "pubkey"
          },
          {
            "name": "active",
            "type": "bool"
          },
          {
            "name": "grantedBy",
            "type": "pubkey"
          },
          {
            "name": "grantedAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "roleClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "assignee",
            "type": "pubkey"
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roleRevoked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "role",
            "type": "string"
          },
          {
            "name": "assignee",
            "type": "pubkey"
          },
          {
            "name": "revokedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stablecoin",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "enablePermanentDelegate",
            "type": "bool"
          },
          {
            "name": "enableTransferHook",
            "type": "bool"
          },
          {
            "name": "enableAllowlist",
            "type": "bool"
          },
          {
            "name": "totalMinted",
            "type": "u64"
          },
          {
            "name": "totalBurned",
            "type": "u64"
          },
          {
            "name": "supplyCap",
            "type": "u64"
          },
          {
            "name": "pendingAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                23
              ]
            }
          }
        ]
      }
    },
    {
      "name": "stablecoinInitConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "enablePermanentDelegate",
            "type": "bool"
          },
          {
            "name": "enableTransferHook",
            "type": "bool"
          },
          {
            "name": "enableAllowlist",
            "type": "bool"
          },
          {
            "name": "enableDefaultAccountState",
            "type": "bool"
          },
          {
            "name": "enableConfidentialTransfer",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "stablecoinInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "supplyCapUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "newCap",
            "type": "u64"
          },
          {
            "name": "updatedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokensBurned",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "burner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokensMinted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "minter",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "tokensSeized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "from",
            "type": "pubkey"
          },
          {
            "name": "to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "seizedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "travelRuleAttached",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "transferSignature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "originatorName",
            "type": "string"
          },
          {
            "name": "originatorVasp",
            "type": "string"
          },
          {
            "name": "beneficiaryName",
            "type": "string"
          },
          {
            "name": "beneficiaryVasp",
            "type": "string"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "travelRuleClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "transferSignature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "closedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "travelRuleMessage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "transferSignature",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "sourceMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "originatorName",
            "type": "string"
          },
          {
            "name": "originatorVasp",
            "type": "string"
          },
          {
            "name": "originatorAccount",
            "type": "pubkey"
          },
          {
            "name": "beneficiaryName",
            "type": "string"
          },
          {
            "name": "beneficiaryVasp",
            "type": "string"
          },
          {
            "name": "beneficiaryAccount",
            "type": "pubkey"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "createdBy",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "treasury",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "mints",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "baseCurrency",
            "type": "string"
          },
          {
            "name": "travelRuleThreshold",
            "type": "u64"
          },
          {
            "name": "kycRequired",
            "type": "bool"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "reserved",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "treasuryCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "baseCurrency",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "unpaused",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "unpausedBy",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
