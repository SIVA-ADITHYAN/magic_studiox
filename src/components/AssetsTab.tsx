import { useState, type ChangeEvent } from "react";
import type { SavedImageRecord } from "../lib/indexeddb";

// ─── Types ───────────────────────────────────────────────────────────────────

type SavedImageView = SavedImageRecord & { url: string };

type RuntimeLite = {
  garmentDataUrls: string[];
  backgroundDataUrls: string[];
  modelDataUrls: string[];
  poseDataUrls: string[];
};

interface AssetsTabProps {
  activeStoryboardTitle: string;
  activeRuntime: RuntimeLite;
  savedImages: SavedImageView[];
  formatTimestamp: (ms: number) => string;
  mimeToExtension: (mime: string | null) => string;
  onBackgroundFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onModelFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPoseFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeBackgroundImage: (idx: number) => void;
  removeModelImage: (idx: number) => void;
  removePoseImage: (idx: number) => void;
  onOpenImage: (src: string, title: string, alt?: string) => void;
  onDeleteImage: (id: string) => void;
}

// ─── Category definitions ─────────────────────────────────────────────────────

const LIBRARY_CATEGORIES = [
  { key: "all",        label: "All",         kinds: null },
  { key: "background", label: "Backgrounds", kinds: ["asset-background"] },
  { key: "model",      label: "Models",      kinds: ["asset-model"] },
  { key: "pose",       label: "Poses",       kinds: ["asset-pose"] },
] as const;

type CategoryKey = typeof LIBRARY_CATEGORIES[number]["key"];

function categoryLabel(kind: string): string {
  if (kind === "asset-background") return "Background";
  if (kind === "asset-model") return "Model";
  if (kind === "asset-pose") return "Pose";
  if (kind === "main") return "Look";
  if (kind === "side") return "Side view";
  if (kind === "back") return "Back view";
  if (kind === "prints") return "Print";
  return kind.replace(/_/g, " ");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RemoveIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M18 6 6 18" /><path d="M6 6l12 12" />
  </svg>
);

const MaximizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

// ─── Upload section sub-tab ───────────────────────────────────────────────────

type UploadSubTab = "background" | "model" | "pose";

const UPLOAD_TABS: { key: UploadSubTab; label: string; emoji: string; info: string }[] = [
  { key: "background", label: "Backgrounds", emoji: "🖼️", info: "Upload 1–4 images to lock a scene setting or mood." },
  { key: "model",      label: "Models",      emoji: "🧍", info: "Upload 1–4 model reference images to preserve identity and styling." },
  { key: "pose",       label: "Poses",       emoji: "🤸", info: "Upload a pose reference to recreate a specific posture or stance." },
];

interface UploadPanelProps {
  activeRuntime: RuntimeLite;
  onBackgroundFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onModelFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onPoseFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  removeBackgroundImage: (idx: number) => void;
  removeModelImage: (idx: number) => void;
  removePoseImage: (idx: number) => void;
  onOpenImage: (src: string, title: string) => void;
}

