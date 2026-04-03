import { useState, useMemo } from "react";
import FieldLabel from "./FieldLabel";
import PillRadioGroup from "./PillRadioGroup";
import type { StoryboardConfig } from "../lib/storyboards";
import { modelTemplates, type ModelTemplate } from "../lib/modelLibrary";
import { backgroundTemplates, type BackgroundTemplate } from "../lib/backgroundLibrary";
import {
  backgroundThemeOptions,
  footwearPresetOptions,
  modelEthnicityOptions,
  modelPosePresetOptions,
  modelStylingPresetOptions,
  occasionPresetOptions,
} from "../lib/presets";

type RuntimeLite = {
  garmentDataUrls: string[];
  garmentFileNames: string[];
  backgroundDataUrls: string[];
  modelDataUrls: string[];
  generateError: string | null;
  chosenSummary: any;
  debugSummary: any;
};

type SavedPrint = { id: string; url: string; title: string; fileName?: string };

const bottomWearPresetOptions = [
  { value: "", label: "Auto" },
  { value: "bell bottom", label: "Bell bottom" },
  { value: "pleated pants", label: "Pleated pants" },
  { value: "skirts", label: "Skirts" },
  { value: "shorts", label: "Shorts" },
  { value: "skorts", label: "Skorts" },
  { value: "denim jeans wide", label: "Denim jeans wide" },
  { value: "custom", label: "Custom" },
];

const accessoriesPresetOptions = [
  { value: "studs", label: "Studs" },
  { value: "resin bracelets", label: "Resin bracelets" },
  { value: "earrings", label: "Earrings" },
  { value: "chunky gold earrings", label: "Chunky gold earrings" },
  { value: "chunky silver earrings", label: "Chunky silver earrings" },
  { value: "handbag clutch", label: "Handbag clutch" },
  { value: "sunglasses", label: "Sunglasses" },
];

