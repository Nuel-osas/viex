/// <reference types="vite/client" />

declare module "@solana/wallet-adapter-react" {
  import { FC, ReactNode } from "react";
  import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

  export interface ConnectionProviderProps {
    children: ReactNode;
    endpoint: string;
    config?: any;
  }
  export const ConnectionProvider: FC<ConnectionProviderProps>;

  export interface WalletProviderProps {
    children: ReactNode;
    wallets: any[];
    autoConnect?: boolean;
    onError?: (error: any) => void;
  }
  export const WalletProvider: FC<WalletProviderProps>;

  export function useConnection(): { connection: Connection };
  export function useWallet(): {
    publicKey: PublicKey | null;
    connected: boolean;
    connecting: boolean;
    disconnect: () => Promise<void>;
    signTransaction: ((tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>) | undefined;
    signAllTransactions: ((txs: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>) | undefined;
    sendTransaction: (tx: Transaction | VersionedTransaction, connection: Connection, options?: any) => Promise<string>;
    wallet: any;
  };
}

declare module "@solana/wallet-adapter-react-ui" {
  import { FC, ReactNode } from "react";

  export interface WalletModalProviderProps {
    children: ReactNode;
  }
  export const WalletModalProvider: FC<WalletModalProviderProps>;
  export const WalletMultiButton: FC<any>;
  export const WalletDisconnectButton: FC<any>;
}
