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
  storyboardId?: string;
};

interface SavedImagesPaneProps {
  images: SavedImageView[];
  formatTimestamp: (value: number) => string;
  mimeToExtension: (mimeType: string | null) => string;
  onOpenImage: (src: string, title: string, alt?: string, gallery?: Array<{ src: string; title: string; alt?: string }>) => void;
  onDeleteImage: (id: string) => void;
  onDeleteGroup: (ids: string[]) => void;
}

const SAVED_CATEGORIES = [
  { key: "all",    label: "All",             kinds: null },
  { key: "looks",  label: "Generated Looks", kinds: ["main", "side", "back", "detail"] },
  { key: "prints", label: "Prints",          kinds: ["prints"] },
] as const;

type CategoryKey = typeof SAVED_CATEGORIES[number]["key"];

// ── Grouping ──────────────────────────────────────────────────────────────────

// Images saved within this window from the same storyboard = one session group.
const SESSION_GAP_MS = 10_000;

// Display order within a group: main first, then angles, then prints.
const KIND_ORDER: Record<string, number> = {
  main: 0, side: 1, back: 2, detail: 3, prints: 0,
};

type ImageGroup = {
  id: string;                 // first (newest) image id — stable group key
  storyboardId?: string;
  storyboardTitle?: string;
  images: SavedImageView[];
  latestCreatedAt: number;    // newest timestamp in group  (for time-window check)
  earliestCreatedAt: number;  // oldest timestamp in group  (for display)
};

function groupBySession(images: SavedImageView[]): ImageGroup[] {
  // images are already sorted newest-first
  const groups: ImageGroup[] = [];

  for (const img of images) {
    // Only cluster images that share a storyboard identity
    const match = img.storyboardId
      ? groups.find(
          (g) =>
            g.storyboardId === img.storyboardId &&
            g.latestCreatedAt - img.createdAt < SESSION_GAP_MS,
        )
      : undefined;

    if (match) {
      match.images.push(img);
      if (img.createdAt < match.earliestCreatedAt) {
        match.earliestCreatedAt = img.createdAt;
      }
    } else {
      groups.push({
        id: img.id,
        storyboardId: img.storyboardId,
        storyboardTitle: img.storyboardTitle,
        images: [img],
        latestCreatedAt: img.createdAt,
        earliestCreatedAt: img.createdAt,
      });
    }
  }

  // Sort images within each group by logical kind order
  for (const g of groups) {
    g.images.sort(
      (a, b) => (KIND_ORDER[a.kind ?? ""] ?? 99) - (KIND_ORDER[b.kind ?? ""] ?? 99),
    );
  }

  return groups;
}

function groupCategory(group: ImageGroup): "looks" | "prints" | "mixed" {
  const hasLook = group.images.some((img) =>
    ["main", "side", "back", "detail"].includes(img.kind ?? ""),
  );
  const hasPrint = group.images.some((img) => img.kind === "prints");
  if (hasLook && !hasPrint) return "looks";
  if (hasPrint && !hasLook) return "prints";
  return "mixed";
}

