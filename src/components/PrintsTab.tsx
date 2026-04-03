import { useState, useMemo } from "react";
import FieldLabel from "./FieldLabel";
import type { StoryboardConfig } from "../lib/storyboards";
import { normalizeHexColor } from "../lib/utils";

type PrintsRuntimeLite = {
  baseGarmentFrontDataUrl: string | null;
  baseGarmentBackDataUrl: string | null;
  baseGarmentSideDataUrl: string | null;
  printDesignDataUrl: string | null;
  outputFrontDataUrl: string | null;
  outputFrontMimeType: string | null;
  outputBackDataUrl: string | null;
  outputBackMimeType: string | null;
  outputSideDataUrl: string | null;
  outputSideMimeType: string | null;
  generating: boolean;
  error: string | null;
};

type RuntimeLite = { prints: PrintsRuntimeLite };

interface PrintsTabProps {
  storyboardTitle: string;
  config: StoryboardConfig;
  onConfigUpdate: (updates: Partial<StoryboardConfig>) => void;
  runtime: RuntimeLite;
  isBusy: boolean;
  mimeToExtension: (mimeType: string | null) => string;
  onBaseGarmentFrontFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBaseGarmentBackFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBaseGarmentSideFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrintDesignFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeBaseGarmentFront: () => void;
  removeBaseGarmentBack: () => void;
  removeBaseGarmentSide: () => void;
  removePrintDesign: () => void;
  printElapsedMs?: number;
  onGenerate: () => void;
  onRetry: (comment: string) => void;
  onSave: () => void;
  onOpenImage: (src: string, title: string) => void;
}

