import { normalizeHexColor, nowIso, randomId } from "./utils";

// Garment types sourced from PrintsTab (Male + Female combined, unique)
export const GARMENT_TYPES = [
  "T-shirt",
  "Shirt",
  "Pant",
  "Jeans",
  "Shorts",
  "Jacket",
  "Hoodie",
  "Sweater",
  "Blazer",
  "Skirt",
  "Gown",
  "Saree",
  "Salwar Kameez",
  "Dhoti",
] as const;

export const STORYBOARDS_STORAGE_KEY = "esg_storyboards_v1";
export const ACTIVE_STORYBOARD_ID_KEY = "esg_active_storyboard_id_v1";

const OCCASION_PRESET_VALUES = {
  everyday:
    "everyday casual daytime street style; modern ecommerce look; clean natural daylight; approachable, effortless vibe",
  brunch:
    "weekend brunch daytime; trendy polished casual; bright natural light; relaxed upscale vibe; clean composition",
  date_night:
    "date night evening; chic elevated styling; flattering silhouette; warm cinematic lighting; premium nightlife mood",
  night_out:
    "night out nightlife; bold trendy going-out look; city lights or neon bokeh; confident, fashion-forward vibe",
  festival:
    "music festival outdoors; youthful playful energy; street-style vibe; sunlit daytime; fun accessories, not cluttered",
  vacation:
    "vacation / resort lifestyle; breezy sun-kissed look; relaxed luxury; airy atmosphere; bright natural light",
  beachwear:
    "beachwear coastal; sunny seaside environment; clean sand and gentle water; airy warm-weather vibe; uncluttered",
  workwear:
    "modern workwear; office-ready smart casual; polished and professional; clean interior; soft diffused daylight"
} as const;

const STYLE_PRESET_VALUES = {
  minimal:
    "minimal clean modern styling; premium basics; crisp lines; neutral palette; no loud logos; ecommerce lookbook vibe",
  quiet_luxury:
    "quiet luxury; understated tailoring; premium fabrics; refined proportions; neutral/earth tones; no flashy branding",
  classic:
    "classic timeless styling; wardrobe staples; polished and modern; clean lines; subtle elegance; premium feel",
  streetwear:
    "contemporary streetwear; urban modern; relaxed silhouette; trendy styling; bold but clean; ecommerce editorial vibe",
  boho:
    "boho relaxed airy styling; earthy textures; soft movement; natural materials; effortless, sunlit lifestyle vibe",
  romantic:
    "romantic feminine styling; soft delicate details; graceful silhouette; flattering look; light airy mood; tasteful",
  vintage:
    "vintage / Y2K inspired; playful nostalgic energy; early-2000s vibe; trendy styling; clean modern execution",
  coastal_resort:
    "coastal resort lifestyle; breezy sun-kissed styling; linen textures; relaxed luxury; Mediterranean vacation vibe",
  edgy:
    "edgy bold styling; high-contrast palette; confident modern vibe; statement accessories (minimal count); clean framing",
  luxe:
    "luxury editorial styling; premium high-end feel; refined, fashion-magazine photoshoot vibe; tasteful details; clean composition",
} as const;

const MODEL_STYLING_PRESET_VALUES = {
  natural_glam:
    "natural glam makeup; fresh dewy skin; softly defined eyes; subtle lip; polished but effortless; ecommerce-friendly",
  soft_glam:
    "soft glam; slightly more defined eye makeup; luminous skin; refined look; editorial but wearable; premium finish",
  minimal_jewelry:
    "minimal jewelry; small hoops or studs; delicate necklace; understated accessories; premium, clean styling",
  hair_up: "hair up; clean bun or sleek ponytail; tidy flyaways; modern polished styling; premium look",
  sleek: "sleek hair; straight or slicked-back; glossy finish; modern editorial styling; premium feel",
  beachy:
    "beachy styling; loose natural waves; sun-kissed vibe; natural makeup; minimal jewelry; airy warm-weather mood",
} as const;

