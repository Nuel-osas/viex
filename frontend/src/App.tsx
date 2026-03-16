import { Routes, Route } from "react-router-dom";
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

export default function App() {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-dark-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
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
          </main>
        </div>
      </div>
      <Toast />
    </ToastProvider>
  );
}
