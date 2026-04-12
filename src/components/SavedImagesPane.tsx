import { useState, useMemo } from "react";

type SavedImageView = {
  id: string;
  title: string;
  url: string;
  createdAt: number;
  kind?: string;
  mimeType: string;
  fileName?: string;
  storyboardTitle?: string;
};

interface SavedImagesPaneProps {
  images: SavedImageView[];
  formatTimestamp: (value: number) => string;
  mimeToExtension: (mimeType: string | null) => string;
  onOpenImage: (src: string, title: string, alt?: string, gallery?: Array<{ src: string; title: string; alt?: string }>) => void;
  onDeleteImage: (id: string) => void;
}

// Only show non-asset saved images (generated outputs)
const SAVED_CATEGORIES = [
  { key: "all",    label: "All",             kinds: null },
  { key: "looks",  label: "Generated Looks", kinds: ["main", "side", "back", "detail"] },
  { key: "prints", label: "Prints",          kinds: ["prints"] },
] as const;

type CategoryKey = typeof SAVED_CATEGORIES[number]["key"];

function kindLabel(kind: string | undefined): string {
  if (kind === "main")   return "Look";
  if (kind === "side")   return "Side view";
  if (kind === "back")   return "Back view";
  if (kind === "detail") return "Detail shot";
  if (kind === "prints") return "Print";
  return (kind || "").replace(/_/g, " ");
}

export default function SavedImagesPane({
  images,
  formatTimestamp,
  mimeToExtension,
  onOpenImage,
  onDeleteImage,
}: SavedImagesPaneProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  // Only show generated outputs (not asset-* uploads)
  const exportImages = useMemo(
    () => images.filter((img) => !img.kind?.startsWith("asset-")),
    [images],
  );

  const filtered = useMemo(() => {
    if (activeCategory === "all") return exportImages;
    const cat = SAVED_CATEGORIES.find((c) => c.key === activeCategory);
    return cat?.kinds
      ? exportImages.filter((img) => (cat.kinds as readonly string[]).includes(img.kind ?? ""))
      : exportImages;
  }, [exportImages, activeCategory]);

  const countFor = (key: CategoryKey) => {
    if (key === "all") return exportImages.length;
    const cat = SAVED_CATEGORIES.find((c) => c.key === key);
    return cat?.kinds
      ? exportImages.filter((img) => (cat.kinds as readonly string[]).includes(img.kind ?? "")).length
      : 0;
  };

  return (
    <div className="savedImagesPane">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="savedImagesHeader">
        <div>
          <div className="title" style={{ fontSize: 18, margin: 0 }}>Saved exports</div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Looks, angles and prints you've saved from generation.
          </div>
        </div>
        <div className="badge" title="Total saved images">
          <span>Total</span>
          <code>{exportImages.length}</code>
        </div>
      </div>

      {/* ── Category filter pills ────────────────────────────────── */}
      <div className="atCategoryBar" style={{ marginTop: 20 }}>
        {SAVED_CATEGORIES.map((cat) => {
          const count = countFor(cat.key);
          if (cat.key !== "all" && count === 0) return null;
          return (
            <button
              key={cat.key}
              type="button"
              className={["atCategoryPill", activeCategory === cat.key ? "atCategoryPillActive" : ""].filter(Boolean).join(" ")}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              <span className="atCategoryCount">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="atLibraryEmpty" style={{ marginTop: 20 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ opacity: 0.3 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m21 15-5-5L5 21" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          <p>{activeCategory === "all" ? "No saved images yet." : `No ${SAVED_CATEGORIES.find(c => c.key === activeCategory)?.label.toLowerCase()} saved yet.`}</p>
        </div>
      ) : (
        <div className="atLibraryGrid" style={{ marginTop: 20 }}>
          {filtered.map((image) => {
            const gallery = filtered.map((img) => ({ src: img.url, title: img.title, alt: img.title }));
            return (
            <div key={image.id} className="atLibraryCard">
              <div className="atLibraryCardPreviewWrap">
                <button
                  type="button"
                  className="atLibraryCardPreview"
                  onClick={() => onOpenImage(image.url, image.title, image.title, gallery)}
                  aria-label={`Open ${image.title}`}
                >
                  <img src={image.url} alt={image.title} draggable={false} />
                </button>

                <div className="atLibraryCardOverlay">
                  {/* Maximize */}
                  <button
                    type="button"
                    className="atLibraryOverlayBtn"
                    onClick={() => onOpenImage(image.url, image.title, image.title, gallery)}
                    title="View full size"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </button>
                  {/* Download */}
                  <a
                    className="atLibraryOverlayBtn"
                    href={image.url}
                    download={image.fileName || `saved-${image.id}.${mimeToExtension(image.mimeType)}`}
                    title="Download"
                    aria-label="Download"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v10M8 11l4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                  </a>
                  {/* Delete */}
                  <button
                    type="button"
                    className="atLibraryOverlayBtn atLibraryOverlayBtnDanger"
                    onClick={(e) => { e.stopPropagation(); onDeleteImage(image.id); }}
                    title="Delete"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>

                {image.kind && (
                  <span className="atLibraryKindBadge">{kindLabel(image.kind)}</span>
                )}
              </div>

              <div className="atLibraryCardMeta">
                <div className="atLibraryCardTitle" title={image.title}>{image.title}</div>
                {image.storyboardTitle && (
                  <div className="atLibraryCardSub">{image.storyboardTitle}</div>
                )}
                <div className="atLibraryCardDate">{formatTimestamp(image.createdAt)}</div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
