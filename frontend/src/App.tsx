import { useMemo } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import { ToastProvider } from "./components/Toast";
import Dashboard from "./pages/Dashboard";
import Initialize from "./pages/Initialize";
import MintBurn from "./pages/MintBurn";
import Convert from "./pages/Convert";
import Compliance from "./pages/Compliance";
import Kyc from "./pages/Kyc";
import TravelRule from "./pages/TravelRule";
import Roles from "./pages/Roles";
import Authority from "./pages/Authority";
import Holders from "./pages/Holders";
import FreezeThaw from "./pages/FreezeThaw";
import Pause from "./pages/Pause";

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
}

export default function App() {
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ToastProvider>
            <div className="flex h-screen bg-navy-950 overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto">
                  <div className="max-w-7xl mx-auto px-6 py-6">
                    <PageTransition>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/initialize" element={<Initialize />} />
                        <Route path="/mint-burn" element={<MintBurn />} />
                        <Route path="/convert" element={<Convert />} />
                        <Route path="/compliance" element={<Compliance />} />
                        <Route path="/kyc" element={<Kyc />} />
                        <Route path="/travel-rule" element={<TravelRule />} />
                        <Route path="/roles" element={<Roles />} />
                        <Route path="/authority" element={<Authority />} />
                        <Route path="/holders" element={<Holders />} />
                        <Route path="/freeze-thaw" element={<FreezeThaw />} />
                        <Route path="/pause" element={<Pause />} />
                      </Routes>
                    </PageTransition>
                  </div>
                </main>
              </div>
            </div>
            <Toast />
          </ToastProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
