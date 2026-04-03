interface DeleteStoryboardModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteStoryboardModal({ open, title, onClose, onConfirm }: DeleteStoryboardModalProps) {
  if (!open) return null;
  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label="Delete storyboard"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modalCard">
        <div className="modalTitle">Delete storyboard?</div>
        <div className="muted" style={{ marginTop: 6 }}>
          This removes <strong>{title}</strong> from this browser.
        </div>
        <div className="actions" style={{ justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" className="btnSecondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btnDanger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
