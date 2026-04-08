import { useState, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import DeleteStoryboardModal from "./components/DeleteStoryboardModal";
import FieldLabel from "./components/FieldLabel";
import ImageModal from "./components/ImageModal";
import StoryboardLibrary from "./components/StoryboardLibrary";
import StoryboardEditorHeader from "./components/StoryboardEditorHeader";
import StoryboardFormCards from "./components/StoryboardFormCards";
import StoryboardResultsPane from "./components/StoryboardResultsPane";
import PrintsTab from "./components/PrintsTab";
import Toast, { type ToastItem } from "./components/Toast";
import SavedImagesPane from "./components/SavedImagesPane";
import MultiAngleTab from "./components/MultiAngleTab";
import AssetsTab from "./components/AssetsTab";

import { base64ToBytes, dataUrlToInlineImage, generateImage } from "./lib/gemini";
import {
  footwearPresetKeywordsByValue,
  footwearPresetLabelByValue,
  modelStylingPresetLabelByValue,
  modelPosePresetLabelByValue,
  occasionPresetLabelByValue,
  stylePresetLabelByValue,
} from "./lib/presets";
import { dataUrlToBlob, fileToDataUrl, normalizeHexColor, nowIso, parseTags as parseLocalTags } from "./lib/utils";
import { deleteSavedImage, listSavedImages, saveImageRecord, type SavedImageRecord } from "./lib/indexeddb";
import {
  createStoryboardRecord,
  loadActiveStoryboardIdFromLocalStorage,
  loadStoryboardsFromLocalStorage,
  saveActiveStoryboardIdToLocalStorage,
  saveStoryboardsToLocalStorage,
  type StoryboardConfig,
  type StoryboardRecord,
} from "./lib/storyboards";
import {
  applyFreeformOverrides,
  buildCompositePrompt,
  buildGarmentReferencePrompt,
  buildMultiAnglePrompt,
  buildPrintApplicationPrompt,
  buildRetryCompositePrompt,
  generateFinalPrompt,
  planLookFromGarment,
  type LookPlan,
} from "./lib/pipeline";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryboardAnglesRuntime = {
  generating: boolean;
  error: string | null;
  sideDataUrl: string | null;
  sideMimeType: string | null;
  backDataUrl: string | null;
  backMimeType: string | null;
  timingsMs: { side: number; back: number; total: number } | null;
};

type StoryboardPrintsRuntime = {
  baseGarmentFrontDataUrl: string | null;
  baseGarmentFrontFileName: string | null;
  baseGarmentBackDataUrl: string | null;
  baseGarmentBackFileName: string | null;
  baseGarmentSideDataUrl: string | null;
  baseGarmentSideFileName: string | null;
  printDesignFrontDataUrl: string | null;
  printDesignFrontFileName: string | null;
  printDesignBackDataUrl: string | null;
  printDesignBackFileName: string | null;
  printDesignSideDataUrl: string | null;
  printDesignSideFileName: string | null;
  outputFrontDataUrl: string | null;
  outputFrontMimeType: string | null;
  outputBackDataUrl: string | null;
  outputBackMimeType: string | null;
  outputSideDataUrl: string | null;
  outputSideMimeType: string | null;
  generating: boolean;
  error: string | null;
  timingsMs: number | null;
};

type StoryboardRuntime = {
  garmentDataUrls: string[];
  garmentFileNames: string[];
  backgroundDataUrls: string[];
  backgroundFileNames: string[];
  modelDataUrls: string[];
  modelFileNames: string[];
  poseDataUrls: string[];
  poseFileNames: string[];
  garmentRefDataUrl: string | null;
  garmentRefMimeType: string | null;
  lastPlan: LookPlan | null;
  lastFinalPrompt: string | null;
  prints: StoryboardPrintsRuntime;
  angles: StoryboardAnglesRuntime;
  generateError: string | null;
  chosenSummary: any;
  debugSummary: any;
  resultDataUrl: string | null;
  resultMimeType: string | null;
  resultTimingsMs: Record<string, number> | null;
};

type AppTab = "prints" | "generate" | "assets" | "saved" | "multiangle";
type SavedImageView = SavedImageRecord & { url: string };

// ─── Pure helpers (outside component) ────────────────────────────────────────

/**
 * Canvas-composites a design image onto a garment image.
 * The design is placed in the printable area (center-upper region) using multiply blend.
 */
function compositeDesignOnGarment(garmentDataUrl: string, designDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) { reject(new Error("Canvas not supported")); return; }

    const garmentImg = new Image();
    garmentImg.onload = () => {
      canvas.width = garmentImg.naturalWidth || 800;
      canvas.height = garmentImg.naturalHeight || 1000;

      // White background so multiply blend works correctly on transparent PNGs
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(garmentImg, 0, 0);

      const designImg = new Image();
      designImg.onload = () => {
        // Printable area: centered horizontally, upper-mid region vertically
        const areaX = canvas.width * 0.2;
        const areaY = canvas.height * 0.15;
        const areaW = canvas.width * 0.6;
        const areaH = canvas.height * 0.5;

        // Fit design inside area while preserving aspect ratio
        const designAR = designImg.naturalWidth / designImg.naturalHeight;
        const areaAR = areaW / areaH;
        let dw = areaW, dh = areaH;
        if (designAR > areaAR) { dh = areaW / designAR; } else { dw = areaH * designAR; }
        const dx = areaX + (areaW - dw) / 2;
        const dy = areaY + (areaH - dh) / 2;

        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(designImg, dx, dy, dw, dh);
        ctx.globalCompositeOperation = "source-over";

        resolve(canvas.toDataURL("image/png"));
      };
      designImg.onerror = () => reject(new Error("Failed to load design image"));
      designImg.src = designDataUrl;
    };
    garmentImg.onerror = () => reject(new Error("Failed to load garment image"));
    garmentImg.src = garmentDataUrl;
  });
}

const GENERATION_STEPS = [
  "Getting all the configurations",
  "Thinking",
  "Compositing a scene",
  "Generating image",
] as const;

const ACTIVE_TAB_KEY = "esg_active_tab_v1";

function createDefaultAnglesRuntime(): StoryboardAnglesRuntime {
  return { generating: false, error: null, sideDataUrl: null, sideMimeType: null, backDataUrl: null, backMimeType: null, timingsMs: null };
}

function createDefaultPrintsRuntime(): StoryboardPrintsRuntime {
  return {
    baseGarmentFrontDataUrl: null, baseGarmentFrontFileName: null,
    baseGarmentBackDataUrl: null, baseGarmentBackFileName: null,
    baseGarmentSideDataUrl: null, baseGarmentSideFileName: null,
    printDesignFrontDataUrl: null, printDesignFrontFileName: null,
    printDesignBackDataUrl: null, printDesignBackFileName: null,
    printDesignSideDataUrl: null, printDesignSideFileName: null,
    outputFrontDataUrl: null, outputFrontMimeType: null,
    outputBackDataUrl: null, outputBackMimeType: null,
    outputSideDataUrl: null, outputSideMimeType: null,
    generating: false, error: null, timingsMs: null,
  };
}

function createDefaultRuntime(): StoryboardRuntime {
  return {
    garmentDataUrls: [], garmentFileNames: [],
    backgroundDataUrls: [], backgroundFileNames: [],
    modelDataUrls: [], modelFileNames: [],
    poseDataUrls: [], poseFileNames: [],
    garmentRefDataUrl: null, garmentRefMimeType: null,
    lastPlan: null, lastFinalPrompt: null,
    prints: createDefaultPrintsRuntime(),
    angles: createDefaultAnglesRuntime(),
    generateError: null, chosenSummary: null, debugSummary: null,
    resultDataUrl: null, resultMimeType: null, resultTimingsMs: null,
  };
}

function mimeToExtension(mimeType: string | null): string {
  const mt = (mimeType || "").toLowerCase().trim();
  if (mt.includes("png")) return "png";
  if (mt.includes("webp")) return "webp";
  if (mt.includes("jpeg") || mt.includes("jpg")) return "jpg";
  return "png";
}

function formatDurationMs(ms: number | null | undefined): string {
  const safe = typeof ms === "number" && Number.isFinite(ms) ? ms : 0;
  const seconds = safe / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const wholeMinutes = Math.floor(seconds / 60);
  return `${wholeMinutes}m ${Math.round(seconds - wholeMinutes * 60)}s`;
}

function computeTimingsMs(timings: Record<string, number>) {
  const textLlmMs = (timings.plan ?? 0) + (timings.final_prompt ?? 0);
  const imageGenMs = (timings.garment_reference ?? 0) + (timings.composite ?? 0);
  return { textLlmMs, imageGenMs, totalMs: textLlmMs + imageGenMs };
}

function combinePresetAndCustom(opts: { presetText: string; customText: string; joiner?: string }): string {
  const p = (opts.presetText || "").trim();
  const c = (opts.customText || "").trim();
  if (!p) return c;
  if (!c) return p;
  return `${p}${opts.joiner ?? ", "}${c}`;
}

function combineBottomWear(preset: string, details: string, isCustom: boolean): string {
  const p = (preset || "").trim();
  const d = (details || "").trim();
  if (isCustom) return d;
  if (!p) return d;
  if (!d) return p;
  if (d.toLowerCase().includes(p.toLowerCase())) return d;
  return `${d} ${p}`.trim();
}

function createColorSwatchDataUrl(hexColor: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");
  ctx.fillStyle = hexColor;
  ctx.fillRect(0, 0, 96, 96);
  return canvas.toDataURL("image/png");
}