function groupCountLabel(group: ImageGroup): string {
  const cat = groupCategory(group);
  const n = group.images.length;
  if (cat === "looks") return `${n} ${n === 1 ? "look" : "looks"}`;
  if (cat === "prints") return `${n} ${n === 1 ? "print" : "prints"}`;
  return `${n} ${n === 1 ? "image" : "images"}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: ImageGroup;
  formatTimestamp: (v: number) => string;
  mimeToExtension: (mime: string | null) => string;
  onOpenImage: SavedImagesPaneProps["onOpenImage"];
  onDeleteGroup: (ids: string[]) => void;
}

function GroupCard({ group, formatTimestamp, onOpenImage, onDeleteGroup }: GroupCardProps) {
  const { images } = group;
  const count = images.length;
  const gallery = images.map((img) => ({ src: img.url, title: img.title, alt: img.title }));
  const gridCount = Math.min(count, 4) as 1 | 2 | 3 | 4;

  return (
    <div className="atLibraryCard">
      {/* ── Preview / thumbnail grid ── */}
      <div className="atGroupPreviewWrap">
        {count > 1 && <span className="atGroupCountBadge">×{count}</span>}

        <div className="atGroupThumbGrid" data-count={gridCount}>
          {images.slice(0, 4).map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="atGroupThumb"
              onClick={() => onOpenImage(img.url, img.title, img.title, gallery)}
              aria-label={`Open ${img.title}`}
            >
              <img src={img.url} alt={img.title} draggable={false} />
              {/* "+N more" overlay on the 4th slot when there are >4 images */}
              {i === 3 && count > 4 && (
                <span className="atGroupMoreOverlay">+{count - 3}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Hover overlay ── */}
        <div className="atGroupOverlay">
          <button
            type="button"
            className="atLibraryOverlayBtn"
            onClick={() =>
              onOpenImage(images[0]!.url, images[0]!.title, images[0]!.title, gallery)
            }
            title="View"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </button>
          <button
            type="button"
            className="atLibraryOverlayBtn atLibraryOverlayBtnDanger"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteGroup(images.map((img) => img.id));
            }}
            title={count === 1 ? "Delete" : `Delete all ${count}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Meta ── */}
      <div className="atLibraryCardMeta">
        <div className="atLibraryCardTitle" title={group.storyboardTitle || "Untitled"}>
          {group.storyboardTitle || "Untitled"}
        </div>
        <div className="atLibraryCardSub">{groupCountLabel(group)}</div>
        <div className="atLibraryCardDate">{formatTimestamp(group.earliestCreatedAt)}</div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SavedImagesPane({
  images,
  formatTimestamp,
  mimeToExtension,
  onOpenImage,
  onDeleteImage,
  onDeleteGroup,
}: SavedImagesPaneProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  // Exclude asset uploads — only show generated outputs
  const exportImages = useMemo(
    () => images.filter((img) => !img.kind?.startsWith("asset-")),
    [images],
  );

  // Build session groups from the full export set
  const allGroups = useMemo(() => groupBySession(exportImages), [exportImages]);

  // Filter groups by active category
  const filteredGroups = useMemo(() => {
    if (activeCategory === "all") return allGroups;
    const cat = SAVED_CATEGORIES.find((c) => c.key === activeCategory);
    if (!cat?.kinds) return allGroups;
    const kinds = cat.kinds as readonly string[];
    return allGroups.filter((g) =>
      g.images.some((img) => kinds.includes(img.kind ?? "")),
    );
  }, [allGroups, activeCategory]);

  const countFor = (key: CategoryKey) => {
    if (key === "all") return exportImages.length;
    const cat = SAVED_CATEGORIES.find((c) => c.key === key);
    return cat?.kinds
      ? exportImages.filter((img) =>
          (cat.kinds as readonly string[]).includes(img.kind ?? ""),
        ).length
      : 0;
  };

  return (
    <div className="savedImagesPane">
      {/* ── Header ── */}
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

      {/* ── Category pills ── */}
      <div className="atCategoryBar" style={{ marginTop: 20 }}>
        {SAVED_CATEGORIES.map((cat) => {
          const count = countFor(cat.key);
          if (cat.key !== "all" && count === 0) return null;
          return (
            <button
              key={cat.key}
              type="button"
              className={[
                "atCategoryPill",
                activeCategory === cat.key ? "atCategoryPillActive" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setActiveCategory(cat.key)}
            >
              {cat.label}
              <span className="atCategoryCount">{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Grid ── */}
      {filteredGroups.length === 0 ? (
        <div className="atLibraryEmpty" style={{ marginTop: 20 }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="40"
            height="40"
            style={{ opacity: 0.3 }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m21 15-5-5L5 21" />
            <circle cx="8.5" cy="8.5" r="1.5" />
          </svg>
          <p>
            {activeCategory === "all"
              ? "No saved images yet."
              : `No ${SAVED_CATEGORIES.find((c) => c.key === activeCategory)?.label.toLowerCase()} saved yet.`}
          </p>
        </div>
      ) : (
        <div className="atLibraryGrid" style={{ marginTop: 20 }}>
          {filteredGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              formatTimestamp={formatTimestamp}
              mimeToExtension={mimeToExtension}
              onOpenImage={onOpenImage}
              onDeleteGroup={
                group.images.length === 1
                  ? (ids) => onDeleteImage(ids[0]!)
                  : onDeleteGroup
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