export type StoryboardConfig = {
  occasionPreset: string;
  occasionDetails: string;
  accessories: string;
  bottomWearPreset: string;
  bottomWearDetails: string;
  printInputKind: "image" | "color";
  printColorHex: string;
  printAdditionalPrompt: string;
  printTargetGender: "Male" | "Female";
  printGarmentCategory: string;
  footwearPreset: string;
  footwearDetails: string;
  stylePreset: string;
  styleKeywordsDetails: string;
  backgroundThemePreset: string;
  backgroundThemeDetails: string;
  modelPreset: string;
  modelDetails: string;
  modelPosePreset: string;
  modelPoseDetails: string;
  modelStylingPreset: string;
  modelStylingNotes: string;
};

export type StoryboardRecord = {
  id: string;
  title: string;
  garmentType: string; // e.g. "T-shirt", "Saree", or custom text
  createdAt: string;
  updatedAt: string;
  config: StoryboardConfig;
  previewDataUrl?: string;
};

export function createDefaultStoryboardConfig(): StoryboardConfig {
  return {
    occasionPreset: "",
    occasionDetails: "",
    accessories: "",
    bottomWearPreset: "",
    bottomWearDetails: "",
    printInputKind: "image",
    printColorHex: "",
    printAdditionalPrompt: "",
    printTargetGender: "Male",
    printGarmentCategory: "T-shirt",
    footwearPreset: "",
    footwearDetails: "",
    stylePreset: "",
    styleKeywordsDetails: "",
    backgroundThemePreset: "",
    backgroundThemeDetails: "",
    modelPreset: "White / European",
    modelDetails: "",
    modelPosePreset: "",
    modelPoseDetails: "",
    modelStylingPreset: "",
    modelStylingNotes: "",
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeBackgroundThemePreset(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const mapping: Record<string, string> = {
    studio:
      "studio — bright modern ecommerce studio set; seamless backdrop or clean wall; soft diffused daylight; neutral tones; minimal props",
    beach:
      "beach — sunny coastal beach; clean sand; gentle waves; bright natural daylight; airy vacation vibe; uncluttered background",
    "sunset shoreline":
      "sunset shoreline — golden hour beach at sunset; warm sky gradient; soft reflections; romantic coastal mood; clean framing",
    arcade:
      "arcade — modern neon-lit arcade; colorful ambient lights; glossy floor; playful nightlife energy; clean composition with soft bokeh",
    "city street":
      "upscale city street — modern storefronts; clean sidewalks; contemporary lifestyle vibe; soft daylight; minimal clutter; premium feel",
    garden:
      "garden — lush landscaped garden; greenery; clean stone paths; soft natural light; elegant outdoor lifestyle; subtle bokeh",
    minimal:
      "minimal neutral interior — light textured wall; clean lines; neutral palette; uncluttered set; soft natural daylight; calm premium vibe",
    luxury:
      "luxury hotel / penthouse — premium interior; marble/wood textures; tasteful decor; warm daylight; high-end lifestyle vibe; minimal clutter",
    "mediterranean terrace":
      "mediterranean terrace — white stucco; stone tiles; olive trees; coastal Europe resort vibe; bright sun; airy open space; clean composition",
    concert:
      "EDM concert / music festival stage — realistic nighttime crowd scene; high-energy but clean composition; colorful neon lasers and LED screens; soft bokeh stage lighting; light haze/fog and confetti optional, model should be in the crowd, it should look realistic",
    "live music concert":
      "concert venue — EDM concert / music festival stage — realistic nighttime crowd scene; high-energy but clean composition; colorful neon lasers and LED screens; soft bokeh stage lighting; light haze/fog and confetti optional, model should be in the crowd, it should look realistic",
    nightclub:
      "nightclub lounge — upscale lounge; subtle neon accents; stylish nightlife vibe; moody but clean lighting; uncluttered background",
    "bar nightclub":
      "nightclub lounge — upscale lounge; subtle neon accents; stylish nightlife vibe; moody but clean lighting; uncluttered background",
  };
  return mapping[v] ?? v;
}

function normalizeOccasionPreset(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const key = v.toLowerCase();
  const mapping: Record<string, string> = {
    casual: OCCASION_PRESET_VALUES.everyday,
    everyday: OCCASION_PRESET_VALUES.everyday,
    "party wear": OCCASION_PRESET_VALUES.night_out,
    evening: OCCASION_PRESET_VALUES.date_night,
    beachwear: OCCASION_PRESET_VALUES.beachwear,
    "pool party": OCCASION_PRESET_VALUES.vacation,
    "resort vacation": OCCASION_PRESET_VALUES.vacation,
    vacation: OCCASION_PRESET_VALUES.vacation,
    workwear: OCCASION_PRESET_VALUES.workwear,
    festival: OCCASION_PRESET_VALUES.festival,
    brunch: OCCASION_PRESET_VALUES.brunch,
    "date night": OCCASION_PRESET_VALUES.date_night,
    date_night: OCCASION_PRESET_VALUES.date_night,
    "night out": OCCASION_PRESET_VALUES.night_out,
    night_out: OCCASION_PRESET_VALUES.night_out,
  };
  return mapping[key] ?? v;
}

function normalizeFootwearPreset(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const mapping: Record<string, string> = {
    sneakers: "white_sneakers",
    heels: "strappy_heels",
    sandals: "minimal_sandals",
    boots: "ankle_boots",
    flats: "ballet_flats",
    loafers: "loafers",
  };
  return mapping[v] ?? v;
}

function normalizeStylePreset(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const key = v.toLowerCase();
  const mapping: Record<string, string> = {
    "warm and vibrant": STYLE_PRESET_VALUES.coastal_resort,
    "earthy and tropical": STYLE_PRESET_VALUES.coastal_resort,
    romantic: STYLE_PRESET_VALUES.romantic,
    boho: STYLE_PRESET_VALUES.boho,
    streetwear: STYLE_PRESET_VALUES.streetwear,
    minimal: STYLE_PRESET_VALUES.minimal,
    "minimal / clean": STYLE_PRESET_VALUES.minimal,
    vintage: STYLE_PRESET_VALUES.vintage,
    "vintage / y2k": STYLE_PRESET_VALUES.vintage,
    edgy: STYLE_PRESET_VALUES.edgy,
    classic: STYLE_PRESET_VALUES.classic,
    quiet_luxury: STYLE_PRESET_VALUES.quiet_luxury,
    "quiet luxury": STYLE_PRESET_VALUES.quiet_luxury,
    coastal_resort: STYLE_PRESET_VALUES.coastal_resort,
    "coastal / resort": STYLE_PRESET_VALUES.coastal_resort,
  };
  return mapping[key] ?? v;
}

function normalizeModelStylingPreset(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const key = v.toLowerCase();
  const mapping: Record<string, string> = {
    "natural glam": MODEL_STYLING_PRESET_VALUES.natural_glam,
    natural_glam: MODEL_STYLING_PRESET_VALUES.natural_glam,
    "soft glam": MODEL_STYLING_PRESET_VALUES.soft_glam,
    soft_glam: MODEL_STYLING_PRESET_VALUES.soft_glam,
    "minimal jewelry": MODEL_STYLING_PRESET_VALUES.minimal_jewelry,
    minimal_jewelry: MODEL_STYLING_PRESET_VALUES.minimal_jewelry,
    "hair up": MODEL_STYLING_PRESET_VALUES.hair_up,
    hair_up: MODEL_STYLING_PRESET_VALUES.hair_up,
    sleek: MODEL_STYLING_PRESET_VALUES.sleek,
    beachy: MODEL_STYLING_PRESET_VALUES.beachy,
  };
  return mapping[key] ?? v;
}

function normalizeConfig(value: unknown): StoryboardConfig {
  const base = createDefaultStoryboardConfig();
  const raw = (value ?? {}) as Record<string, unknown>;
  const printInputKind = asString(raw.printInputKind);
  const normalizedPrintInputKind = printInputKind === "color" ? "color" : "image";
  const printColorHexRaw = asString(raw.printColorHex) ?? base.printColorHex;
  const normalizedPrintColorHex = normalizeHexColor(printColorHexRaw) ?? base.printColorHex;
  return {
    occasionPreset: normalizeOccasionPreset(asString(raw.occasionPreset) ?? base.occasionPreset),
    occasionDetails: asString(raw.occasionDetails) ?? base.occasionDetails,
    accessories: asString(raw.accessories) ?? base.accessories,
    bottomWearPreset: asString(raw.bottomWearPreset) ?? base.bottomWearPreset,
    bottomWearDetails: asString(raw.bottomWearDetails) ?? base.bottomWearDetails,
    printInputKind: normalizedPrintInputKind,
    printColorHex: normalizedPrintColorHex,
    printAdditionalPrompt: asString(raw.printAdditionalPrompt) ?? base.printAdditionalPrompt,
    printTargetGender: (asString(raw.printTargetGender) === "Female" ? "Female" : "Male") as "Male" | "Female",
    printGarmentCategory: asString(raw.printGarmentCategory) ?? base.printGarmentCategory,
    footwearPreset: normalizeFootwearPreset(asString(raw.footwearPreset) ?? base.footwearPreset),
    footwearDetails: asString(raw.footwearDetails) ?? base.footwearDetails,
    stylePreset: normalizeStylePreset(asString(raw.stylePreset) ?? base.stylePreset),
    styleKeywordsDetails: asString(raw.styleKeywordsDetails) ?? base.styleKeywordsDetails,
    backgroundThemePreset: normalizeBackgroundThemePreset(
      asString(raw.backgroundThemePreset) ?? base.backgroundThemePreset,
    ),
    backgroundThemeDetails: asString(raw.backgroundThemeDetails) ?? base.backgroundThemeDetails,
    modelPreset: asString(raw.modelPreset) ?? base.modelPreset,
    modelDetails: asString(raw.modelDetails) ?? base.modelDetails,
    modelPosePreset: asString(raw.modelPosePreset) ?? base.modelPosePreset,
    modelPoseDetails: asString(raw.modelPoseDetails) ?? base.modelPoseDetails,
    modelStylingPreset: normalizeModelStylingPreset(asString(raw.modelStylingPreset) ?? base.modelStylingPreset),
    modelStylingNotes: asString(raw.modelStylingNotes) ?? base.modelStylingNotes,
  };
}

function normalizeStoryboard(value: unknown): StoryboardRecord | null {
  const raw = (value ?? {}) as Record<string, unknown>;
  const id = asString(raw.id);
  if (!id) return null;

  const title = asString(raw.title) ?? "Untitled";
  const garmentType = asString(raw.garmentType) ?? "";
  const createdAt = asString(raw.createdAt) ?? nowIso();
  const updatedAt = asString(raw.updatedAt) ?? createdAt;
  const config = normalizeConfig(raw.config);
  const previewDataUrl = asString(raw.previewDataUrl) ?? undefined;
  return { id, title, garmentType, createdAt, updatedAt, config, previewDataUrl };
}

export function createStoryboardRecord(opts?: {
  title?: string;
  garmentType?: string;
  config?: Partial<StoryboardConfig>;
}): StoryboardRecord {
  const createdAt = nowIso();
  return {
    id: randomId(),
    title: (opts?.title || "").trim() || "New storyboard",
    garmentType: (opts?.garmentType || "").trim(),
    createdAt,
    updatedAt: createdAt,
    config: {
      ...createDefaultStoryboardConfig(),
      ...(opts?.config ?? {}),
    },
  };
}

export function loadStoryboardsFromLocalStorage(): StoryboardRecord[] {
  const raw = localStorage.getItem(STORYBOARDS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStoryboard).filter(Boolean) as StoryboardRecord[];
  } catch {
    return [];
  }
}

export function saveStoryboardsToLocalStorage(storyboards: StoryboardRecord[]): void {
  localStorage.setItem(STORYBOARDS_STORAGE_KEY, JSON.stringify(storyboards));
}

export function loadActiveStoryboardIdFromLocalStorage(): string | null {
  const id = localStorage.getItem(ACTIVE_STORYBOARD_ID_KEY);
  return (id || "").trim() || null;
}

export function saveActiveStoryboardIdToLocalStorage(id: string): void {
  localStorage.setItem(ACTIVE_STORYBOARD_ID_KEY, (id || "").trim());
}
