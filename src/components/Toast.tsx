import { useEffect, useState } from "react";

export type ToastItem = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

interface ToastProps {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 10,
      pointerEvents: "none",
    }}>
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    const show = setTimeout(() => setVisible(true), 10);
    // Auto dismiss after 4s
    const hide = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 350);
    }, 4000);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [toast.id, onRemove]);

  const bg =
    toast.type === "success" ? "#22c55e" :
    toast.type === "error"   ? "#ef4444" : "#6366f1";

  const icon =
    toast.type === "success" ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ) : toast.type === "error" ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );

  return (
    <div
      style={{
        pointerEvents: "all",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#1e1e2e",
        border: `2px solid ${bg}`,
        borderRadius: 12,
        padding: "12px 16px",
        minWidth: 260,
        maxWidth: 360,
        boxShadow: `0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px ${bg}22`,
        color: "#fff",
        fontSize: 14,
        fontWeight: 500,
        transform: visible ? "translateX(0)" : "translateX(120%)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
      }}
    >
      <span style={{ color: bg, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(() => onRemove(toast.id), 350); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#888", padding: 2, flexShrink: 0, lineHeight: 0,
        }}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18" /><path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
