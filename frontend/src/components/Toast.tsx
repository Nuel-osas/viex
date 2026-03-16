import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  txSig?: string;
}

interface ToastContextType {
  addToast: (type: ToastType, title: string, message: string, txSig?: string) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastType, title: string, message: string, txSig?: string) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, title, message, txSig }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border p-4 shadow-xl backdrop-blur-sm animate-slide-in ${
              toast.type === "success"
                ? "bg-accent-500/10 border-accent-500/30 text-accent-400"
                : toast.type === "error"
                ? "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-primary-500/10 border-primary-500/30 text-primary-400"
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5">
                {toast.type === "success"
                  ? "+"
                  : toast.type === "error"
                  ? "!"
                  : "i"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{toast.title}</p>
                <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>
                {toast.txSig && (
                  <a
                    href={`https://explorer.solana.com/tx/${toast.txSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs mt-1 underline opacity-70 hover:opacity-100 block truncate"
                  >
                    View on Explorer
                  </a>
                )}
              </div>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="text-gray-500 hover:text-white text-sm"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export default function Toast() {
  return null;
}
