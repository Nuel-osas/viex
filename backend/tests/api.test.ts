import request from "supertest";

// ---------------------------------------------------------------------------
// Mock the entire config module BEFORE importing app
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
const mockRpc = jest.fn().mockResolvedValue("mock-signature-123");
const mockMethods = {
  mintTokens: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  burnTokens: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  freezeAccount: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  thawAccount: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  pause: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  unpause: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  addToBlacklist: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  removeFromBlacklist: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  assignRole: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  revokeRole: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  kycApprove: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  kycRevoke: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  attachTravelRule: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
  seize: jest.fn().mockReturnValue({
    accounts: jest.fn().mockReturnValue({
      signers: jest.fn().mockReturnValue({ rpc: mockRpc }),
    }),
  }),
};

const { Keypair, PublicKey } = jest.requireActual("@solana/web3.js");
const testKeypair = Keypair.generate();
const testMint = Keypair.generate().publicKey;
const testRecipient = Keypair.generate().publicKey;

jest.mock("../src/config", () => {
  const { Keypair, PublicKey, Connection } = jest.requireActual(
    "@solana/web3.js"
  );
  const kp = Keypair.generate();

  const mockConnection = {
    getSlot: jest.fn().mockResolvedValue(123456),
    getTokenSupply: jest.fn().mockResolvedValue({
      value: { amount: "1000000000", decimals: 6, uiAmount: 1000 },
    }),
    onLogs: jest.fn().mockReturnValue(1),
    removeOnLogsListener: jest.fn(),
  };

  return {
    PORT: 3001,
    RPC_URL: "https://api.devnet.solana.com",
    API_KEY: "",
    VIEX_TREASURY_PROGRAM_ID: new PublicKey(
      "3rzgKqvEkhJiWivtTNg5WjSkFi8T4pNaQECWCssc8pAU"
    ),
    VIEX_TRANSFER_HOOK_PROGRAM_ID: new PublicKey(
      "4Zmj6AtwQ615LnzWnaoXmBVTzQHvTd7jyD1GefZCMSwY"
    ),
    connection: mockConnection,
    operatorKeypair: kp,
    provider: {},
    idl: {},
    program: {
      methods: mockMethods,
      account: {
        stablecoin: {
          fetch: mockFetch,
        },
        treasury: {
          fetch: mockFetch,
        },
        blacklistEntry: {
          fetch: mockFetch,
        },
        kycEntry: {
          fetch: mockFetch,
        },
        travelRuleMessage: {
          fetch: mockFetch,
        },
      },
    },
    findTreasuryPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findStablecoinPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findBlacklistEntryPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findAllowlistEntryPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findRoleAssignmentPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findMinterInfoPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findKycEntryPda: jest.fn().mockReturnValue([kp.publicKey, 255]),
    findTravelRuleMessagePda: jest.fn().mockReturnValue([kp.publicKey, 255]),
  };
});

// Mock spl-token
jest.mock("@solana/spl-token", () => ({
  TOKEN_2022_PROGRAM_ID: jest.requireActual("@solana/web3.js").PublicKey.default,
  getAssociatedTokenAddressSync: jest.fn().mockReturnValue(
    jest.requireActual("@solana/web3.js").Keypair.generate().publicKey
  ),
}));

// Now import app after mocks
import app from "../src/app";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BN = jest.requireActual("@coral-xyz/anchor").BN;

function mockStablecoinData() {
  return {
    authority: Keypair.generate().publicKey,
    mint: testMint,
    treasury: Keypair.generate().publicKey,
    name: "VIEX USD",
    symbol: "vUSD",
    uri: "https://example.com/vusd.json",
    decimals: 6,
    paused: false,
    enablePermanentDelegate: true,
    enableTransferHook: true,
    enableAllowlist: false,
    totalMinted: new BN(5000000000),
    totalBurned: new BN(1000000000),
    supplyCap: new BN(100000000000),
    pendingAuthority: null,
    bump: 255,
  };
}

