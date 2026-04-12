import { useEffect } from "react";

type ImageEntry = { src: string; title: string; alt?: string };

interface ImageModalProps {
  open: boolean;
  src: string;
  title: string;
  alt?: string;
  onClose: () => void;
  images?: ImageEntry[];
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export default function ImageModal({
  open,
  src,
  title,
  alt,
  onClose,
  images,
  currentIndex = 0,
  onNavigate,
}: ImageModalProps) {
  const hasNav = !!(images && images.length > 1 && onNavigate);
  const canPrev = hasNav && currentIndex > 0;
  const canNext = hasNav && currentIndex < (images?.length ?? 1) - 1;

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (!hasNav || !onNavigate || !images) return;
      if (e.key === "ArrowLeft" && canPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && canNext) onNavigate(currentIndex + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, hasNav, canPrev, canNext, currentIndex, images, onNavigate, onClose]);

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
        {/* Header */}
        <div className="imageModalHeader">
          <div className="modalTitle" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {title}
          </div>
          {hasNav && (
            <span className="imageModalCounter">{currentIndex + 1} / {images!.length}</span>
          )}
          <button
            type="button"
            className="imageModalClose"
            onClick={onClose}
            aria-label="Close image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body with nav */}
        <div className="imageModalBody">
          {canPrev && (
            <button
              type="button"
              className="imageModalNavBtn imageModalNavLeft"
              onClick={() => onNavigate!(currentIndex - 1)}
              aria-label="Previous image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          <img src={src} alt={alt || title} draggable={false} />

          {canNext && (
            <button
              type="button"
              className="imageModalNavBtn imageModalNavRight"
              onClick={() => onNavigate!(currentIndex + 1)}
              aria-label="Next image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