export default function PrintsTab({
  config,
  onConfigUpdate,
  runtime,
  isBusy,
  mimeToExtension,
  onBaseGarmentFrontFileChange,
  onBaseGarmentBackFileChange,
  onBaseGarmentSideFileChange,
  onPrintDesignFileChange,
  removeBaseGarmentFront,
  removeBaseGarmentBack,
  removeBaseGarmentSide,
  removePrintDesign,
  printElapsedMs = 0,
  onGenerate,
  onRetry,
  onSave,
  onOpenImage,
}: PrintsTabProps) {
  const [retryOpen, setRetryOpen] = useState(false);
  const [retryComments, setRetryComments] = useState("");

  const timerText = useMemo(() => {
    const s = Math.floor(printElapsedMs / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}m ${rs}s`;
  }, [printElapsedMs]);

  const colorPickerValue = useMemo(() => normalizeHexColor(config.printColorHex) || "#000000", [config.printColorHex]);
  const isValidColorHex = useMemo(() => Boolean(normalizeHexColor(config.printColorHex)), [config.printColorHex]);
  const hasPrintedOutputs = Boolean(
    runtime.prints.outputFrontDataUrl || runtime.prints.outputBackDataUrl || runtime.prints.outputSideDataUrl,
  );
  const primaryPrintedOutput =
    runtime.prints.outputFrontDataUrl ||
    runtime.prints.outputBackDataUrl ||
    runtime.prints.outputSideDataUrl ||
    "";

  function handleColorPickerInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = (e.target.value || "").trim();
    onConfigUpdate({ printColorHex: normalizeHexColor(value) || value });
  }

  function handleColorHexBlur() {
    const normalized = normalizeHexColor(config.printColorHex);
    if (normalized) onConfigUpdate({ printColorHex: normalized });
  }

  function handleRetry() {
    onRetry(retryComments);
    setRetryOpen(false);
    setRetryComments("");
  }

  const generateDisabled =
    isBusy ||
    !runtime.prints.baseGarmentFrontDataUrl ||
    !runtime.prints.baseGarmentBackDataUrl ||
    !runtime.prints.baseGarmentSideDataUrl ||
    (config.printInputKind === "color" ? !isValidColorHex : !runtime.prints.printDesignDataUrl);

  return (
    <div className="storyboardLibrary">
      <div>
        <div className="sectionTitle" style={{ marginTop: 0 }}>Inputs</div>

        <div className="row" style={{ marginTop: 10 }}>
          {/* White Garment Photos */}
          <div className="card">
            <FieldLabel htmlFor="printBaseGarmentFront" label="White garment photos" info="Upload front, back, and side views of the same white garment." />
            <div style={{ display: "grid", gap: 12 }}>
              {/* Front */}
              <div>
                <FieldLabel htmlFor="printBaseGarmentFront" label="Front view (required)" info="The front view is required." />
                <input id="printBaseGarmentFront" type="file" accept="image/*" onChange={onBaseGarmentFrontFileChange} />
                {runtime.prints.baseGarmentFrontDataUrl && (
                  <div className="preview" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="previewItem">
                      <img src={runtime.prints.baseGarmentFrontDataUrl} alt="White garment photo — front" draggable={false} onClick={() => onOpenImage(runtime.prints.baseGarmentFrontDataUrl!, "White garment — front")} />
                      <button type="button" className="removePreviewButton" onClick={removeBaseGarmentFront} aria-label="Remove white garment front photo" title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Back */}
              <div>
                <FieldLabel htmlFor="printBaseGarmentBack" label="Back view (required)" info="The back view is required." />
                <input id="printBaseGarmentBack" type="file" accept="image/*" onChange={onBaseGarmentBackFileChange} />
                {runtime.prints.baseGarmentBackDataUrl && (
                  <div className="preview" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="previewItem">
                      <img src={runtime.prints.baseGarmentBackDataUrl} alt="White garment photo — back" draggable={false} onClick={() => onOpenImage(runtime.prints.baseGarmentBackDataUrl!, "White garment — back")} />
                      <button type="button" className="removePreviewButton" onClick={removeBaseGarmentBack} aria-label="Remove white garment back photo" title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {/* Side */}
              <div>
                <FieldLabel htmlFor="printBaseGarmentSide" label="Side view (required)" info="The side view is required." />
                <input id="printBaseGarmentSide" type="file" accept="image/*" onChange={onBaseGarmentSideFileChange} />
                {runtime.prints.baseGarmentSideDataUrl && (
                  <div className="preview" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="previewItem">
                      <img src={runtime.prints.baseGarmentSideDataUrl} alt="White garment photo — side" draggable={false} onClick={() => onOpenImage(runtime.prints.baseGarmentSideDataUrl!, "White garment — side")} />
                      <button type="button" className="removePreviewButton" onClick={removeBaseGarmentSide} aria-label="Remove white garment side photo" title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Prints & Colors */}
          <div className="prints-and-colors card">
            <div className="print-header">PRINTS</div>
            <br />
            <div className="tabGroup" role="tablist" aria-label="Print input mode" style={{ marginBottom: 10 }}>
              <button type="button" className={config.printInputKind === "image" ? "tabButton tabButtonActive" : "tabButton"} aria-selected={config.printInputKind === "image"} onClick={() => onConfigUpdate({ printInputKind: "image" })}>Image</button>
              <button type="button" className={config.printInputKind === "color" ? "tabButton tabButtonActive" : "tabButton"} aria-selected={config.printInputKind === "color"} onClick={() => onConfigUpdate({ printInputKind: "color" })}>Colors</button>
            </div>
            <br /><br />

            {config.printInputKind === "color" ? (
              <>
                <FieldLabel htmlFor="printColorHex" label="Color" info="Pick a solid color to apply to the garment fabric (hex)." />
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input id="printColorPicker" type="color" value={colorPickerValue} onChange={handleColorPickerInput} aria-label="Pick a color" style={{ width: 54, height: 44, padding: 0, borderRadius: 12, border: "1px solid #E2E8F0", background: "#fff" }} />
                  <input id="printColorHex" className="control" type="text" value={config.printColorHex} onChange={(e) => onConfigUpdate({ printColorHex: e.target.value })} onBlur={handleColorHexBlur} placeholder="#RRGGBB" />
                </div>
                {config.printColorHex.trim() && !isValidColorHex && (
                  <div className="muted" style={{ marginTop: 8 }}>Please enter a valid hex color (e.g. #FF3366).</div>
                )}
              </>
            ) : (
              <>
                <FieldLabel htmlFor="printDesign" label="" info="Upload the artwork/print to apply." />
                <input id="printDesign" type="file" accept="image/*" onChange={onPrintDesignFileChange} />
                {runtime.prints.printDesignDataUrl && (
                  <div className="preview" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="previewItem">
                      <img src={runtime.prints.printDesignDataUrl} alt="Print / design image" draggable={false} onClick={() => onOpenImage(runtime.prints.printDesignDataUrl!, "Print / design image")} />
                      <button type="button" className="removePreviewButton" onClick={removePrintDesign} aria-label="Remove print/design image" title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div>
          <FieldLabel htmlFor="printAdditionalPrompt" label="Additional prompt" info="Optional notes for how the print should be applied." />
          <textarea id="printAdditionalPrompt" className="control" rows={4} value={config.printAdditionalPrompt} onChange={(e) => onConfigUpdate({ printAdditionalPrompt: e.target.value })} placeholder="Optional: e.g., all-over small repeating pattern; align with seams; keep neckline and cuffs clean." />
        </div>

        <div className="actions" style={{ marginTop: 14, justifyContent: "space-between" }}>
          <button type="button" className="btnPrimary" onClick={onGenerate} disabled={generateDisabled}>
            {runtime.prints.generating ? `Generating... ${timerText}` : "Generate Printed Garment"}
          </button>
        </div>

        {runtime.prints.error && <div className="error">{runtime.prints.error}</div>}

        {(runtime.prints.outputFrontDataUrl || runtime.prints.outputBackDataUrl || runtime.prints.outputSideDataUrl) && (
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ marginBottom: 8 }}>Result</div>
            <div className="preview">
              {runtime.prints.outputFrontDataUrl && (
                <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
                  <div className="previewItem">
                    <img src={runtime.prints.outputFrontDataUrl} alt="Printed garment result — front" draggable={false} onClick={() => onOpenImage(runtime.prints.outputFrontDataUrl!, "Printed garment — front")} />
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Front</div>
                </div>
              )}
              {runtime.prints.outputBackDataUrl && (
                <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
                  <div className="previewItem">
                    <img src={runtime.prints.outputBackDataUrl} alt="Printed garment result — back" draggable={false} onClick={() => onOpenImage(runtime.prints.outputBackDataUrl!, "Printed garment — back")} />
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Back</div>
                </div>
              )}
              {runtime.prints.outputSideDataUrl && (
                <div style={{ display: "grid", gap: 6, placeItems: "center" }}>
                  <div className="previewItem">
                    <img src={runtime.prints.outputSideDataUrl} alt="Printed garment result — side" draggable={false} onClick={() => onOpenImage(runtime.prints.outputSideDataUrl!, "Printed garment — side")} />
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>Side</div>
                </div>
              )}
            </div>

            <div className="resultImageButtons">
              {runtime.prints.outputFrontDataUrl && (
                <a className="btn btnGhost iconButton" style={{ width: 170 }} href={runtime.prints.outputFrontDataUrl} download={`printed-garment-front-${Date.now()}.${mimeToExtension(runtime.prints.outputFrontMimeType)}`} aria-label="Download printed garment front">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                  &nbsp;&nbsp;Download front
                </a>
              )}
              {runtime.prints.outputBackDataUrl && (
                <a className="btn btnGhost iconButton" style={{ width: 170 }} href={runtime.prints.outputBackDataUrl} download={`printed-garment-back-${Date.now()}.${mimeToExtension(runtime.prints.outputBackMimeType)}`} aria-label="Download printed garment back">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                  &nbsp;&nbsp;Download back
                </a>
              )}
              {runtime.prints.outputSideDataUrl && (
                <a className="btn btnGhost iconButton" style={{ width: 170 }} href={runtime.prints.outputSideDataUrl} download={`printed-garment-side-${Date.now()}.${mimeToExtension(runtime.prints.outputSideMimeType)}`} aria-label="Download printed garment side">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v10" /><path d="M8 11l4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></svg>
                  &nbsp;&nbsp;Download side
                </a>
              )}
              <button type="button" className="btn btnGhost iconButton" style={{ width: 110 }} onClick={onSave} disabled={isBusy || !hasPrintedOutputs} aria-label="Save printed garments">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" /></svg>
                &nbsp;&nbsp;Save all
              </button>
              <button type="button" className="btnGhost iconButton" onClick={() => hasPrintedOutputs && onOpenImage(primaryPrintedOutput, "Printed garment")} disabled={!hasPrintedOutputs} aria-label="Open printed garment" title="Open">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 10 5 5" /><path d="M5 8V5H8" /><path d="M14 10 19 5" /><path d="M16 5h3v3" /><path d="M10 14 5 19" /><path d="M5 16v3h3" /><path d="M14 14 19 19" /><path d="M16 19h3v-3" />
                </svg>
              </button>
              <button type="button" className="btnGhost iconButton" onClick={() => setRetryOpen((v) => !v)} aria-expanded={retryOpen} aria-label="Retry printed garment" title="Retry">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
              </button>
            </div>

            {retryOpen && (
              <div style={{ marginTop: 14 }}>
                <FieldLabel htmlFor="printRetryComments" label="Retry Comments" info="Optional notes for what to improve on this retry." />
                <input id="printRetryComments" className="control" type="text" value={retryComments} onChange={(e) => setRetryComments(e.target.value)} placeholder="What improvements would you like?" />
                <div className="actions" style={{ marginTop: 12, justifyContent: "flex-end" }}>
                  <button type="button" className="btnPrimary" onClick={handleRetry} disabled={isBusy}>Generate</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
