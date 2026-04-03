import { useState } from "react";
import FieldLabel from "./FieldLabel";
import Spinner from "./Spinner";

type Timings = { textLlmMs: number; imageGenMs: number; totalMs: number };

type AnglesRuntime = {
  generating: boolean;
  error: string | null;
  sideDataUrl: string | null;
  sideMimeType: string | null;
  backDataUrl: string | null;
  backMimeType: string | null;
  timingsMs: { side: number; back: number; total: number } | null;
};

type RuntimeLite = {
  resultDataUrl: string | null;
  resultMimeType: string | null;
  resultTimingsMs: Record<string, number> | null;
  angles: AnglesRuntime;
};

interface StoryboardResultsPaneProps {
  isGenerating: boolean;
  generationStepIndex: number;
  generationElapsedMs: number;
  generationSteps: readonly string[];
  runtime: RuntimeLite;
  computedTimings: Timings;
  formatDurationMs: (ms: number | null | undefined) => string;
  mimeToExtension: (mimeType: string | null) => string;
  onResultImagePointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onResultImagePointerLeave: (event: React.PointerEvent<HTMLDivElement>) => void;
  onOpenImage: (src: string, title: string, alt?: string) => void;
  onSaveImage: () => void;
  onRetry: (comment: string) => void;
  onGenerateAngles: () => void;
  onDownloadAll: () => void;
  onSaveAll: () => void;
}

