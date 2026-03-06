import type { Toast } from "../hooks/useToast";

interface Props {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

const icons: Record<string, string> = { success: "✓", error: "✕", info: "ℹ" };

export default function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => onRemove(t.id)}>
          <span style={{ fontSize: 16 }}>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