function normalizeToken(v: string) {
  return (v || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function parseTokenList(raw: string): string[] {
  return (raw || "").split(/[;,]/g).map((p) => p.trim()).filter(Boolean);
}

interface StoryboardFormCardsProps {
  config: StoryboardConfig;
  onConfigUpdate: (updates: Partial<StoryboardConfig>) => void;
  runtime: RuntimeLite;
  activeStoryboardId: string;
  isGenerating: boolean;
  onGarmentFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeGarmentImage: (idx: number) => void;
  removeBackgroundImage: (idx: number) => void;
  removeModelImage: (idx: number) => void;
  savedPrints: SavedPrint[];
  backgroundAssetImages: SavedPrint[];
  modelAssetImages: SavedPrint[];
  addGarmentFromDataUrl: (url: string, fileName: string) => void;
  addBackgroundFromDataUrl: (url: string, fileName: string) => void;
  addModelFromDataUrl: (url: string, fileName: string) => void;
  onSubmit: () => void;
  onOpenImage: (src: string, title: string, alt?: string) => void;
}

export default function StoryboardFormCards({
  config,
  onConfigUpdate,
  runtime,
  activeStoryboardId,
  isGenerating,
  onGarmentFileChange,
  removeGarmentImage,
  removeBackgroundImage,
  removeModelImage,
  savedPrints,
  backgroundAssetImages,
  modelAssetImages,
  addGarmentFromDataUrl,
  addBackgroundFromDataUrl,
  addModelFromDataUrl,
  onSubmit,
  onOpenImage,
}: StoryboardFormCardsProps) {
  const [showSavedPrints, setShowSavedPrints] = useState(false);
  const [showSavedBackgrounds, setShowSavedBackgrounds] = useState(false);
  const [showSavedModels, setShowSavedModels] = useState(false);
  const [modelTab, setModelTab] = useState<"template" | "custom">("template");
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [bgTab, setBgTab] = useState<"template" | "custom">("template");
  const [isLoadingBgTemplate, setIsLoadingBgTemplate] = useState(false);

  const bgTemplatesByCategory = useMemo(() => {
    const map = new Map<string, BackgroundTemplate[]>();
    for (const t of backgroundTemplates) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, []);

  const handleSelectBgTemplate = async (tmpl: BackgroundTemplate) => {
    if (!tmpl.url) {
      alert("This template is currently a placeholder and pending generation due to API limits. It will be available later!");
      return;
    }
    setIsLoadingBgTemplate(true);
    try {
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const fullUrl = baseUrl + tmpl.url;
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        addBackgroundFromDataUrl(b64, `bg_template_${tmpl.id}.png`);
        
        onConfigUpdate({
          backgroundThemePreset: tmpl.themePreset,
          backgroundThemeDetails: tmpl.themeDetails
        });
      };
      reader.readAsDataURL(blob);
    } catch(e) {
      console.error("Failed to load background template", e);
      alert("Failed to load template background. Please try again.");
    } finally {
      setIsLoadingBgTemplate(false);
    }
  };

  const templatesByCategory = useMemo(() => {
    const map = new Map<string, ModelTemplate[]>();
    for (const t of modelTemplates) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, []);

  const handleSelectTemplate = async (tmpl: ModelTemplate) => {
    setIsLoadingTemplate(true);
    try {
      const baseUrl = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
      const fullUrl = baseUrl + tmpl.url;
      const res = await fetch(fullUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        addModelFromDataUrl(b64, `template_${tmpl.id}.png`);
        
        onConfigUpdate({
          modelPreset: "custom",
          modelDetails: tmpl.ethnicityKeyword
        });
      };
      reader.readAsDataURL(blob);
    } catch(e) {
      console.error("Failed to load template", e);
      alert("Failed to load template model. Please try again.");
    } finally {
      setIsLoadingTemplate(false);
    }
  };

  // Accessories checkbox logic
  const accessoriesSelected = useMemo<string[]>(() => {
    const rawTokens = parseTokenList(config.accessories);
    const canonicalByNorm = new Map(accessoriesPresetOptions.map((o) => [normalizeToken(o.value), o.value]));
    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of rawTokens) {
      const norm = normalizeToken(t);
      const canonical = canonicalByNorm.get(norm) ?? t.trim();
      const key = normalizeToken(canonical);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(canonical);
    }
    return out;
  }, [config.accessories]);

  function handleAccessoryToggle(value: string, checked: boolean) {
    const current = new Map(accessoriesSelected.map((v) => [normalizeToken(v), v]));
    if (checked) {
      current.set(normalizeToken(value), value);
    } else {
      current.delete(normalizeToken(value));
    }
    onConfigUpdate({ accessories: Array.from(current.values()).join(", ") });
  }

  return (
    <form className="storyboardForm" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <fieldset className="formFieldset" disabled={isGenerating}>
        <div className="storyboardCards">
          {/* ── Garment Photos ── */}
          <div className="parameterSection">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Garment photos</div>
            <div>
              <FieldLabel htmlFor="garmentPhoto" label="Photos" info="Upload 1–4 photos of the SAME garment." />
              <input id="garmentPhoto" type="file" accept="image/*" multiple onChange={onGarmentFileChange} />
            </div>

            {runtime.garmentDataUrls.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label>Garment preview</label>
                <div className="preview previewGarments">
                  {runtime.garmentDataUrls.map((src, idx) => (
                    <div key={`${activeStoryboardId}-${idx}`} className="previewItem">
                      <img src={src} alt={`Garment angle ${idx + 1}`} draggable={false} onClick={() => onOpenImage(src, "Garment angle")} />
                      <button type="button" className="removePreviewButton" onClick={() => removeGarmentImage(idx)} aria-label={`Remove garment image ${idx + 1}`} title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                {runtime.garmentDataUrls.length < 3 && (
                  <div className="muted" style={{ marginTop: 8 }}>Tip: upload 3–4 angles (front/side/back) for better accuracy.</div>
                )}
              </div>
            )}

            <div className="chooseFromPrints" style={{ marginTop: 16 }}>
              <button type="button" className="toggle-assets-btn" onClick={() => setShowSavedPrints((v) => !v)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showSavedPrints ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                <span>Choose from Printed Garments</span>
              </button>
              {showSavedPrints && savedPrints.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label>Saved Prints</label>
                  <div className="preview previewGarments">
                    {savedPrints.map((print, idx) => (
                      <div key={print.id} className="previewItem" onClick={() => addGarmentFromDataUrl(print.url, print.fileName || `print-${idx}.png`)} title="Click to add as garment">
                        <img src={print.url} alt={print.title} draggable={false} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {showSavedPrints && !savedPrints.length && (
                <div className="muted" style={{ marginTop: 8 }}>No saved prints found. Go to "Add Prints" to generate some.</div>
              )}
            </div>
          </div>

          {/* ── Creative Direction ── */}
          <div className="parameterSection">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Creative Direction</div>

            <div>
              <FieldLabel label="Occasion" info="Sets the vibe for styling and scene." />
              <PillRadioGroup name="occasion" value={config.occasionPreset} options={occasionPresetOptions} onChange={(v) => onConfigUpdate({ occasionPreset: v })} />
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.occasionDetails} onChange={(e) => onConfigUpdate({ occasionDetails: e.target.value })} placeholder="Optional: add details or type a custom occasion" />
            </div>

            <div style={{ height: 40 }} />

            <div>
              <FieldLabel label="Color scheme" info="Overall color palette for the scene." />
              <input className="control" type="text" value={config.colorScheme} onChange={(e) => onConfigUpdate({ colorScheme: e.target.value })} placeholder="e.g. red & white, pastel, neutral, monochrome" />
              <div style={{ height: 40 }} />
              <FieldLabel label="Accessories" info="Optional add-ons." />
              <div className="pillGroup" role="group" aria-label="Accessories presets" style={{ marginTop: 8 }}>
                {accessoriesPresetOptions.map((opt) => (
                  <label key={opt.value} className="pill">
                    <input type="checkbox" value={opt.value} checked={accessoriesSelected.some((s) => normalizeToken(s) === normalizeToken(opt.value))} onChange={(e) => handleAccessoryToggle(opt.value, e.target.checked)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.accessories} onChange={(e) => onConfigUpdate({ accessories: e.target.value })} placeholder="Optional: add custom accessories (comma separated)" />
            </div>

            <div style={{ height: 40 }} />

            <div>
              <FieldLabel label="Footwear" info="Choose footwear and optionally add details." />
              <PillRadioGroup name="footwear" value={config.footwearPreset} options={footwearPresetOptions} onChange={(v) => onConfigUpdate({ footwearPreset: v })} />
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.footwearDetails} onChange={(e) => onConfigUpdate({ footwearDetails: e.target.value })} placeholder="Optional: add details (e.g., white sneakers, nude heels)" />
            </div>

            <div style={{ height: 40 }} />

            <div>
              <FieldLabel label="Bottom Wear" info="Choose a bottom-wear pairing." />
              <PillRadioGroup name="bottomWear" value={config.bottomWearPreset} options={bottomWearPresetOptions} onChange={(v) => onConfigUpdate({ bottomWearPreset: v })} />
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.bottomWearDetails} onChange={(e) => onConfigUpdate({ bottomWearDetails: e.target.value })} placeholder="Optional: add details or type a custom bottom wear" />
            </div>
          </div>

          {/* ── Background ── */}
          <div className="parameterSection">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Background</div>
            
            <div className="pillGroup" role="group" aria-label="Background Reference Type" style={{ marginBottom: 16 }}>
              <label className="pill">
                <input type="radio" value="template" checked={bgTab === "template"} onChange={() => setBgTab("template")} />
                <span>Template Backgrounds</span>
              </label>
              <label className="pill">
                <input type="radio" value="custom" checked={bgTab === "custom"} onChange={() => setBgTab("custom")} />
                <span>Custom Backgrounds</span>
              </label>
            </div>

            {bgTab === "template" && (
              <div className="templateModelsSection" style={{ marginBottom: 24, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ marginBottom: 16 }} className="muted">Choose a pre-built background. It will automatically set your scene environment.</div>
                {Array.from(bgTemplatesByCategory.entries()).map(([cat, templates]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.6)" }}>{cat}</div>
                    <div className="preview previewAssets">
                      {templates.map(tmpl => (
                        <div key={tmpl.id} className="previewItem" style={{ cursor: tmpl.url ? "pointer" : "not-allowed", opacity: tmpl.url ? 1 : 0.4 }} onClick={() => handleSelectBgTemplate(tmpl)} title={tmpl.label}>
                          {tmpl.url ? (
                            <img src={(import.meta.env.BASE_URL || "/").replace(/\/$/, '') + tmpl.url} alt={tmpl.label} draggable={false} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", background: "#333", color: "#888", textAlign: "center" }}>
                              {tmpl.label}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {isLoadingBgTemplate && <div className="muted" style={{ marginTop: 8 }}>Loading template...</div>}
              </div>
            )}

            {bgTab === "custom" && (
              <div className="customModelSection" style={{ marginBottom: 24, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div>
                  <FieldLabel label="Background theme" info="Describes the environment you want." />
                  <PillRadioGroup name="backgroundTheme" value={config.backgroundThemePreset} options={backgroundThemeOptions} onChange={(v) => onConfigUpdate({ backgroundThemePreset: v })} />
                  <div style={{ height: 14 }} />
                  <input className="control" type="text" value={config.backgroundThemeDetails} onChange={(e) => onConfigUpdate({ backgroundThemeDetails: e.target.value })} placeholder="Optional: add details (lighting, location, props)" />
                </div>

                <div className="chooseFromAssets" style={{ marginTop: 16 }}>
                  <button type="button" className="toggle-assets-btn" onClick={() => setShowSavedBackgrounds((v) => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showSavedBackgrounds ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>Choose from Uploaded Backgrounds</span>
                  </button>
                  {showSavedBackgrounds && backgroundAssetImages.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <label>Saved Backgrounds</label>
                      <div className="preview previewAssets">
                        {backgroundAssetImages.map((asset, idx) => (
                          <div key={asset.id} className="previewItem" onClick={() => addBackgroundFromDataUrl(asset.url, asset.fileName || `bg-asset-${idx}.png`)} title="Click to add as background">
                            <img src={asset.url} alt={asset.title} draggable={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showSavedBackgrounds && !backgroundAssetImages.length && (
                    <div className="muted" style={{ marginTop: 8 }}>No uploaded backgrounds found. Go to "Uploaded Assets" to add some.</div>
                  )}
                </div>
              </div>
            )}

            {runtime.backgroundDataUrls.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label>Selected Background Reference</label>
                <div className="preview previewAssets">
                  {runtime.backgroundDataUrls.map((src, idx) => (
                    <div key={`${activeStoryboardId}-bg-ref-${idx}`} className="previewItem">
                      <img src={src} alt={`Background reference ${idx + 1}`} draggable={false} onClick={() => onOpenImage(src, "Background reference", "Background reference")} />
                      <button type="button" className="removePreviewButton" onClick={() => removeBackgroundImage(idx)} aria-label={`Remove background image ${idx + 1}`} title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Model ── */}
          <div className="parameterSection">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Model Person</div>
            
            <div className="pillGroup" role="group" aria-label="Model Reference Type" style={{ marginBottom: 16 }}>
              <label className="pill">
                <input type="radio" value="template" checked={modelTab === "template"} onChange={() => setModelTab("template")} />
                <span>Template Models</span>
              </label>
              <label className="pill">
                <input type="radio" value="custom" checked={modelTab === "custom"} onChange={() => setModelTab("custom")} />
                <span>Custom Models</span>
              </label>
            </div>

            {modelTab === "template" && (
              <div className="templateModelsSection" style={{ marginBottom: 24, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div style={{ marginBottom: 16 }} className="muted">Choose a pre-built character. We will generate the look on this exact person.</div>
                {Array.from(templatesByCategory.entries()).map(([cat, templates]) => (
                  <div key={cat} style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.6)" }}>{cat}</div>
                    <div className="preview previewAssets">
                      {templates.map(tmpl => (
                        <div key={tmpl.id} className="previewItem" style={{ cursor: "pointer" }} onClick={() => handleSelectTemplate(tmpl)} title={tmpl.label}>
                          <img src={(import.meta.env.BASE_URL || "/").replace(/\/$/, '') + tmpl.url} alt={tmpl.label} draggable={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {isLoadingTemplate && <div className="muted" style={{ marginTop: 8 }}>Loading template...</div>}
              </div>
            )}

            {modelTab === "custom" && (
              <div className="customModelSection" style={{ marginBottom: 24, padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "8px" }}>
                <div>
                  <FieldLabel label="Model Preference" info="Use this to bias the generated model (ethnicity / vibe)." />
                  <PillRadioGroup name="modelPreference" value={config.modelPreset} options={modelEthnicityOptions} onChange={(v) => onConfigUpdate({ modelPreset: v })} />
                  <div style={{ height: 14 }} />
                  <input className="control" type="text" value={config.modelDetails} onChange={(e) => onConfigUpdate({ modelDetails: e.target.value })} placeholder="Optional: add model description (ethnicity, vibe, etc.)" />
                </div>

                <div className="chooseFromAssets" style={{ marginTop: 16 }}>
                  <button type="button" className="toggle-assets-btn" onClick={() => setShowSavedModels((v) => !v)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showSavedModels ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <span>Choose from Uploaded Models</span>
                  </button>
                  {showSavedModels && modelAssetImages.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <label>Saved Models</label>
                      <div className="preview previewAssets">
                        {modelAssetImages.map((asset, idx) => (
                          <div key={asset.id} className="previewItem" onClick={() => addModelFromDataUrl(asset.url, asset.fileName || `model-asset-${idx}.png`)} title="Click to add as model">
                            <img src={asset.url} alt={asset.title} draggable={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {showSavedModels && !modelAssetImages.length && (
                    <div className="muted" style={{ marginTop: 8 }}>No uploaded models found. Go to "Uploaded Assets" to add some.</div>
                  )}
                </div>
              </div>
            )}

            {runtime.modelDataUrls.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <label>Selected Model Reference</label>
                <div className="preview previewAssets">
                  {runtime.modelDataUrls.map((src, idx) => (
                    <div key={`${activeStoryboardId}-model-ref-${idx}`} className="previewItem">
                      <img src={src} alt={`Model reference ${idx + 1}`} draggable={false} onClick={() => onOpenImage(src, "Model reference", "Model reference")} />
                      <button type="button" className="removePreviewButton" onClick={() => removeModelImage(idx)} aria-label={`Remove model image ${idx + 1}`} title="Remove image">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18" /><path d="M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <FieldLabel label="Model pose" info="Choose a natural ecommerce pose." />
              <PillRadioGroup name="modelPose" value={config.modelPosePreset} options={modelPosePresetOptions} onChange={(v) => onConfigUpdate({ modelPosePreset: v })} />
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.modelPoseDetails} onChange={(e) => onConfigUpdate({ modelPoseDetails: e.target.value })} placeholder="Optional: add pose details" />
            </div>

            <div style={{ height: 40 }} />

            <div>
              <FieldLabel label="Model styling notes" info="Pick a preset for hair/makeup/jewelry." />
              <PillRadioGroup name="modelStyling" value={config.modelStylingPreset} options={modelStylingPresetOptions} onChange={(v) => onConfigUpdate({ modelStylingPreset: v })} />
              <div style={{ height: 14 }} />
              <input className="control" type="text" value={config.modelStylingNotes} onChange={(e) => onConfigUpdate({ modelStylingNotes: e.target.value })} placeholder="Optional: add your own notes (hair/makeup/jewelry, vibe)" />
            </div>
          </div>

          {/* ── Generate ── */}
          <div className="parameterSection">
            <div className="sectionTitle" style={{ marginTop: 0 }}>Generate</div>
            <div className="actions">
              <button type="submit" className="btnPrimary" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate look"}
              </button>
              <button
                type="button"
                className="btnGhost"
                aria-pressed={config.includeDebugStr === "yes"}
                disabled={isGenerating}
                onClick={() => onConfigUpdate({ includeDebugStr: config.includeDebugStr === "yes" ? "no" : "yes" })}
                title="Show/hide the internal prompts used for generation."
              >
                {config.includeDebugStr === "yes" ? "Debug off" : "Debug"}
              </button>
            </div>

            {runtime.generateError && <div className="error">{runtime.generateError}</div>}

            {runtime.chosenSummary && (
              <div style={{ marginTop: 12 }}>
                <label>Chosen plan</label>
                <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(runtime.chosenSummary, null, 2)}</pre>
              </div>
            )}

            {runtime.debugSummary && config.includeDebugStr === "yes" && (
              <div style={{ marginTop: 12 }}>
                <label>Prompts</label>
                {runtime.debugSummary.final_prompt && (
                  <div style={{ marginTop: 10 }}>
                    <div className="muted" style={{ marginBottom: 6 }}>Text prompt (LLM output)</div>
                    <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{runtime.debugSummary.final_prompt}</pre>
                  </div>
                )}
                {runtime.debugSummary.composite_prompt && (
                  <div style={{ marginTop: 10 }}>
                    <div className="muted" style={{ marginBottom: 6 }}>Image prompt (composite)</div>
                    <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{runtime.debugSummary.composite_prompt}</pre>
                  </div>
                )}
                {runtime.debugSummary.negative_prompt && (
                  <div style={{ marginTop: 10 }}>
                    <div className="muted" style={{ marginBottom: 6 }}>Avoid</div>
                    <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>{runtime.debugSummary.negative_prompt}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
