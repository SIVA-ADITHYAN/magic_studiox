import { useMemo, useState } from "react";
import type { StoryboardRecord } from "../lib/storyboards";

type RuntimeLite = { resultDataUrl: string | null; garmentDataUrls: string[] };

interface StoryboardLibraryProps {
  storyboards: StoryboardRecord[];
  activeId: string;
  runtimeById: Record<string, RuntimeLite | undefined>;
  savedPreviewByStoryboardId: Record<string, string>;
  isGenerating: boolean;
  subtitleFor: (sb: StoryboardRecord) => string;
  formatTimestamp: (iso: string) => string;
  onCreate: () => void;
  onOpen: (id: string) => void;
}

export default function StoryboardLibrary({
  storyboards,
  activeId,
  runtimeById,
  savedPreviewByStoryboardId,
  isGenerating,
  subtitleFor,
  formatTimestamp,
  onCreate,
  onOpen,
}: StoryboardLibraryProps) {
  const [activeFilter, setActiveFilter] = useState<string>(""); // "" = All

  // Build filter list from garment types actually used + "All"
  const filterOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const sb of storyboards) {
      if (sb.garmentType?.trim()) seen.add(sb.garmentType.trim());
    }
    return Array.from(seen).sort();
  }, [storyboards]);

  const filtered = useMemo(() => {
    if (!activeFilter) return storyboards;
    return storyboards.filter((sb) => sb.garmentType?.trim() === activeFilter);
  }, [storyboards, activeFilter]);

  function handleOpen(id: string) {
    if (isGenerating) return;
    onOpen(id);
  }

  return (
    <div className="storyboardLibrary">
      <div className="storyboardLibraryHeader">
        <div>
          <div className="sectionTitle" style={{ margin: "0 0 6px" }}>Mood Boards</div>
          <div className="title" style={{ fontSize: 18, margin: 0 }}>Pick an idea to continue</div>
          <div className="muted" style={{ marginTop: 6 }}>Mood boards are stored locally in this browser.</div>
        </div>
        <button type="button" className="btnSecondary" onClick={onCreate} disabled={isGenerating}>
          New mood board
        </button>
      </div>

      {/* ── Garment Type Filter ──────────────────────────────────── */}
      {filterOptions.length > 0 && (
        <div className="garmentFilterBar">
          <span className="garmentFilterLabel">Filter by garment:</span>
          <div className="garmentFilterPills">
            <button
              type="button"
              className={["garmentFilterPill", !activeFilter ? "garmentFilterPillActive" : ""].filter(Boolean).join(" ")}
              onClick={() => setActiveFilter("")}
            >
              All
            </button>
            {filterOptions.map((type) => (
              <button
                key={type}
                type="button"
                className={["garmentFilterPill", activeFilter === type ? "garmentFilterPillActive" : ""].filter(Boolean).join(" ")}
                onClick={() => setActiveFilter(activeFilter === type ? "" : type)}
              >
                {type}
                <span className="garmentFilterCount">
                  {storyboards.filter((sb) => sb.garmentType?.trim() === type).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="storyboardGallery" role="list" aria-label="Mood Boards">
        {filtered.length === 0 ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            No mood boards match "{activeFilter}".
          </div>
        ) : (
          filtered.map((sb) => {
            const rt = runtimeById[sb.id];
            const isActive = sb.id === activeId;
            return (
              <div key={sb.id} className="storyboardCardWrapper" role="listitem">
                <div
                  className={[
                    "storyboardCard",
                    isActive ? "storyboardCardActive" : "",
                    isGenerating ? "storyboardCardDisabled" : "",
                  ].filter(Boolean).join(" ")}
                  role="button"
                  tabIndex={isGenerating ? -1 : 0}
                  aria-selected={isActive ? "true" : "false"}
                  aria-disabled={isGenerating ? "true" : "false"}
                  onClick={() => handleOpen(sb.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpen(sb.id);
                    }
                  }}
                >
                  <div className="storyboardCardPreview" aria-hidden="true">
                    {rt?.resultDataUrl ? (
                      <img src={rt.resultDataUrl} alt="" draggable={false} />
                    ) : savedPreviewByStoryboardId[sb.id] ? (
                      <img src={savedPreviewByStoryboardId[sb.id]} alt="" draggable={false} />
                    ) : rt?.garmentDataUrls?.length ? (
                      <img src={rt.garmentDataUrls[0]} alt="" draggable={false} />
                    ) : (
                      <div className="storyboardCardPreviewPlaceholder">No preview yet</div>
                    )}
                  </div>
                  <div className="storyboardCardTop">
                    <div className="storyboardCardTitle">{sb.title}</div>
                    <div className="storyboardCardMeta">{formatTimestamp(sb.updatedAt)}</div>
                  </div>
                  {sb.garmentType && (
                    <div className="storyboardCardGarment">{sb.garmentType}</div>
                  )}
                  <div className="storyboardCardSub">{subtitleFor(sb)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
