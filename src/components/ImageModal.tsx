interface ImageModalProps {
  open: boolean;
  src: string;
  title: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageModal({ open, src, title, alt, onClose }: ImageModalProps) {
  if (!open) return null;
  return (
    <div
      className="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modalCard imageModalCard">
        <div className="imageModalHeader">
          <div className="modalTitle">{title}</div>
          <button
            type="button"
            className="btnGhost iconButton"
            onClick={onClose}
            aria-label="Close image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M18 6 6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="imageModalBody">
          <img src={src} alt={alt || title} draggable={false} />
        </div>
      </div>
    </div>
  );
}