function UploadPanel({
  activeRuntime,
  onBackgroundFileChange, onModelFileChange, onPoseFileChange,
  removeBackgroundImage, removeModelImage, removePoseImage,
  onOpenImage,
}: UploadPanelProps) {
  const [uploadTab, setUploadTab] = useState<UploadSubTab>("background");

  const activeTabDef = UPLOAD_TABS.find((t) => t.key === uploadTab)!;

  const dataUrls =
    uploadTab === "background" ? activeRuntime.backgroundDataUrls
    : uploadTab === "model" ? activeRuntime.modelDataUrls
    : activeRuntime.poseDataUrls;

  const fileChangeHandler =
    uploadTab === "background" ? onBackgroundFileChange
    : uploadTab === "model" ? onModelFileChange
    : onPoseFileChange;

  const removeHandler =
    uploadTab === "background" ? removeBackgroundImage
    : uploadTab === "model" ? removeModelImage
    : removePoseImage;

  const inputId = `assetsUpload_${uploadTab}`;

  return (
    <div className="atUploadPanel">
      {/* Sub-tabs */}
      <div className="atSubTabs" role="tablist">
        {UPLOAD_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={uploadTab === t.key}
            className={["atSubTab", uploadTab === t.key ? "atSubTabActive" : ""].filter(Boolean).join(" ")}
            onClick={() => setUploadTab(t.key)}
          >
            <span className="atSubTabEmoji">{t.emoji}</span>
            {t.label}
            {(uploadTab !== t.key) && (
              <span className="atSubTabCount">
                {t.key === "background" ? activeRuntime.backgroundDataUrls.length
                  : t.key === "model" ? activeRuntime.modelDataUrls.length
                  : activeRuntime.poseDataUrls.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload panel body */}
      <div className="atUploadBody">
        <div className="atUploadInfo">{activeTabDef.info}</div>

        <label className="atDropZone" htmlFor={inputId}>
          <svg className="atDropZoneIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="atDropZoneText">Click to upload {activeTabDef.label.toLowerCase()}</span>
          <span className="atDropZoneSub">PNG, JPG, WEBP</span>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={fileChangeHandler}
          />
        </label>

        {dataUrls.length > 0 ? (
          <div className="atPreviewGrid">
            {dataUrls.map((src, idx) => (
              <div key={`${uploadTab}-${idx}`} className="atPreviewItem">
                <img
                  src={src}
                  alt={`${activeTabDef.label} ${idx + 1}`}
                  draggable={false}
                  onClick={() => onOpenImage(src, `${activeTabDef.label} ${idx + 1}`)}
                />
                <button
                  type="button"
                  className="atPreviewRemove"
                  onClick={() => removeHandler(idx)}
                  aria-label={`Remove ${activeTabDef.label.toLowerCase()} ${idx + 1}`}
                  title="Remove"
                >
                  <RemoveIcon />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="atPreviewEmpty">
            No {activeTabDef.label.toLowerCase()} uploaded yet for this storyboard.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Library section ──────────────────────────────────────────────────────────

interface LibraryPanelProps {
  savedImages: SavedImageView[];
  formatTimestamp: (ms: number) => string;
  onOpenImage: (src: string, title: string) => void;
  onDeleteImage: (id: string) => void;
}

function LibraryPanel({ savedImages, formatTimestamp, onOpenImage, onDeleteImage }: LibraryPanelProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  const filteredImages =
    activeCategory === "all"
      ? savedImages
      : savedImages.filter((img) => {
          const cat = LIBRARY_CATEGORIES.find((c) => c.key === activeCategory);
          return cat?.kinds ? (cat.kinds as readonly string[]).includes(img.kind) : false;
        });

  const countFor = (key: CategoryKey) => {
    if (key === "all") return savedImages.length;
    const cat = LIBRARY_CATEGORIES.find((c) => c.key === key);
    return cat?.kinds ? savedImages.filter((img) => (cat.kinds as readonly string[]).includes(img.kind)).length : 0;
  };

  return (
    <div className="atLibraryPanel">
      {/* Category filter pills */}
      <div className="atCategoryBar">
        {LIBRARY_CATEGORIES.map((cat) => {
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

      {/* Image grid */}
      {filteredImages.length === 0 ? (
        <div className="atLibraryEmpty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40" style={{ opacity: 0.3 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m21 15-5-5L5 21" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          <p>No images in this category yet.</p>
        </div>
      ) : (
        <div className="atLibraryGrid">
          {filteredImages.map((image) => (
            <div key={image.id} className="atLibraryCard">
              <div className="atLibraryCardPreviewWrap">
                <button
                  type="button"
                  className="atLibraryCardPreview"
                  onClick={() => onOpenImage(image.url, image.title)}
                  aria-label={`Open ${image.title}`}
                >
                  <img src={image.url} alt={image.title} draggable={false} />
                </button>
                <div className="atLibraryCardOverlay">
                  <button
                    type="button"
                    className="atLibraryOverlayBtn"
                    onClick={() => onOpenImage(image.url, image.title)}
                    title="View full size"
                  >
                    <MaximizeIcon />
                  </button>
                  <button
                    type="button"
                    className="atLibraryOverlayBtn atLibraryOverlayBtnDanger"
                    onClick={() => onDeleteImage(image.id)}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <span className="atLibraryKindBadge">{categoryLabel(image.kind)}</span>
              </div>
              <div className="atLibraryCardMeta">
                <div className="atLibraryCardTitle" title={image.title}>{image.title}</div>
                {image.storyboardTitle && (
                  <div className="atLibraryCardSub">{image.storyboardTitle}</div>
                )}
                <div className="atLibraryCardDate">{formatTimestamp(image.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type MainTab = "upload" | "library";

export default function AssetsTab({
  activeStoryboardTitle,
  activeRuntime,
  savedImages,
  formatTimestamp,
  onBackgroundFileChange,
  onModelFileChange,
  onPoseFileChange,
  removeBackgroundImage,
  removeModelImage,
  removePoseImage,
  onOpenImage,
  onDeleteImage,
}: AssetsTabProps) {
  const [mainTab, setMainTab] = useState<MainTab>("upload");

  const uploadCount =
    activeRuntime.backgroundDataUrls.length +
    activeRuntime.modelDataUrls.length +
    activeRuntime.poseDataUrls.length;

  return (
    <div className="atRoot">
      {/* ── Main tab bar ─────────────────────────────────────────── */}
      <div className="atTabBar" role="tablist" aria-label="Asset sections">
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "upload"}
          className={["atTab", mainTab === "upload" ? "atTabActive" : ""].filter(Boolean).join(" ")}
          onClick={() => setMainTab("upload")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Upload
          {uploadCount > 0 && <span className="atTabBadge">{uploadCount}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "library"}
          className={["atTab", mainTab === "library" ? "atTabActive" : ""].filter(Boolean).join(" ")}
          onClick={() => setMainTab("library")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m21 15-5-5L5 21" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          Library
          {savedImages.length > 0 && <span className="atTabBadge">{savedImages.length}</span>}
        </button>
      </div>

      {/* ── Tab context line ─────────────────────────────────────── */}
      {mainTab === "upload" && (
        <div className="atContext">
          Uploading for storyboard: <strong>{activeStoryboardTitle}</strong>. These are active references used during generation.
        </div>
      )}
      {mainTab === "library" && (
        <div className="atContext">
          All saved images from every storyboard, organized by category.
        </div>
      )}

      {/* ── Tab panels ───────────────────────────────────────────── */}
      {mainTab === "upload" && (
        <UploadPanel
          activeRuntime={activeRuntime}
          onBackgroundFileChange={onBackgroundFileChange}
          onModelFileChange={onModelFileChange}
          onPoseFileChange={onPoseFileChange}
          removeBackgroundImage={removeBackgroundImage}
          removeModelImage={removeModelImage}
          removePoseImage={removePoseImage}
          onOpenImage={onOpenImage}
        />
      )}

      {mainTab === "library" && (
        <LibraryPanel
          savedImages={savedImages}
          formatTimestamp={formatTimestamp}
          onOpenImage={onOpenImage}
          onDeleteImage={onDeleteImage}
        />
      )}
    </div>
  );
}
