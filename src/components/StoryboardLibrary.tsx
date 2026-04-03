import type { StoryboardRecord } from "../lib/storyboards";

type RuntimeLite = { resultDataUrl: string | null; garmentDataUrls: string[] };

interface StoryboardLibraryProps {
  storyboards: StoryboardRecord[];
  activeId: string;
  runtimeById: Record<string, RuntimeLite | undefined>;
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
  isGenerating,
  subtitleFor,
  formatTimestamp,
  onCreate,
  onOpen,
}: StoryboardLibraryProps) {
  function handleOpen(id: string) {
    if (isGenerating) return;
    onOpen(id);
  }

  return (
    <div className="storyboardLibrary">
      <div className="storyboardLibraryHeader">
        <div>
          <div className="sectionTitle" style={{ margin: "0 0 6px" }}>Storyboards</div>
          <div className="title" style={{ fontSize: 18, margin: 0 }}>Pick an idea to continue</div>
          <div className="muted" style={{ marginTop: 6 }}>Storyboards are stored locally in this browser.</div>
        </div>
        <button type="button" className="btnSecondary" onClick={onCreate} disabled={isGenerating}>
          New storyboard
        </button>
      </div>

      <div className="storyboardGallery" role="list" aria-label="Storyboards">
        {storyboards.map((sb) => {
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
                  ) : sb.previewDataUrl ? (
                    <img src={sb.previewDataUrl} alt="" draggable={false} />
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
                <div className="storyboardCardSub">{subtitleFor(sb)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