export default function StoryboardResultsPane({
  isGenerating,
  generationStepIndex,
  generationElapsedMs,
  generationSteps,
  runtime,
  computedTimings,
  formatDurationMs,
  mimeToExtension,
  onResultImagePointerMove,
  onResultImagePointerLeave,
  onOpenImage,
  onSaveImage,
  onRetry,
  onGenerateAngles,
  onDownloadAll,
  onSaveAll,
}: StoryboardResultsPaneProps) {
  const [retryOpen, setRetryOpen] = useState(false);
  const [retryComments, setRetryComments] = useState("");

  function handleRetry() {
    onRetry(retryComments);
    setRetryOpen(false);
    setRetryComments("");
  }

  return (
    <div className="result">
      <FieldLabel
        label="Generated result"
        info="Your generated ecommerce scene will appear here. For best results, start with Auto settings."
      />

      {isGenerating ? (
        <div className="resultPlaceholder loaderPlaceholder">
          <div className="loader">
            <div className="loaderHeader">
              <Spinner />
              <div>
                <div className="loaderTitle">{generationSteps[generationStepIndex]}</div>
                <div className="loaderSubtitle">Elapsed {formatDurationMs(generationElapsedMs)}</div>
              </div>
            </div>
            <div className="loaderSteps" aria-label="Generation progress">
              {generationSteps.map((label, idx) => (
                <div
                  key={label}
                  className={[
                    "loaderStep",
                    idx < generationStepIndex ? "loaderStepDone" : "",
                    idx === generationStepIndex ? "loaderStepActive" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <div className="loaderDot" aria-hidden="true" />
                  <div className="loaderStepText">{label}</div>
                </div>
              ))}
            </div>
            <div className="loaderHint muted">Keep this tab open while we generate your image.</div>
          </div>
        </div>
      ) : runtime.resultDataUrl ? (
        <>
          <div className="resultActions">
            <div className="resultActionsRight">
              {runtime.resultTimingsMs && (
                <div className="badge" title="Time spent generating this image">
                  <span>Thinking</span>
                  <code>{formatDurationMs(computedTimings.textLlmMs)}</code>
                  <span>Image gen</span>
                  <code>{formatDurationMs(computedTimings.imageGenMs)}</code>
                  <span>Total</span>
                  <code>{formatDurationMs(computedTimings.totalMs)}</code>
                </div>
              )}
            </div>
          </div>

          <div
            className="resultImageZoom"
            onPointerMove={onResultImagePointerMove}
            onPointerLeave={onResultImagePointerLeave}
          >
            <img className="resultImage" src={runtime.resultDataUrl} alt="Generated look" draggable={false} />
          </div>

          <div className="resultImageButtons">
            <a
              className="btn btnGhost iconButton"
              style={{ width: 130 }}
              href={runtime.resultDataUrl}
              download={`look-${Date.now()}.${mimeToExtension(runtime.resultMimeType)}`}
              aria-label="Download generated image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              &nbsp;&nbsp;Download
            </a>
            <button
              type="button"
              className="btn btnGhost iconButton"
              style={{ width: 100 }}
              onClick={onSaveImage}
              disabled={isGenerating}
              aria-label="Save generated image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
              </svg>
              &nbsp;&nbsp;Save
            </button>
            <button
              type="button"
              className="btnGhost iconButton"
              onClick={() => onOpenImage(runtime.resultDataUrl!, "Generated look", "Generated look")}
              aria-label="Open generated image"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 10 5 5" /><path d="M5 8V5H8" /><path d="M14 10 19 5" /><path d="M16 5h3v3" />
                <path d="M10 14 5 19" /><path d="M5 16v3h3" /><path d="M14 14 19 19" /><path d="M16 19h3v-3" />
              </svg>
            </button>
            <button
              type="button"
              className="btnGhost iconButton"
              onClick={() => setRetryOpen((v) => !v)}
              aria-expanded={retryOpen}
              aria-label="Retry main image"
              title="Retry"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>

          {retryOpen && (
            <div style={{ marginTop: 14 }}>
              <FieldLabel label="Retry Comments" info="Add targeted improvements for this retry pass." htmlFor="retryComments" />
              <input
                id="retryComments"
                className="control"
                type="text"
                value={retryComments}
                onChange={(e) => setRetryComments(e.target.value)}
                placeholder="What improvements would you like?"
              />
              <div className="actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                <button type="button" className="btnPrimary" onClick={handleRetry} disabled={isGenerating}>
                  Generate
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="resultPlaceholder resultEmpty">
          <div>
            <div className="resultEmptyTitle">Ready when you are</div>
            <div className="muted">Upload garment photos, then click "Generate look".</div>
          </div>
        </div>
      )}

      <div className="divider" style={{ margin: "18px 0" }} />

      <FieldLabel
        label="Multiple Angles"
        info="Generate natural ecommerce poses for side and back views, matching the same garment + scene as the main result."
      />

      {!runtime.resultDataUrl ? (
        <div className="muted">Generate the main image first to unlock multiple angles.</div>
      ) : (
        <div>
          <div className="actions" style={{ justifyContent: "space-between" }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={onGenerateAngles}
              disabled={isGenerating || runtime.angles.generating}
            >
              {runtime.angles.generating ? "Generating..." : "Generate Multiple Angles"}
            </button>
            {runtime.angles.sideDataUrl && runtime.angles.backDataUrl && (
              <div style={{ display: "inline-flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button type="button" className="btnSecondary" onClick={onSaveAll}>Save all images</button>
                <button type="button" className="btnPrimary" onClick={onDownloadAll}>Download all images</button>
              </div>
            )}
          </div>

          {runtime.angles.timingsMs && (
            <div className="muted" style={{ marginTop: 10 }}>
              Side: {formatDurationMs(runtime.angles.timingsMs.side)} · Back:{" "}
              {formatDurationMs(runtime.angles.timingsMs.back)} · Total:{" "}
              {formatDurationMs(runtime.angles.timingsMs.total)}
            </div>
          )}

          {runtime.angles.error && <div className="error">{runtime.angles.error}</div>}

          {(runtime.angles.sideDataUrl || runtime.angles.backDataUrl) && (
            <div className="anglesGrid">
              {/* Side */}
              <div className="angleTile">
                <div className="angleTileHeader">
                  <div className="angleTileTitle">Side view</div>
                  {runtime.angles.sideDataUrl && (
                    <div className="angleTileActions">
                      <button
                        type="button"
                        className="btnGhost iconButton"
                        onClick={() => onOpenImage(runtime.angles.sideDataUrl!, "Side view", "Generated side view")}
                        aria-label="Open side view"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10 10 5 5" /><path d="M5 8V5H8" /><path d="M14 10 19 5" /><path d="M16 5h3v3" />
                          <path d="M10 14 5 19" /><path d="M5 16v3h3" /><path d="M14 14 19 19" /><path d="M16 19h3v-3" />
                        </svg>
                      </button>
                      <a
                        className="btn btnGhost iconButton"
                        href={runtime.angles.sideDataUrl}
                        download={`look-side-${Date.now()}.${mimeToExtension(runtime.angles.sideMimeType)}`}
                        aria-label="Download side view"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
                {runtime.angles.sideDataUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <img src={runtime.angles.sideDataUrl} alt="Generated side view" draggable={false} />
                  </div>
                ) : (
                  <div className="muted" style={{ marginTop: 10 }}>Not generated yet.</div>
                )}
              </div>

              {/* Back */}
              <div className="angleTile">
                <div className="angleTileHeader">
                  <div className="angleTileTitle">Back view</div>
                  {runtime.angles.backDataUrl && (
                    <div className="angleTileActions">
                      <button
                        type="button"
                        className="btnGhost iconButton"
                        onClick={() => onOpenImage(runtime.angles.backDataUrl!, "Back view", "Generated back view")}
                        aria-label="Open back view"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M10 10 5 5" /><path d="M5 8V5H8" /><path d="M14 10 19 5" /><path d="M16 5h3v3" />
                          <path d="M10 14 5 19" /><path d="M5 16v3h3" /><path d="M14 14 19 19" /><path d="M16 19h3v-3" />
                        </svg>
                      </button>
                      <a
                        className="btn btnGhost iconButton"
                        href={runtime.angles.backDataUrl}
                        download={`look-back-${Date.now()}.${mimeToExtension(runtime.angles.backMimeType)}`}
                        aria-label="Download back view"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
                {runtime.angles.backDataUrl ? (
                  <div style={{ marginTop: 10 }}>
                    <img src={runtime.angles.backDataUrl} alt="Generated back view" draggable={false} />
                  </div>
                ) : (
                  <div className="muted" style={{ marginTop: 10 }}>Not generated yet.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