function mockTreasuryData() {
  return {
    authority: Keypair.generate().publicKey,
    name: "VIEX Treasury",
    mints: [testMint],
    baseCurrency: "USD",
    travelRuleThreshold: new BN(1000000000),
    kycRequired: true,
    createdAt: new BN(Date.now() / 1000),
    bump: 255,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VIEX Treasury API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------

  describe("GET /health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("healthy");
      expect(res.body.data.slot).toBe(123456);
    });
  });

  // -------------------------------------------------------------------------
  // 404
  // -------------------------------------------------------------------------

  describe("GET /nonexistent", () => {
    it("should return 404", async () => {
      const res = await request(app).get("/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Treasury
  // -------------------------------------------------------------------------

  describe("GET /api/v1/treasury", () => {
    it("should return treasury state", async () => {
      mockFetch.mockResolvedValueOnce(mockTreasuryData());
      const res = await request(app).get("/api/v1/treasury");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("VIEX Treasury");
      expect(res.body.data.kycRequired).toBe(true);
    });
  });

  describe("GET /api/v1/treasury/mints", () => {
    it("should return registered mints", async () => {
      mockFetch
        .mockResolvedValueOnce(mockTreasuryData())
        .mockResolvedValueOnce(mockStablecoinData());
      const res = await request(app).get("/api/v1/treasury/mints");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.mints).toBeDefined();
      expect(res.body.data.mints.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------------------------
  // Stablecoin
  // -------------------------------------------------------------------------

  describe("GET /api/v1/stablecoin/:mint", () => {
    it("should return stablecoin state", async () => {
      mockFetch.mockResolvedValueOnce(mockStablecoinData());
      const res = await request(app).get(
        `/api/v1/stablecoin/${testMint.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("VIEX USD");
      expect(res.body.data.symbol).toBe("vUSD");
    });

    it("should return 400 for invalid mint", async () => {
      const res = await request(app).get("/api/v1/stablecoin/invalid-address");
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Supply
  // -------------------------------------------------------------------------

  describe("GET /api/v1/supply/:mint", () => {
    it("should return supply breakdown", async () => {
      mockFetch.mockResolvedValueOnce(mockStablecoinData());
      const res = await request(app).get(
        `/api/v1/supply/${testMint.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalMinted).toBeDefined();
      expect(res.body.data.circulating).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Mint
  // -------------------------------------------------------------------------

  describe("POST /api/v1/mint", () => {
    it("should mint tokens successfully", async () => {
      const res = await request(app).post("/api/v1/mint").send({
        mint: testMint.toBase58(),
        recipient: testRecipient.toBase58(),
        amount: "1000000",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signature).toBe("mock-signature-123");
    });

    it("should return 400 when missing mint field", async () => {
      const res = await request(app).post("/api/v1/mint").send({
        recipient: testRecipient.toBase58(),
        amount: "1000000",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when amount is invalid", async () => {
      const res = await request(app).post("/api/v1/mint").send({
        mint: testMint.toBase58(),
        recipient: testRecipient.toBase58(),
        amount: "-100",
      });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when missing recipient", async () => {
      const res = await request(app).post("/api/v1/mint").send({
        mint: testMint.toBase58(),
        amount: "1000000",
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Burn
  // -------------------------------------------------------------------------

  describe("POST /api/v1/burn", () => {
    it("should burn tokens successfully", async () => {
      const res = await request(app).post("/api/v1/burn").send({
        mint: testMint.toBase58(),
        amount: "500000",
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.signature).toBe("mock-signature-123");
    });

    it("should return 400 when missing amount", async () => {
      const res = await request(app).post("/api/v1/burn").send({
        mint: testMint.toBase58(),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // Blacklist
  // -------------------------------------------------------------------------

  describe("POST /api/v1/compliance/blacklist", () => {
    it("should add to blacklist", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app)
        .post("/api/v1/compliance/blacklist")
        .send({
          mint: testMint.toBase58(),
          address: target.toBase58(),
          reason: "Suspicious activity",
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 when missing address", async () => {
      const res = await request(app)
        .post("/api/v1/compliance/blacklist")
        .send({
          mint: testMint.toBase58(),
        });
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/compliance/blacklist", () => {
    it("should remove from blacklist", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app)
        .delete("/api/v1/compliance/blacklist")
        .send({
          mint: testMint.toBase58(),
          address: target.toBase58(),
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/compliance/blacklist/:mint/:address", () => {
    it("should check blacklist status", async () => {
      const target = Keypair.generate().publicKey;
      mockFetch.mockResolvedValueOnce({
        stablecoin: Keypair.generate().publicKey,
        address: target,
        reason: "Test",
        active: true,
        blacklistedAt: new BN(Date.now() / 1000),
        blacklistedBy: Keypair.generate().publicKey,
        bump: 255,
      });

      const res = await request(app).get(
        `/api/v1/compliance/blacklist/${testMint.toBase58()}/${target.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.blacklisted).toBe(true);
    });

    it("should return not blacklisted when entry not found", async () => {
      const target = Keypair.generate().publicKey;
      mockFetch.mockRejectedValueOnce(new Error("Account not found"));

      const res = await request(app).get(
        `/api/v1/compliance/blacklist/${testMint.toBase58()}/${target.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.blacklisted).toBe(false);
      expect(res.body.data.entry).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // KYC
  // -------------------------------------------------------------------------

  describe("POST /api/v1/kyc/approve", () => {
    it("should approve KYC", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/kyc/approve").send({
        address: target.toBase58(),
        level: "enhanced",
        jurisdiction: "USA",
        provider: "Chainalysis",
        expiresAt: Math.floor(Date.now() / 1000) + 86400 * 365,
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 when missing fields", async () => {
      const res = await request(app).post("/api/v1/kyc/approve").send({
        address: Keypair.generate().publicKey.toBase58(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/kyc/revoke", () => {
    it("should revoke KYC", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/kyc/revoke").send({
        address: target.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 when missing address", async () => {
      const res = await request(app).post("/api/v1/kyc/revoke").send({});
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/kyc/:address", () => {
    it("should return KYC status", async () => {
      const target = Keypair.generate().publicKey;
      mockFetch.mockResolvedValueOnce({
        treasury: Keypair.generate().publicKey,
        address: target,
        kycLevel: { enhanced: {} },
        jurisdiction: [85, 83, 65],
        provider: "Chainalysis",
        approvedAt: new BN(Date.now() / 1000),
        expiresAt: new BN(Date.now() / 1000 + 86400 * 365),
        approvedBy: Keypair.generate().publicKey,
        active: true,
        bump: 255,
      });

      const res = await request(app).get(
        `/api/v1/kyc/${target.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.data.approved).toBe(true);
      expect(res.body.data.entry.kycLevel).toBe("Enhanced");
    });
  });

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------

  describe("POST /api/v1/roles/assign", () => {
    it("should assign a role", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/roles/assign").send({
        mint: testMint.toBase58(),
        role: "minter",
        address: target.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 for invalid role", async () => {
      const target = Keypair.generate().publicKey;
      // The role validation happens in the service layer, which checks ROLE_MAP before calling rpc
      const res = await request(app).post("/api/v1/roles/assign").send({
        mint: testMint.toBase58(),
        role: "invalid_role",
        address: target.toBase58(),
      });
      expect(res.status).toBe(400);
    });

    it("should return 400 when missing fields", async () => {
      const res = await request(app).post("/api/v1/roles/assign").send({
        mint: testMint.toBase58(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/roles/revoke", () => {
    it("should revoke a role", async () => {
      const target = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/roles/revoke").send({
        mint: testMint.toBase58(),
        role: "minter",
        address: target.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Events / Audit Log
  // -------------------------------------------------------------------------

  describe("GET /api/v1/events/:mint", () => {
    it("should return events for a mint", async () => {
      const res = await request(app).get(
        `/api/v1/events/${testMint.toBase58()}`
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeDefined();
      expect(Array.isArray(res.body.data.events)).toBe(true);
    });
  });

  describe("GET /api/v1/audit-log", () => {
    it("should return audit log", async () => {
      const res = await request(app).get("/api/v1/audit-log");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total).toBeDefined();
      expect(res.body.data.entries).toBeDefined();
    });

    it("should support action filter", async () => {
      const res = await request(app).get(
        "/api/v1/audit-log?action=TokensMinted&limit=10&offset=0"
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // API Key Auth
  // -------------------------------------------------------------------------

  describe("API Key Authentication", () => {
    it("should pass when no API_KEY is configured", async () => {
      const res = await request(app).get("/api/v1/audit-log");
      expect(res.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // Freeze / Thaw
  // -------------------------------------------------------------------------

  describe("POST /api/v1/freeze", () => {
    it("should freeze an account", async () => {
      const tokenAccount = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/freeze").send({
        mint: testMint.toBase58(),
        tokenAccount: tokenAccount.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 400 when missing tokenAccount", async () => {
      const res = await request(app).post("/api/v1/freeze").send({
        mint: testMint.toBase58(),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/thaw", () => {
    it("should thaw an account", async () => {
      const tokenAccount = Keypair.generate().publicKey;
      const res = await request(app).post("/api/v1/thaw").send({
        mint: testMint.toBase58(),
        tokenAccount: tokenAccount.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Pause / Unpause
  // -------------------------------------------------------------------------

  describe("POST /api/v1/pause", () => {
    it("should pause stablecoin", async () => {
      const res = await request(app).post("/api/v1/pause").send({
        mint: testMint.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /api/v1/unpause", () => {
    it("should unpause stablecoin", async () => {
      const res = await request(app).post("/api/v1/unpause").send({
        mint: testMint.toBase58(),
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