function formatStoryboardTimestamp(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function formatSavedTimestamp(ms: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function safeClone<T>(value: T): T {
  if (value === null || value === undefined) return value;
  try { return structuredClone(value); } catch {
    try { return JSON.parse(JSON.stringify(value)) as T; } catch { return value; }
  }
}

function createThumbnail(dataUrl: string, width = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = width / img.width;
      canvas.width = width;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href; a.download = filename; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}

function formatKind(kind: string): string {
  if (kind === "asset-background") return "Background";
  if (kind === "asset-model") return "Model";
  return (kind || "").replace(/_/g, " ").trim();
}

function uniqueTitle(base: string, storyboards: StoryboardRecord[]): string {
  const cleanedBase = (base || "").trim() || "Mood Board";
  const existing = new Set(storyboards.map((sb) => sb.title.trim().toLowerCase()).filter(Boolean));
  if (!existing.has(cleanedBase.toLowerCase())) return cleanedBase;
  let n = 2;
  while (existing.has(`${cleanedBase} ${n}`.toLowerCase())) n += 1;
  return `${cleanedBase} ${n}`;
}

function storyboardSubtitle(sb: StoryboardRecord): string {
  const cfg = sb.config;
  const parts: string[] = [];
  if (sb.garmentType?.trim()) parts.push(`Garment: ${sb.garmentType.trim()}`);

  const occasionPresetLabel = cfg.occasionPreset && cfg.occasionPreset !== "custom"
    ? occasionPresetLabelByValue[cfg.occasionPreset] ?? cfg.occasionPreset : "";
  const occasion = cfg.occasionPreset === "custom"
    ? cfg.occasionDetails.trim()
    : combinePresetAndCustom({ presetText: occasionPresetLabel, customText: cfg.occasionDetails, joiner: ", " });
  if (occasion) parts.push(`Occasion: ${occasion}`);

  // color scheme removed

  const stylePresetText = cfg.stylePreset && cfg.stylePreset !== "custom"
    ? stylePresetLabelByValue[cfg.stylePreset] ?? cfg.stylePreset : "";
  const styleKeywords = cfg.stylePreset === "custom"
    ? cfg.styleKeywordsDetails.trim()
    : combinePresetAndCustom({ presetText: stylePresetText, customText: cfg.styleKeywordsDetails, joiner: ", " });
  if (styleKeywords) parts.push(`Style: ${styleKeywords}`);

  const bgTheme = cfg.backgroundThemePreset === "custom"
    ? cfg.backgroundThemeDetails.trim()
    : combinePresetAndCustom({ presetText: cfg.backgroundThemePreset, customText: cfg.backgroundThemeDetails, joiner: ", " });
  if (bgTheme) parts.push(`BG: ${bgTheme}`);

  if (cfg.accessories.trim()) parts.push(`Accessories: ${cfg.accessories.trim()}`);

  const bottomWear = combineBottomWear(cfg.bottomWearPreset, cfg.bottomWearDetails, cfg.bottomWearPreset === "custom");
  if (bottomWear) parts.push(`Bottom wear: ${bottomWear}`);

  const footwearPresetLabel = cfg.footwearPreset && cfg.footwearPreset !== "custom"
    ? footwearPresetLabelByValue[cfg.footwearPreset] ?? cfg.footwearPreset : "";
  const footwear = cfg.footwearPreset === "custom"
    ? cfg.footwearDetails.trim()
    : combinePresetAndCustom({ presetText: footwearPresetLabel, customText: cfg.footwearDetails, joiner: ", " });
  if (footwear) parts.push(`Footwear: ${footwear}`);

  const ethnicity = cfg.modelPreset === "custom"
    ? cfg.modelDetails.trim()
    : combinePresetAndCustom({ presetText: cfg.modelPreset, customText: cfg.modelDetails, joiner: ", " });
  if (ethnicity) parts.push(`Model: ${ethnicity}`);

  const modelPosePresetLabel = cfg.modelPosePreset && cfg.modelPosePreset !== "custom"
    ? modelPosePresetLabelByValue[cfg.modelPosePreset] ?? cfg.modelPosePreset : "";
  const modelPose = cfg.modelPosePreset === "custom"
    ? cfg.modelPoseDetails.trim()
    : combinePresetAndCustom({ presetText: modelPosePresetLabel, customText: cfg.modelPoseDetails, joiner: ", " });
  if (modelPose) parts.push(`Pose: ${modelPose}`);

  const stylingPresetText = cfg.modelStylingPreset && cfg.modelStylingPreset !== "custom"
    ? modelStylingPresetLabelByValue[cfg.modelStylingPreset] ?? cfg.modelStylingPreset : "";
  const styling = cfg.modelStylingPreset === "custom"
    ? cfg.modelStylingNotes.trim()
    : combinePresetAndCustom({ presetText: stylingPresetText, customText: cfg.modelStylingNotes, joiner: ", " });
  if (styling) parts.push(`Styling: ${styling}`);

  return parts.join("\n") || "No settings yet";
}

// ─── App component ─────────────────────────────────────────────────────────

export default function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [generateView, setGenerateView] = useState<"library" | "editor">("library");

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const stored = localStorage.getItem(ACTIVE_TAB_KEY) as AppTab | null;
    return stored === "prints" || stored === "generate" || stored === "assets" || stored === "saved"
      ? stored : "prints";
  });

  const [storyboards, setStoryboards] = useState<StoryboardRecord[]>(() => {
    const loaded = loadStoryboardsFromLocalStorage();
    const ensured = loaded.length ? loaded : [createStoryboardRecord({ title: "Mood Board 1" })];
    try { saveStoryboardsToLocalStorage(ensured); } catch {}
    return ensured;
  });

  const [activeStoryboardId, setActiveStoryboardId] = useState<string>(() => {
    const loaded = loadStoryboardsFromLocalStorage();
    const ensured = loaded.length ? loaded : [createStoryboardRecord({ title: "Mood Board 1" })];
    const savedActive = loadActiveStoryboardIdFromLocalStorage();
    const id = savedActive && ensured.some((sb) => sb.id === savedActive) ? savedActive : ensured[0]!.id;
    try { saveActiveStoryboardIdToLocalStorage(id); } catch {}
    return id;
  });

  const [storyboardRuntime, setStoryboardRuntime] = useState<Record<string, StoryboardRuntime>>(() => {
    const loaded = loadStoryboardsFromLocalStorage();
    const ensured = loaded.length ? loaded : [createStoryboardRecord({ title: "Mood Board 1" })];
    return Object.fromEntries(ensured.map((sb) => [sb.id, createDefaultRuntime()]));
  });

  const [deleteStoryboardModalOpen, setDeleteStoryboardModalOpen] = useState(false);
  const [imageModal, setImageModal] = useState<{ src: string; title: string; alt: string } | null>(null);
  const [savedImages, setSavedImages] = useState<SavedImageView[]>([]);
  const [saveToast, setSaveToast] = useState({ visible: false, message: "" });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  function showToast(message: string, type: ToastItem["type"] = "success") {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function removeToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepIndex, setGenerationStepIndex] = useState(0);
  const [generationElapsedMs, setGenerationElapsedMs] = useState(0);
  const [printGenerationElapsedMs, setPrintGenerationElapsedMs] = useState(0);

  // ── Refs (timers, non-reactive values) ────────────────────────────────────
  const generationIntervalRef = useRef<number | null>(null);
  const printIntervalRef = useRef<number | null>(null);
  const sbSaveTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const imageModalRef = useRef(imageModal);
  imageModalRef.current = imageModal;
  const savedImagesRef = useRef<SavedImageView[]>([]);
  savedImagesRef.current = savedImages;

  // ── Derived state ─────────────────────────────────────────────────────────
  const activeStoryboard = useMemo(
    () => storyboards.find((sb) => sb.id === activeStoryboardId) ?? storyboards[0]!,
    [storyboards, activeStoryboardId],
  );
  const activeConfig = activeStoryboard.config;
  const activeRuntime = storyboardRuntime[activeStoryboardId] ?? createDefaultRuntime();

  const computedTimings = useMemo(
    () => computeTimingsMs(activeRuntime.resultTimingsMs || {}),
    [activeRuntime.resultTimingsMs],
  );

  const savedPrints = useMemo(() => savedImages.filter((img) => img.kind === "prints"), [savedImages]);

  // Map storyboard ID → most recent saved "main" image URL (for persistent preview)
  const savedPreviewByStoryboardId = useMemo(() => {
    const map: Record<string, string> = {};
    for (const img of [...savedImages].reverse()) {
      if (img.kind === "main" && img.storyboardId) map[img.storyboardId] = img.url;
    }
    return map;
  }, [savedImages]);
  const assetImages = useMemo(() => savedImages.filter((img) => img.kind?.startsWith("asset-")), [savedImages]);
  const backgroundAssetImages = useMemo(() => savedImages.filter((img) => img.kind === "asset-background"), [savedImages]);
  const modelAssetImages = useMemo(() => savedImages.filter((img) => img.kind === "asset-model"), [savedImages]);
  const poseAssetImages = useMemo(() => savedImages.filter((img) => img.kind === "asset-pose"), [savedImages]);

  const activeTabLabel =
    activeTab === "prints" ? "Add Prints"
    : activeTab === "assets" ? "Uploaded Assets"
    : activeTab === "saved" ? "Saved images"
    : activeTab === "multiangle" ? "Multi Angle"
    : "Generate Images";

  // ── Derived computed values used in generation ────────────────────────────
  const occasionFinal = activeConfig.occasionPreset === "custom"
    ? activeConfig.occasionDetails.trim()
    : combinePresetAndCustom({ presetText: activeConfig.occasionPreset, customText: activeConfig.occasionDetails, joiner: ", " });

  const footwearFinal = activeConfig.footwearPreset === "custom"
    ? activeConfig.footwearDetails.trim()
    : combinePresetAndCustom({
        presetText: footwearPresetKeywordsByValue[activeConfig.footwearPreset] ?? activeConfig.footwearPreset,
        customText: activeConfig.footwearDetails, joiner: ", ",
      });

  const bottomWearFinal = combineBottomWear(
    activeConfig.bottomWearPreset, activeConfig.bottomWearDetails, activeConfig.bottomWearPreset === "custom",
  );

  const styleKeywordsFinal = activeConfig.stylePreset === "custom"
    ? activeConfig.styleKeywordsDetails.trim()
    : combinePresetAndCustom({
        presetText: activeConfig.stylePreset && activeConfig.stylePreset !== "custom" ? activeConfig.stylePreset : "",
        customText: activeConfig.styleKeywordsDetails, joiner: ", ",
      });

  const backgroundThemeFinal = activeConfig.backgroundThemePreset === "custom"
    ? activeConfig.backgroundThemeDetails.trim()
    : combinePresetAndCustom({ presetText: activeConfig.backgroundThemePreset, customText: activeConfig.backgroundThemeDetails, joiner: ", " });

  const modelEthnicityFinal = activeConfig.modelPreset === "custom"
    ? activeConfig.modelDetails.trim()
    : combinePresetAndCustom({ presetText: activeConfig.modelPreset, customText: activeConfig.modelDetails, joiner: ", " });

  const modelPoseFinal = activeConfig.modelPosePreset === "custom"
    ? activeConfig.modelPoseDetails.trim()
    : combinePresetAndCustom({ presetText: activeConfig.modelPosePreset, customText: activeConfig.modelPoseDetails, joiner: ", " });

  const modelStylingNotesFinal = activeConfig.modelStylingPreset === "custom"
    ? activeConfig.modelStylingNotes.trim()
    : combinePresetAndCustom({
        presetText: activeConfig.modelStylingPreset && activeConfig.modelStylingPreset !== "custom" ? activeConfig.modelStylingPreset : "",
        customText: activeConfig.modelStylingNotes, joiner: ", ",
      });

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    saveActiveStoryboardIdToLocalStorage(activeStoryboardId);
  }, [activeStoryboardId]);

  useEffect(() => {
    if (sbSaveTimerRef.current) window.clearTimeout(sbSaveTimerRef.current);
    sbSaveTimerRef.current = window.setTimeout(() => {
      try { saveStoryboardsToLocalStorage(storyboards); } catch {}
    }, 250);
  }, [storyboards]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && imageModalRef.current) setImageModal(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    loadSavedImagesFromDb().catch((err) => console.warn("Failed to load saved images.", err));
    return () => {
      for (const img of savedImagesRef.current) URL.revokeObjectURL(img.url);
      if (generationIntervalRef.current) window.clearInterval(generationIntervalRef.current);
      if (printIntervalRef.current) window.clearInterval(printIntervalRef.current);
      if (sbSaveTimerRef.current) window.clearTimeout(sbSaveTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Runtime updaters ──────────────────────────────────────────────────────
  function updateRuntime(id: string, updates: Partial<StoryboardRuntime>) {
    setStoryboardRuntime((prev) => ({ ...prev, [id]: { ...prev[id]!, ...updates } }));
  }
  function updatePrints(id: string, updates: Partial<StoryboardPrintsRuntime>) {
    setStoryboardRuntime((prev) => ({
      ...prev, [id]: { ...prev[id]!, prints: { ...prev[id]!.prints, ...updates } },
    }));
  }
  function updateAngles(id: string, updates: Partial<StoryboardAnglesRuntime>) {
    setStoryboardRuntime((prev) => ({
      ...prev, [id]: { ...prev[id]!, angles: { ...prev[id]!.angles, ...updates } },
    }));
  }

  // ── Storyboard management ─────────────────────────────────────────────────
  function handleConfigUpdate(updates: Partial<StoryboardConfig>) {
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === activeStoryboardId
          ? { ...sb, config: { ...sb.config, ...updates }, updatedAt: nowIso() }
          : sb,
      ),
    );
  }

  function handleTitleChange(value: string) {
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === activeStoryboardId ? { ...sb, title: value, updatedAt: nowIso() } : sb,
      ),
    );
  }

  function handleGarmentTypeChange(value: string) {
    setStoryboards((prev) =>
      prev.map((sb) =>
        sb.id === activeStoryboardId ? { ...sb, garmentType: value, updatedAt: nowIso() } : sb,
      ),
    );
  }

  function openStoryboard(id: string) {
    if (isGenerating) return;
    setActiveStoryboardId(id);
    setGenerateView("editor");
  }

  function enterStoryboardLibrary() {
    if (isGenerating) return;
    setGenerateView("library");
  }

  function createNewStoryboard() {
    setStoryboards((prev) => {
      const sb = createStoryboardRecord({ title: uniqueTitle(`Mood Board ${prev.length + 1}`, prev) });
      setStoryboardRuntime((r) => ({ ...r, [sb.id]: createDefaultRuntime() }));
      setActiveStoryboardId(sb.id);
      setGenerateView("editor");
      return [sb, ...prev];
    });
  }

  function duplicateActiveStoryboard() {
    setStoryboards((prev) => {
      const src = prev.find((sb) => sb.id === activeStoryboardId) ?? prev[0]!;
      const dst = createStoryboardRecord({ title: uniqueTitle(`${src.title} (copy)`, prev), garmentType: src.garmentType, config: { ...src.config } });
      const srcRuntime = storyboardRuntime[src.id] ?? createDefaultRuntime();
      setStoryboardRuntime((r) => ({
        ...r,
        [dst.id]: {
          ...createDefaultRuntime(),
          garmentDataUrls: [...srcRuntime.garmentDataUrls],
          garmentFileNames: [...srcRuntime.garmentFileNames],
          backgroundDataUrls: [...srcRuntime.backgroundDataUrls],
          backgroundFileNames: [...srcRuntime.backgroundFileNames],
          modelDataUrls: [...srcRuntime.modelDataUrls],
          modelFileNames: [...srcRuntime.modelFileNames],
          poseDataUrls: [...srcRuntime.poseDataUrls],
          poseFileNames: [...srcRuntime.poseFileNames],
          garmentRefDataUrl: srcRuntime.garmentRefDataUrl,
          garmentRefMimeType: srcRuntime.garmentRefMimeType,
          lastPlan: srcRuntime.lastPlan ? safeClone(srcRuntime.lastPlan) : null,
          lastFinalPrompt: srcRuntime.lastFinalPrompt,
          prints: safeClone(srcRuntime.prints),
          angles: {
            ...createDefaultAnglesRuntime(),
            sideDataUrl: srcRuntime.angles.sideDataUrl,
            sideMimeType: srcRuntime.angles.sideMimeType,
            backDataUrl: srcRuntime.angles.backDataUrl,
            backMimeType: srcRuntime.angles.backMimeType,
            timingsMs: srcRuntime.angles.timingsMs ? { ...srcRuntime.angles.timingsMs } : null,
          },
          chosenSummary: safeClone(srcRuntime.chosenSummary),
          debugSummary: safeClone(srcRuntime.debugSummary),
          resultDataUrl: srcRuntime.resultDataUrl,
          resultMimeType: srcRuntime.resultMimeType,
          resultTimingsMs: srcRuntime.resultTimingsMs ? { ...srcRuntime.resultTimingsMs } : null,
        },
      }));
      setActiveStoryboardId(dst.id);
      return [dst, ...prev];
    });
  }

  function requestDeleteActiveStoryboard() {
    if (storyboards.length <= 1) return;
    setDeleteStoryboardModalOpen(true);
  }

  function confirmDeleteActiveStoryboard() {
    if (storyboards.length <= 1) { setDeleteStoryboardModalOpen(false); return; }
    setStoryboards((prev) => {
      const idx = prev.findIndex((sb) => sb.id === activeStoryboardId);
      const next = [...prev];
      next.splice(idx, 1);
      const nextActive = next[Math.max(0, idx - 1)] ?? next[0];
      if (nextActive) setActiveStoryboardId(nextActive.id);
      setStoryboardRuntime((r) => {
        const nr = { ...r };
        delete nr[activeStoryboardId];
        return nr;
      });
      return next;
    });
    setDeleteStoryboardModalOpen(false);
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openImageModal(src: string | null | undefined, title: string, alt?: string) {
    if (!src) return;
    setImageModal({ src, title, alt: alt ?? title });
  }

  // ── Save toast ─────────────────────────────────────────────────────────────
  function showSaveToast(message: string) {
    setSaveToast({ visible: true, message });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setSaveToast((t) => ({ ...t, visible: false })), 2200);
  }

  // ── Saved images ───────────────────────────────────────────────────────────
  function toSavedImageView(record: SavedImageRecord): SavedImageView {
    return { ...record, url: URL.createObjectURL(record.blob) };
  }

  async function loadSavedImagesFromDb() {
    const records = await listSavedImages();
    setSavedImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.url);
      return records.map(toSavedImageView);
    });
  }

  async function deleteImage(id: string) {
    if (!confirm("Are you sure you want to delete this image?")) return;
    try {
      await deleteSavedImage(id);
      setSavedImages((prev) => {
        const idx = prev.findIndex((img) => img.id === id);
        if (idx === -1) return prev;
        URL.revokeObjectURL(prev[idx]!.url);
        return prev.filter((_, i) => i !== idx);
      });
    } catch (e) {
      console.error("Failed to delete image", e);
    }
  }

  async function saveImageToLibrary(opts: {
    dataUrl: string; mimeType: string | null; title: string; kind: string; fileName?: string; notify?: boolean;
  }) {
    const parsed = dataUrlToBlob(opts.dataUrl);
    const record = await saveImageRecord({
      title: opts.title, kind: opts.kind,
      mimeType: opts.mimeType || parsed.mimeType,
      fileName: opts.fileName,
      storyboardId: activeStoryboardId,
      storyboardTitle: activeStoryboard.title,
      blob: parsed.blob,
      createdAt: Date.now(),
    });
    setSavedImages((prev) => [toSavedImageView(record), ...prev]);
    if (opts.notify !== false) showSaveToast("Saved to library.");
  }

  // ── Garment / background / model file handlers ────────────────────────────
  function removeGarmentImage(index: number) {
    const sbId = activeStoryboardId;
    setStoryboardRuntime((prev) => {
      const rt = prev[sbId]!;
      const urls = rt.garmentDataUrls.filter((_, i) => i !== index);
      const names = rt.garmentFileNames.filter((_, i) => i !== index);
      return { ...prev, [sbId]: { ...rt, garmentDataUrls: urls, garmentFileNames: names } };
    });
  }

  function removeBackgroundImage(index: number) {
    const sbId = activeStoryboardId;
    setStoryboardRuntime((prev) => {
      const rt = prev[sbId]!;
      const urls = rt.backgroundDataUrls.filter((_, i) => i !== index);
      const names = rt.backgroundFileNames.filter((_, i) => i !== index);
      return { ...prev, [sbId]: { ...rt, backgroundDataUrls: urls, backgroundFileNames: names } };
    });
  }

  function removeModelImage(index: number) {
    const sbId = activeStoryboardId;
    setStoryboardRuntime((prev) => {
      const rt = prev[sbId]!;
      const urls = rt.modelDataUrls.filter((_, i) => i !== index);
      const names = rt.modelFileNames.filter((_, i) => i !== index);
      return { ...prev, [sbId]: { ...rt, modelDataUrls: urls, modelFileNames: names } };
    });
  }

  function removePoseImage(index: number) {
    const sbId = activeStoryboardId;
    setStoryboardRuntime((prev) => {
      const rt = prev[sbId]!;
      const urls = rt.poseDataUrls.filter((_, i) => i !== index);
      const names = rt.poseFileNames.filter((_, i) => i !== index);
      return { ...prev, [sbId]: { ...rt, poseDataUrls: urls, poseFileNames: names } };
    });
  }

  async function onGarmentFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const files = Array.from(input?.files ?? []);
    if (!files.length) { if (input) input.value = ""; return; }

    updateRuntime(sbId, { generateError: null });

    const rt = storyboardRuntime[sbId];
    const MAX = 4;
    const remaining = Math.max(0, MAX - (rt?.garmentDataUrls.length ?? 0));
    if (!remaining) {
      updateRuntime(sbId, { generateError: "You can upload up to 4 garment photos. Remove one to add more." });
      if (input) input.value = "";
      return;
    }

    const limited = files.slice(0, remaining);
    const dataUrls = await Promise.all(limited.map((f) => fileToDataUrl(f)));
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return {
        ...prev, [sbId]: {
          ...r,
          garmentDataUrls: [...r.garmentDataUrls, ...dataUrls],
          garmentFileNames: [...r.garmentFileNames, ...limited.map((f) => f.name || "garment")],
        },
      };
    });
    if (input) input.value = "";
  }

  async function onBackgroundFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const files = Array.from(input?.files ?? []);
    if (!files.length) { if (input) input.value = ""; return; }

    const rt = storyboardRuntime[sbId];
    const MAX = 4;
    const remaining = Math.max(0, MAX - (rt?.backgroundDataUrls.length ?? 0));
    if (!remaining) { if (input) input.value = ""; return; }

    const limited = files.slice(0, remaining);
    const dataUrls = await Promise.all(limited.map((f) => fileToDataUrl(f)));
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return {
        ...prev, [sbId]: {
          ...r,
          backgroundDataUrls: [...r.backgroundDataUrls, ...dataUrls],
          backgroundFileNames: [...r.backgroundFileNames, ...limited.map((f) => f.name || "background")],
        },
      };
    });

    for (const file of limited) {
      await saveImageRecord({ title: file.name || "Uploaded Background", kind: "asset-background", mimeType: file.type, blob: file, createdAt: Date.now() })
        .then((record) => setSavedImages((prev) => [toSavedImageView(record), ...prev]))
        .catch(console.error);
    }
    if (input) input.value = "";
  }

  async function onModelFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const files = Array.from(input?.files ?? []);
    if (!files.length) { if (input) input.value = ""; return; }

    const rt = storyboardRuntime[sbId];
    const MAX = 4;
    const remaining = Math.max(0, MAX - (rt?.modelDataUrls.length ?? 0));
    if (!remaining) { if (input) input.value = ""; return; }

    const limited = files.slice(0, remaining);
    const dataUrls = await Promise.all(limited.map((f) => fileToDataUrl(f)));
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return {
        ...prev, [sbId]: {
          ...r,
          modelDataUrls: [...r.modelDataUrls, ...dataUrls],
          modelFileNames: [...r.modelFileNames, ...limited.map((f) => f.name || "model")],
        },
      };
    });

    for (const file of limited) {
      await saveImageRecord({ title: file.name || "Uploaded Model", kind: "asset-model", mimeType: file.type, blob: file, createdAt: Date.now() })
        .then((record) => setSavedImages((prev) => [toSavedImageView(record), ...prev]))
        .catch(console.error);
    }
    if (input) input.value = "";
  }

  async function onPoseFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const files = Array.from(input?.files ?? []);
    if (!files.length) { if (input) input.value = ""; return; }

    const rt = storyboardRuntime[sbId];
    const MAX = 4;
    const remaining = Math.max(0, MAX - (rt?.poseDataUrls.length ?? 0));
    if (!remaining) { if (input) input.value = ""; return; }

    const limited = files.slice(0, remaining);
    const dataUrls = await Promise.all(limited.map((f) => fileToDataUrl(f)));
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return {
        ...prev, [sbId]: {
          ...r,
          poseDataUrls: [...r.poseDataUrls, ...dataUrls],
          poseFileNames: [...r.poseFileNames, ...limited.map((f) => f.name || "pose")],
        },
      };
    });

    for (const file of limited) {
      await saveImageRecord({ title: file.name || "Uploaded Pose", kind: "asset-pose", mimeType: file.type, blob: file, createdAt: Date.now() })
        .then((record) => setSavedImages((prev) => [toSavedImageView(record), ...prev]))
        .catch(console.error);
    }
    if (input) input.value = "";
  }

  async function addGarmentFromDataUrl(url: string, fileName: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId];
    if (!rt) return;
    const MAX = 4;
    if (rt.garmentDataUrls.length >= MAX) {
      updateRuntime(sbId, { generateError: "You can upload up to 4 garment photos. Remove one to add more." });
      return;
    }
    let dataUrl = url;
    if (url.startsWith("blob:")) {
      try {
        const resp = await fetch(url);
        const blob = await resp.blob();
        dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type }));
      } catch { return; }
    }
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return { ...prev, [sbId]: { ...r, garmentDataUrls: [...r.garmentDataUrls, dataUrl], garmentFileNames: [...r.garmentFileNames, fileName], generateError: null } };
    });
  }

  async function addBackgroundFromDataUrl(url: string, fileName: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId];
    if (!rt || rt.backgroundDataUrls.length >= 4) return;
    let dataUrl = url;
    if (url.startsWith("blob:")) {
      try { const resp = await fetch(url); const blob = await resp.blob(); dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type })); } catch { return; }
    }
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return { ...prev, [sbId]: { ...r, backgroundDataUrls: [...r.backgroundDataUrls, dataUrl], backgroundFileNames: [...r.backgroundFileNames, fileName] } };
    });
  }

  async function addModelFromDataUrl(url: string, fileName: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId];
    if (!rt || rt.modelDataUrls.length >= 4) return;
    let dataUrl = url;
    if (url.startsWith("blob:")) {
      try { const resp = await fetch(url); const blob = await resp.blob(); dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type })); } catch { return; }
    }
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return { ...prev, [sbId]: { ...r, modelDataUrls: [...r.modelDataUrls, dataUrl], modelFileNames: [...r.modelFileNames, fileName] } };
    });
  }

  async function addPoseFromDataUrl(url: string, fileName: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId];
    if (!rt || rt.poseDataUrls.length >= 4) return;
    let dataUrl = url;
    if (url.startsWith("blob:")) {
      try { const resp = await fetch(url); const blob = await resp.blob(); dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type })); } catch { return; }
    }
    setStoryboardRuntime((prev) => {
      const r = prev[sbId]!;
      return { ...prev, [sbId]: { ...r, poseDataUrls: [...r.poseDataUrls, dataUrl], poseFileNames: [...r.poseFileNames, fileName] } };
    });
  }

  // ── Prints handlers ────────────────────────────────────────────────────────
  function resetPrintOutputs(sbId: string) {
    updatePrints(sbId, {
      outputFrontDataUrl: null, outputFrontMimeType: null,
      outputBackDataUrl: null, outputBackMimeType: null,
      outputSideDataUrl: null, outputSideMimeType: null,
      timingsMs: null,
    });
  }

  async function onPrintBaseGarmentFrontFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    updatePrints(sbId, { baseGarmentFrontFileName: file.name || "base-garment-front", baseGarmentFrontDataUrl: await fileToDataUrl(file) });
    resetPrintOutputs(sbId);
    if (input) input.value = "";
  }

  async function onPrintBaseGarmentBackFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    updatePrints(sbId, { baseGarmentBackFileName: file.name || "base-garment-back", baseGarmentBackDataUrl: await fileToDataUrl(file) });
    resetPrintOutputs(sbId);
    if (input) input.value = "";
  }

  async function onPrintBaseGarmentSideFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    updatePrints(sbId, { baseGarmentSideFileName: file.name || "base-garment-side", baseGarmentSideDataUrl: await fileToDataUrl(file) });
    resetPrintOutputs(sbId);
    if (input) input.value = "";
  }

  async function onPrintDesignFrontFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    const designDataUrl = await fileToDataUrl(file);
    updatePrints(sbId, { printDesignFrontFileName: file.name, printDesignFrontDataUrl: designDataUrl });
    if (input) input.value = "";
    const rt = storyboardRuntime[sbId]!;
    if (rt.prints.baseGarmentFrontDataUrl) {
      try {
        const out = await compositeDesignOnGarment(rt.prints.baseGarmentFrontDataUrl, designDataUrl);
        updatePrints(sbId, { outputFrontDataUrl: out, outputFrontMimeType: "image/png" });
      } catch { /* ignore */ }
    }
  }

  async function onPrintDesignBackFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    const designDataUrl = await fileToDataUrl(file);
    updatePrints(sbId, { printDesignBackFileName: file.name, printDesignBackDataUrl: designDataUrl });
    if (input) input.value = "";
    const rt = storyboardRuntime[sbId]!;
    if (rt.prints.baseGarmentBackDataUrl) {
      try {
        const out = await compositeDesignOnGarment(rt.prints.baseGarmentBackDataUrl, designDataUrl);
        updatePrints(sbId, { outputBackDataUrl: out, outputBackMimeType: "image/png" });
      } catch { /* ignore */ }
    }
  }

  async function onPrintDesignSideFileChange(e: ChangeEvent<HTMLInputElement>) {
    const sbId = activeStoryboardId;
    const input = e.target;
    const file = input?.files?.[0] ?? null;
    updatePrints(sbId, { error: null });
    if (!file) { if (input) input.value = ""; return; }
    const designDataUrl = await fileToDataUrl(file);
    updatePrints(sbId, { printDesignSideFileName: file.name, printDesignSideDataUrl: designDataUrl });
    if (input) input.value = "";
    const rt = storyboardRuntime[sbId]!;
    if (rt.prints.baseGarmentSideDataUrl) {
      try {
        const out = await compositeDesignOnGarment(rt.prints.baseGarmentSideDataUrl, designDataUrl);
        updatePrints(sbId, { outputSideDataUrl: out, outputSideMimeType: "image/png" });
      } catch { /* ignore */ }
    }
  }

  function removePrintBaseGarmentFront() {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { baseGarmentFrontDataUrl: null, baseGarmentFrontFileName: null, error: null });
    resetPrintOutputs(sbId);
  }
  function removePrintBaseGarmentBack() {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { baseGarmentBackDataUrl: null, baseGarmentBackFileName: null, error: null });
    resetPrintOutputs(sbId);
  }
  function removePrintBaseGarmentSide() {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { baseGarmentSideDataUrl: null, baseGarmentSideFileName: null, error: null });
    resetPrintOutputs(sbId);
  }
  function removePrintDesignFront() {
    updatePrints(activeStoryboardId, { printDesignFrontDataUrl: null, printDesignFrontFileName: null, outputFrontDataUrl: null, outputFrontMimeType: null, error: null });
  }
  function removePrintDesignBack() {
    updatePrints(activeStoryboardId, { printDesignBackDataUrl: null, printDesignBackFileName: null, outputBackDataUrl: null, outputBackMimeType: null, error: null });
  }
  function removePrintDesignSide() {
    updatePrints(activeStoryboardId, { printDesignSideDataUrl: null, printDesignSideFileName: null, outputSideDataUrl: null, outputSideMimeType: null, error: null });
  }

  async function loadBuiltInGarmentFront(url: string) {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { error: null });
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const fileName = url.split("/").pop() || "garment-front";
      const dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type }));
      updatePrints(sbId, { baseGarmentFrontDataUrl: dataUrl, baseGarmentFrontFileName: fileName });
      resetPrintOutputs(sbId);
    } catch { updatePrints(sbId, { error: "Failed to load built-in template." }); }
  }

  async function loadBuiltInGarmentBack(url: string) {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { error: null });
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const fileName = url.split("/").pop() || "garment-back";
      const dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type }));
      updatePrints(sbId, { baseGarmentBackDataUrl: dataUrl, baseGarmentBackFileName: fileName });
      resetPrintOutputs(sbId);
    } catch { updatePrints(sbId, { error: "Failed to load built-in template." }); }
  }

  async function loadBuiltInGarmentSide(url: string) {
    const sbId = activeStoryboardId;
    updatePrints(sbId, { error: null });
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const fileName = url.split("/").pop() || "garment-side";
      const dataUrl = await fileToDataUrl(new File([blob], fileName, { type: blob.type }));
      updatePrints(sbId, { baseGarmentSideDataUrl: dataUrl, baseGarmentSideFileName: fileName });
      resetPrintOutputs(sbId);
    } catch { updatePrints(sbId, { error: "Failed to load built-in template." }); }
  }

  function startPrintTimer() {
    if (printIntervalRef.current) window.clearInterval(printIntervalRef.current);
    const t0 = performance.now();
    setPrintGenerationElapsedMs(0);
    printIntervalRef.current = window.setInterval(() => setPrintGenerationElapsedMs(performance.now() - t0), 100);
  }
  function stopPrintTimer() {
    if (printIntervalRef.current) { window.clearInterval(printIntervalRef.current); printIntervalRef.current = null; }
  }

  async function generatePrintedGarment(retryComment?: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId]!;
    updatePrints(sbId, { error: null });

    const isFullCloth = activeConfig.printGarmentCategory === "Saree" || activeConfig.printGarmentCategory === "Dhoti";

    if (!rt.prints.baseGarmentFrontDataUrl) { updatePrints(sbId, { error: "Please upload a front view white garment photo." }); return; }
    if (!isFullCloth && !rt.prints.baseGarmentBackDataUrl) { updatePrints(sbId, { error: "Please upload a back view white garment photo." }); return; }

    const printInputKind = activeConfig.printInputKind;
    const printColorHex = printInputKind === "color" ? normalizeHexColor(activeConfig.printColorHex || "") : null;
    if (printInputKind === "color") {
      if (!printColorHex) { updatePrints(sbId, { error: "Please enter a hex color (e.g. #FF3366)." }); return; }
    } else if (!rt.prints.printDesignFrontDataUrl && !rt.prints.printDesignBackDataUrl && !rt.prints.printDesignSideDataUrl) {
      updatePrints(sbId, { error: "Please upload at least one print design (front, back, or side)." }); return;
    }

    updatePrints(sbId, { generating: true });
    resetPrintOutputs(sbId);
    startPrintTimer();

    try {
      const colorSwatch = printInputKind === "color" ? createColorSwatchDataUrl(printColorHex!) : null;
      const prompt = buildPrintApplicationPrompt({
        additionalPrompt: activeConfig.printAdditionalPrompt || "",
        ...(typeof retryComment === "string" ? { retryComment } : {}),
        ...(printColorHex ? { colorHex: printColorHex } : {}),
      });

      const t0 = performance.now();
      const promises: Promise<any>[] = [];
      const keys: string[] = [];

      const frontDesign = colorSwatch ?? rt.prints.printDesignFrontDataUrl;
      const backDesign = colorSwatch ?? rt.prints.printDesignBackDataUrl;
      const sideDesign = colorSwatch ?? rt.prints.printDesignSideDataUrl;

      if (rt.prints.baseGarmentFrontDataUrl && frontDesign) {
        promises.push(generateImage({ model: "gemini-3-pro-image-preview", promptText: prompt, images: [dataUrlToInlineImage(rt.prints.baseGarmentFrontDataUrl), dataUrlToInlineImage(frontDesign)], timeoutMs: 180000 }));
        keys.push("front");
      }
      if (!isFullCloth && rt.prints.baseGarmentBackDataUrl && backDesign) {
        promises.push(generateImage({ model: "gemini-3-pro-image-preview", promptText: prompt, images: [dataUrlToInlineImage(rt.prints.baseGarmentBackDataUrl), dataUrlToInlineImage(backDesign)], timeoutMs: 180000 }));
        keys.push("back");
      }
      if (!isFullCloth && rt.prints.baseGarmentSideDataUrl && sideDesign) {
        promises.push(generateImage({ model: "gemini-3-pro-image-preview", promptText: prompt, images: [dataUrlToInlineImage(rt.prints.baseGarmentSideDataUrl), dataUrlToInlineImage(sideDesign)], timeoutMs: 180000 }));
        keys.push("side");
      }

      const results = await Promise.all(promises);
      const outputUpdates: Partial<StoryboardPrintsRuntime> & { timingsMs?: number } = {};
      results.forEach((res, i) => {
        if (keys[i] === "front") { outputUpdates.outputFrontMimeType = res.mimeType; outputUpdates.outputFrontDataUrl = `data:${res.mimeType};base64,${res.imageBase64}`; }
        if (keys[i] === "back") { outputUpdates.outputBackMimeType = res.mimeType; outputUpdates.outputBackDataUrl = `data:${res.mimeType};base64,${res.imageBase64}`; }
        if (keys[i] === "side") { outputUpdates.outputSideMimeType = res.mimeType; outputUpdates.outputSideDataUrl = `data:${res.mimeType};base64,${res.imageBase64}`; }
      });
      outputUpdates.timingsMs = Math.round(performance.now() - t0);
      updatePrints(sbId, outputUpdates);
      showToast("Print generation complete! Your designs are ready.", "success");
    } catch (err: any) {
      updatePrints(sbId, { error: err?.message || String(err) });
      showToast("Print generation failed. Please try again.", "error");
    } finally {
      updatePrints(sbId, { generating: false });
      stopPrintTimer();
    }
  }

  async function retryPrintedGarment(retryComment: string) {
    return generatePrintedGarment(retryComment);
  }

  async function savePrintedGarment() {
    const rt = activeRuntime;
    const sbTitle = activeStoryboard.title;
    if (!rt.prints.outputFrontDataUrl) {
      updatePrints(activeStoryboardId, { error: "Generate the printed garments first." }); return;
    }
    try {
      const ts = Date.now();
      const savePromises = [];
      if (rt.prints.outputFrontDataUrl) savePromises.push(saveImageToLibrary({ dataUrl: rt.prints.outputFrontDataUrl, mimeType: rt.prints.outputFrontMimeType, title: `Printed garment (front) — ${sbTitle}`, kind: "prints", fileName: `printed-garment-front-${ts}.${mimeToExtension(rt.prints.outputFrontMimeType)}`, notify: false }));
      if (rt.prints.outputBackDataUrl) savePromises.push(saveImageToLibrary({ dataUrl: rt.prints.outputBackDataUrl, mimeType: rt.prints.outputBackMimeType, title: `Printed garment (back) — ${sbTitle}`, kind: "prints", fileName: `printed-garment-back-${ts}.${mimeToExtension(rt.prints.outputBackMimeType)}`, notify: false }));
      if (rt.prints.outputSideDataUrl) savePromises.push(saveImageToLibrary({ dataUrl: rt.prints.outputSideDataUrl, mimeType: rt.prints.outputSideMimeType, title: `Printed garment (side) — ${sbTitle}`, kind: "prints", fileName: `printed-garment-side-${ts}.${mimeToExtension(rt.prints.outputSideMimeType)}`, notify: false }));
      
      await Promise.all(savePromises);
      showSaveToast(`Saved ${savePromises.length} printed garment${savePromises.length > 1 ? 's' : ''}.`);
    } catch (err: any) {
      updatePrints(activeStoryboardId, { error: err?.message || String(err) });
    }
  }

  // ── Main image generation ─────────────────────────────────────────────────
  function startGenerationTimer() {
    if (generationIntervalRef.current) window.clearInterval(generationIntervalRef.current);
    const t0 = performance.now();
    setGenerationElapsedMs(0);
    generationIntervalRef.current = window.setInterval(() => setGenerationElapsedMs(performance.now() - t0), 100);
  }
  function stopGenerationTimer() {
    if (generationIntervalRef.current) { window.clearInterval(generationIntervalRef.current); generationIntervalRef.current = null; }
  }

  async function onGenerateLook() {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId]!;

    updateRuntime(sbId, {
      generateError: null, garmentRefDataUrl: null, garmentRefMimeType: null,
      lastPlan: null, lastFinalPrompt: null, angles: createDefaultAnglesRuntime(),
      chosenSummary: null, debugSummary: null, resultDataUrl: null, resultMimeType: null, resultTimingsMs: null,
    });

    if (!rt.garmentDataUrls.length) { updateRuntime(sbId, { generateError: "Please select garment photos." }); return; }

    setIsGenerating(true);
    setGenerationStepIndex(0);
    startGenerationTimer();

    try {
      setGenerationStepIndex(1);

      const userOverrides = {
        occasion: occasionFinal || null,
        background_theme: backgroundThemeFinal || null,
        footwear: footwearFinal || null,
        model_ethnicity: modelEthnicityFinal || null,
        model_pose: modelPoseFinal || null,
        model_styling_notes: modelStylingNotesFinal || null,
      };

      const baseStyleKeywords = styleKeywordsFinal ? parseLocalTags(styleKeywordsFinal) : [];
      const bw = bottomWearFinal.trim();
      const styleKeywords = bw ? [...baseStyleKeywords, bw] : baseStyleKeywords;
      const accessories = activeConfig.accessories.trim() ? parseLocalTags(activeConfig.accessories) : [];
      const modelRefDataUrl = rt.modelDataUrls[0] || null;
      const poseRefDataUrl = rt.poseDataUrls[0] || null;
      const backgroundRefDataUrl = rt.backgroundDataUrls[0] || null;
      const hasModelReference = Boolean(modelRefDataUrl);
      const hasPoseReference = Boolean(poseRefDataUrl);
      const hasBackgroundReference = Boolean(backgroundRefDataUrl);

      const garmentImages = rt.garmentDataUrls.map((src) => dataUrlToInlineImage(src));
      const timings: Record<string, number> = {};
      const debug: Record<string, unknown> = {};
      let planError: string | null = null;

      let plan: LookPlan;
      const tPlan0 = performance.now();
      try {
        const planRes = await planLookFromGarment({
          model: "gemini-3-flash-preview", garmentImages, availableBackgroundThemes: [], availableModelEthnicities: [],
          userOverrides, timeoutMs: 120000,
        });
        plan = planRes.plan;
        debug.plan_raw_text = planRes.rawText;
        debug.plan_raw_json = planRes.rawJson;
      } catch (err: any) {
        planError = err?.message || String(err);
        const ov = userOverrides;
        plan = {
          occasion: ov.occasion || "casual", color_scheme: "neutral", print_style: "as-is",
          style_keywords: [], background_theme: ov.background_theme || ov.occasion || "casual",
          footwear: ov.footwear || "", accessories: [],
          negative_prompt: "blurry, low quality, incorrect garment, altered design, wrong print, extra limbs, deformed hands, text overlay, watermark",
          model_ethnicity: ov.model_ethnicity || "", model_pose: ov.model_pose || "", model_styling_notes: ov.model_styling_notes || "",
        };
      }
      timings.plan = Math.round(performance.now() - tPlan0);

      plan = applyFreeformOverrides(plan, {
        styleKeywords: styleKeywords.length ? styleKeywords : undefined,
        accessories: accessories.length ? accessories : undefined,
        footwear: footwearFinal || null,
      });

      const tFp0 = performance.now();
      const finalPromptRes = await generateFinalPrompt({
        model: "gemini-3-flash-preview", plan, background: null, chosenModel: null,
        hasBackgroundReference, hasModelReference, timeoutMs: 120000,
      });
      timings.final_prompt = Math.round(performance.now() - tFp0);
      debug.final_prompt = finalPromptRes.prompt;

      setGenerationStepIndex(2);

      const garmentRefPrompt = buildGarmentReferencePrompt();
      const tGarment0 = performance.now();
      const garmentRef = await generateImage({
        model: "gemini-3-pro-image-preview", promptText: garmentRefPrompt, images: garmentImages,
        aspectRatio: "3:4", width: 1080, height: 1440, timeoutMs: 180000,
      });
      timings.garment_reference = Math.round(performance.now() - tGarment0);
      const garmentRefDataUrl = `data:${garmentRef.mimeType};base64,${garmentRef.imageBase64}`;

      setGenerationStepIndex(3);

      const compositePrompt = buildCompositePrompt({ plan, finalPrompt: finalPromptRes.prompt, hasModelReference, hasPoseReference, hasBackgroundReference });
      debug.composite_prompt = compositePrompt;
      debug.negative_prompt = plan.negative_prompt;

      const tComp0 = performance.now();
      const compositeImages = [
        { mimeType: garmentRef.mimeType, data: base64ToBytes(garmentRef.imageBase64) },
        ...(modelRefDataUrl ? [dataUrlToInlineImage(modelRefDataUrl)] : []),
        ...(poseRefDataUrl ? [dataUrlToInlineImage(poseRefDataUrl)] : []),
        ...(backgroundRefDataUrl ? [dataUrlToInlineImage(backgroundRefDataUrl)] : []),
      ];
      const composite = await generateImage({
        model: "gemini-3-pro-image-preview", promptText: compositePrompt, images: compositeImages,
        aspectRatio: "3:4", width: 1080, height: 1440, timeoutMs: 180000,
      });
      timings.composite = Math.round(performance.now() - tComp0);
      timings.api_total = Object.values(timings).reduce((a, v) => a + (typeof v === "number" ? v : 0), 0);

      const chosenSummary = {
        occasion: plan.occasion, color_scheme: plan.color_scheme, print_style: plan.print_style,
        style_keywords: plan.style_keywords, footwear: plan.footwear, accessories: plan.accessories,
        background_theme: plan.background_theme, model_ethnicity: plan.model_ethnicity, model_pose: plan.model_pose,
      };

      updateRuntime(sbId, {
        lastPlan: safeClone(plan), lastFinalPrompt: finalPromptRes.prompt,
        garmentRefMimeType: garmentRef.mimeType, garmentRefDataUrl,
        resultMimeType: composite.mimeType, resultDataUrl: `data:${composite.mimeType};base64,${composite.imageBase64}`,
        resultTimingsMs: timings, chosenSummary,
        debugSummary: { timings_ms: timings, plan_error: planError, ...debug },
      });
      showToast("Scene generated successfully!", "success");
    } catch (err: any) {
      updateRuntime(sbId, { generateError: err?.message || String(err) });
      showToast("Scene generation failed. Please try again.", "error");
    } finally {
      setIsGenerating(false);
      stopGenerationTimer();
      setGenerationStepIndex(0);
    }
  }

  async function retryMainImage(retryComment: string) {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId]!;
    updateRuntime(sbId, { generateError: null });

    if (!rt.resultDataUrl || !rt.garmentRefDataUrl || !rt.lastPlan || !rt.lastFinalPrompt) {
      updateRuntime(sbId, { generateError: "Generate the main image first, then you can retry." }); return;
    }

    setIsGenerating(true);
    setGenerationStepIndex(3);
    startGenerationTimer();

    try {
      const overrides = {
        occasion: occasionFinal || null,
        background_theme: backgroundThemeFinal || null, footwear: footwearFinal || null,
        model_ethnicity: modelEthnicityFinal || null, model_pose: modelPoseFinal || null,
        model_styling_notes: modelStylingNotesFinal || null,
      };

      let plan = { ...rt.lastPlan };
      if ((overrides.occasion || "").trim()) plan.occasion = overrides.occasion!.trim();
      if ((overrides.background_theme || "").trim()) plan.background_theme = overrides.background_theme!.trim();
      if ((overrides.footwear || "").trim()) plan.footwear = overrides.footwear!.trim();
      if ((overrides.model_ethnicity || "").trim()) plan.model_ethnicity = overrides.model_ethnicity!.trim();
      if ((overrides.model_pose || "").trim()) plan.model_pose = overrides.model_pose!.trim();
      if ((overrides.model_styling_notes || "").trim()) plan.model_styling_notes = overrides.model_styling_notes!.trim();

      const baseStyleKeywords = styleKeywordsFinal ? parseLocalTags(styleKeywordsFinal) : [];
      const bw = bottomWearFinal.trim();
      const styleKeywords = bw ? [...baseStyleKeywords, bw] : baseStyleKeywords;
      const accessories = activeConfig.accessories.trim() ? parseLocalTags(activeConfig.accessories) : [];
      plan = applyFreeformOverrides(plan, {
        styleKeywords: styleKeywords.length ? styleKeywords : undefined,
        accessories: accessories.length ? accessories : undefined,
        footwear: footwearFinal || null,
      });

      const modelRefDataUrl = rt.modelDataUrls[0] || null;
      const backgroundRefDataUrl = rt.backgroundDataUrls[0] || null;
      const hasModelReference = Boolean(modelRefDataUrl);
      const hasBackgroundReference = Boolean(backgroundRefDataUrl);

      const compositePrompt = buildRetryCompositePrompt({
        plan, finalPrompt: rt.lastFinalPrompt, hasModelReference, hasBackgroundReference, retryComment: retryComment || "",
      });

      const t0 = performance.now();
      const compositeImages = [
        dataUrlToInlineImage(rt.garmentRefDataUrl),
        ...(modelRefDataUrl ? [dataUrlToInlineImage(modelRefDataUrl)] : []),
        ...(backgroundRefDataUrl ? [dataUrlToInlineImage(backgroundRefDataUrl)] : []),
      ];
      const composite = await generateImage({
        model: "gemini-3-pro-image-preview", promptText: compositePrompt, images: compositeImages,
        aspectRatio: "3:4", width: 1080, height: 1440, timeoutMs: 180000,
      });
      const ms = Math.round(performance.now() - t0);

      const chosenSummary = {
        occasion: plan.occasion, color_scheme: plan.color_scheme, print_style: plan.print_style,
        style_keywords: plan.style_keywords, footwear: plan.footwear, accessories: plan.accessories,
        background_theme: plan.background_theme, model_ethnicity: plan.model_ethnicity, model_pose: plan.model_pose,
      };

      updateRuntime(sbId, {
        lastPlan: safeClone(plan),
        resultMimeType: composite.mimeType,
        resultDataUrl: `data:${composite.mimeType};base64,${composite.imageBase64}`,
        angles: createDefaultAnglesRuntime(),
        resultTimingsMs: { composite: ms, api_total: ms },
        chosenSummary,
        debugSummary: { timings_ms: { composite: ms, api_total: ms }, retry_comment: retryComment || "", final_prompt: rt.lastFinalPrompt, composite_prompt: compositePrompt, negative_prompt: plan.negative_prompt },
      });

      try {
        const resultUrl = `data:${composite.mimeType};base64,${composite.imageBase64}`;
        const thumb = await createThumbnail(resultUrl);
        setStoryboards((prev) => prev.map((sb) => sb.id === sbId ? { ...sb, previewDataUrl: thumb } : sb));
      } catch { /* thumbnail is optional */ }
    } catch (err: any) {
      updateRuntime(sbId, { generateError: err?.message || String(err) });
    } finally {
      setIsGenerating(false);
      stopGenerationTimer();
      setGenerationStepIndex(0);
    }
  }

  async function generateMultipleAngles() {
    const sbId = activeStoryboardId;
    const rt = storyboardRuntime[sbId]!;
    if (isGenerating || rt.angles.generating) return;
    updateAngles(sbId, { error: null });

    if (!rt.resultDataUrl) { updateAngles(sbId, { error: "Generate the main image first." }); return; }
    if (!rt.garmentRefDataUrl) { updateAngles(sbId, { error: "Missing garment reference. Please generate the main image again." }); return; }
    if (!rt.lastPlan) { updateAngles(sbId, { error: "Missing generation context. Please generate the main image again." }); return; }

    updateAngles(sbId, { generating: true, sideDataUrl: null, sideMimeType: null, backDataUrl: null, backMimeType: null, timingsMs: null });

    try {
      const garmentRefInline = dataUrlToInlineImage(rt.garmentRefDataUrl);
      const mainInline = dataUrlToInlineImage(rt.resultDataUrl);
      const garmentAnglesInline = rt.garmentDataUrls.map((src) => dataUrlToInlineImage(src));
      const modelRefInline = rt.modelDataUrls[0] ? dataUrlToInlineImage(rt.modelDataUrls[0]) : null;
      const backgroundRefInline = rt.backgroundDataUrls[0] ? dataUrlToInlineImage(rt.backgroundDataUrls[0]) : null;

      const referenceImages = [
        garmentRefInline, ...garmentAnglesInline, mainInline,
        ...(modelRefInline ? [modelRefInline] : []),
        ...(backgroundRefInline ? [backgroundRefInline] : []),
      ];
      const promptBase = {
        plan: rt.lastPlan, finalPrompt: rt.lastFinalPrompt || "",
        garmentAngleCount: garmentAnglesInline.length,
        hasModelReference: Boolean(modelRefInline), hasBackgroundReference: Boolean(backgroundRefInline),
      };

      const t0 = performance.now();
      const [sideRes, backRes] = await Promise.all([
        (async () => {
          const t = performance.now();
          const res = await generateImage({ model: "gemini-3-pro-image-preview", promptText: buildMultiAnglePrompt({ ...promptBase, angle: "side" }), images: referenceImages, aspectRatio: "3:4", width: 1080, height: 1440, timeoutMs: 180000 });
          return { res, ms: Math.round(performance.now() - t) };
        })(),
        (async () => {
          const t = performance.now();
          const res = await generateImage({ model: "gemini-3-pro-image-preview", promptText: buildMultiAnglePrompt({ ...promptBase, angle: "back" }), images: referenceImages, aspectRatio: "3:4", width: 1080, height: 1440, timeoutMs: 180000 });
          return { res, ms: Math.round(performance.now() - t) };
        })(),
      ]);

      updateAngles(sbId, {
        sideMimeType: sideRes.res.mimeType, sideDataUrl: `data:${sideRes.res.mimeType};base64,${sideRes.res.imageBase64}`,
        backMimeType: backRes.res.mimeType, backDataUrl: `data:${backRes.res.mimeType};base64,${backRes.res.imageBase64}`,
        timingsMs: { side: sideRes.ms, back: backRes.ms, total: Math.round(performance.now() - t0) },
      });
      showToast("Multi-angle generation complete!", "success");
    } catch (err: any) {
      updateAngles(sbId, { error: err?.message || String(err) });
      showToast("Multi-angle generation failed. Please try again.", "error");
    } finally {
      updateAngles(sbId, { generating: false });
    }
  }

  async function saveMainImage() {
    const rt = activeRuntime;
    if (!rt.resultDataUrl) { updateRuntime(activeStoryboardId, { generateError: "Generate the main image first." }); return; }
    try {
      const ts = Date.now();
      await saveImageToLibrary({
        dataUrl: rt.resultDataUrl, mimeType: rt.resultMimeType,
        title: `Look — ${activeStoryboard.title}`, kind: "main",
        fileName: `look-main-${ts}.${mimeToExtension(rt.resultMimeType)}`,
      });
    } catch (err: any) {
      updateRuntime(activeStoryboardId, { generateError: err?.message || String(err) });
    }
  }

  async function saveAllImages() {
    const rt = activeRuntime;
    if (!rt.resultDataUrl || !rt.angles.sideDataUrl || !rt.angles.backDataUrl) {
      updateAngles(activeStoryboardId, { error: "Generate the main, side, and back images before saving." }); return;
    }
    try {
      const ts = Date.now(); const sbTitle = activeStoryboard.title;
      await Promise.all([
        saveImageToLibrary({ dataUrl: rt.resultDataUrl, mimeType: rt.resultMimeType, title: `Look — ${sbTitle}`, kind: "main", fileName: `look-main-${ts}.${mimeToExtension(rt.resultMimeType)}`, notify: false }),
        saveImageToLibrary({ dataUrl: rt.angles.sideDataUrl, mimeType: rt.angles.sideMimeType, title: `Side view — ${sbTitle}`, kind: "side", fileName: `look-side-${ts}.${mimeToExtension(rt.angles.sideMimeType)}`, notify: false }),
        saveImageToLibrary({ dataUrl: rt.angles.backDataUrl, mimeType: rt.angles.backMimeType, title: `Back view — ${sbTitle}`, kind: "back", fileName: `look-back-${ts}.${mimeToExtension(rt.angles.backMimeType)}`, notify: false }),
      ]);
      showSaveToast("Saved 3 images.");
    } catch (err: any) {
      updateAngles(activeStoryboardId, { error: err?.message || String(err) });
    }
  }

  function downloadAllImages() {
    const rt = activeRuntime;
    if (!rt.resultDataUrl || !rt.angles.sideDataUrl || !rt.angles.backDataUrl) return;
    const ts = Date.now();
    triggerDownload(rt.resultDataUrl, `look-main-${ts}.${mimeToExtension(rt.resultMimeType)}`);
    triggerDownload(rt.angles.sideDataUrl, `look-side-${ts}.${mimeToExtension(rt.angles.sideMimeType)}`);
    triggerDownload(rt.angles.backDataUrl, `look-back-${ts}.${mimeToExtension(rt.angles.backMimeType)}`);
  }

  function onResultImagePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
    el.style.setProperty("--zoom-x", `${x.toFixed(2)}%`);
    el.style.setProperty("--zoom-y", `${y.toFixed(2)}%`);
  }

  function onResultImagePointerLeave(event: React.PointerEvent<HTMLDivElement>) {
    const el = event.currentTarget as HTMLElement;
    el.style.setProperty("--zoom-x", "50%");
    el.style.setProperty("--zoom-y", "50%");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="appRoot">
      <Toast toasts={toasts} onRemove={removeToast} />
      <div
        className={`saveToast${saveToast.visible ? " saveToastVisible" : ""}`}
        role="status" aria-live="polite" aria-hidden={!saveToast.visible}
      >
        {saveToast.message}
      </div>

      <div className="appShell">
        <aside className="sidebar">
          <div className="sidebarBrand">
            <div className="brandEyebrow">The Bot Company</div>
            <div className="brandTitle">BotStudioX</div>
          </div>
          <nav className="sidebarNav" role="tablist" aria-label="Main sections">
            {(["prints", "generate", "multiangle", "saved", "assets"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? "navButton navButtonActive" : "navButton"}
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "prints" ? "Add Prints"
                  : tab === "generate" ? "Generate Images"
                  : tab === "multiangle" ? "Multi Angle"
                  : tab === "saved" ? "Saved images"
                  : "Uploaded Assets"}
              </button>
            ))}
          </nav>
        </aside>

        <main className="mainContent">
          <div className="container">
            <div className="header">
              <h1 className="title titleLarge">{activeTabLabel}</h1>
            </div>

            {activeTab === "prints" && (
              <PrintsTab
                storyboardTitle={activeStoryboard.title}
                config={activeConfig}
                runtime={activeRuntime}
                isBusy={isGenerating || activeRuntime.prints.generating}
                mimeToExtension={mimeToExtension}
                onBaseGarmentFrontFileChange={onPrintBaseGarmentFrontFileChange}
                onBaseGarmentBackFileChange={onPrintBaseGarmentBackFileChange}
                onBaseGarmentSideFileChange={onPrintBaseGarmentSideFileChange}
                onLoadBuiltInFront={loadBuiltInGarmentFront}
                onLoadBuiltInBack={loadBuiltInGarmentBack}
                onLoadBuiltInSide={loadBuiltInGarmentSide}
                onPrintDesignFrontFileChange={onPrintDesignFrontFileChange}
                onPrintDesignBackFileChange={onPrintDesignBackFileChange}
                onPrintDesignSideFileChange={onPrintDesignSideFileChange}
                removeBaseGarmentFront={removePrintBaseGarmentFront}
                removeBaseGarmentBack={removePrintBaseGarmentBack}
                removeBaseGarmentSide={removePrintBaseGarmentSide}
                removePrintDesignFront={removePrintDesignFront}
                removePrintDesignBack={removePrintDesignBack}
                removePrintDesignSide={removePrintDesignSide}
                printElapsedMs={printGenerationElapsedMs}
                onConfigUpdate={handleConfigUpdate}
                onGenerate={() => generatePrintedGarment()}
                onRetry={retryPrintedGarment}
                onSave={savePrintedGarment}
                onOpenImage={(src, title) => openImageModal(src, title, title)}
              />
            )}

            {activeTab === "generate" && (
              <div>
                {generateView === "library" ? (
                  <StoryboardLibrary
                    storyboards={storyboards}
                    activeId={activeStoryboardId}
                    runtimeById={storyboardRuntime}
                    savedPreviewByStoryboardId={savedPreviewByStoryboardId}
                    isGenerating={isGenerating}
                    subtitleFor={storyboardSubtitle}
                    formatTimestamp={formatStoryboardTimestamp}
                    onCreate={createNewStoryboard}
                    onOpen={openStoryboard}
                  />
                ) : (
                  <div className="storyboardEditorCard">
                    <StoryboardEditorHeader
                      title={activeStoryboard.title}
                      garmentType={activeStoryboard.garmentType ?? ""}
                      updatedAt={activeStoryboard.updatedAt}
                      disabled={isGenerating}
                      canDelete={storyboards.length > 1}
                      formatTimestamp={formatStoryboardTimestamp}
                      onBack={enterStoryboardLibrary}
                      onDuplicate={duplicateActiveStoryboard}
                      onRequestDelete={requestDeleteActiveStoryboard}
                      onTitleChange={handleTitleChange}
                      onGarmentTypeChange={handleGarmentTypeChange}
                    />

                    <div className="divider storyboardEditorDivider" aria-hidden="true" />

                    <div className="storyboardEditorCardBody">
                      <div className="grid storyBoard">
                        <StoryboardFormCards
                          config={activeConfig}
                          runtime={activeRuntime}
                          activeStoryboardId={activeStoryboardId}
                          isGenerating={isGenerating}
                          onGarmentFileChange={onGarmentFileChange}
                          removeGarmentImage={removeGarmentImage}
                          removeBackgroundImage={removeBackgroundImage}
                          removeModelImage={removeModelImage}
                          removePoseImage={removePoseImage}
                          savedPrints={savedPrints}
                          backgroundAssetImages={backgroundAssetImages}
                          modelAssetImages={modelAssetImages}
                          poseAssetImages={poseAssetImages}
                          addGarmentFromDataUrl={addGarmentFromDataUrl}
                          addBackgroundFromDataUrl={addBackgroundFromDataUrl}
                          addModelFromDataUrl={addModelFromDataUrl}
                          addPoseFromDataUrl={addPoseFromDataUrl}
                          onConfigUpdate={handleConfigUpdate}
                          onSubmit={onGenerateLook}
                          onOpenImage={openImageModal}
                        />

                        <StoryboardResultsPane
                          isGenerating={isGenerating}
                          generationStepIndex={generationStepIndex}
                          generationElapsedMs={generationElapsedMs}
                          generationSteps={GENERATION_STEPS}
                          runtime={activeRuntime}
                          computedTimings={computedTimings}
                          formatDurationMs={formatDurationMs}
                          mimeToExtension={mimeToExtension}
                          onResultImagePointerMove={onResultImagePointerMove}
                          onResultImagePointerLeave={onResultImagePointerLeave}
                          onOpenImage={openImageModal}
                          onSaveImage={saveMainImage}
                          onRetry={retryMainImage}
                          onGenerateAngles={generateMultipleAngles}
                          onDownloadAll={downloadAllImages}
                          onSaveAll={saveAllImages}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "saved" && (
              <SavedImagesPane
                images={savedImages}
                formatTimestamp={formatSavedTimestamp}
                mimeToExtension={mimeToExtension}
                onOpenImage={openImageModal}
                onDeleteImage={deleteImage}
              />
            )}

            {activeTab === "assets" && (
              <AssetsTab
                activeStoryboardTitle={activeStoryboard.title}
                activeRuntime={activeRuntime}
                savedImages={assetImages}
                formatTimestamp={formatSavedTimestamp}
                mimeToExtension={mimeToExtension}
                onBackgroundFileChange={onBackgroundFileChange}
                onModelFileChange={onModelFileChange}
                onPoseFileChange={onPoseFileChange}
                removeBackgroundImage={removeBackgroundImage}
                removeModelImage={removeModelImage}
                removePoseImage={removePoseImage}
                onOpenImage={openImageModal}
                onDeleteImage={deleteImage}
              />
            )}

            {activeTab === "multiangle" && <MultiAngleTab />}
          </div>
        </main>
      </div>

      <ImageModal
        open={Boolean(imageModal)}
        src={imageModal?.src || ""}
        title={imageModal?.title || ""}
        alt={imageModal?.alt}
        onClose={() => setImageModal(null)}
      />
      <DeleteStoryboardModal
        open={deleteStoryboardModalOpen}
        title={activeStoryboard.title}
        onClose={() => setDeleteStoryboardModalOpen(false)}
        onConfirm={confirmDeleteActiveStoryboard}
      />
    </div>
  );
}
