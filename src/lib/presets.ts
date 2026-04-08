export type Option = { value: string; label: string };

export const occasionPresetOptions: Option[] = [
  { value: "", label: "Auto" },
  { value: "none", label: "Nil" },
  {
    value:
      "everyday casual daytime street style; modern ecommerce look; clean natural daylight; approachable, effortless vibe",
    label: "Everyday",
  },
  {
    value:
      "weekend brunch daytime; trendy polished casual; bright natural light; relaxed upscale vibe; clean composition",
    label: "Brunch",
  },
  {
    value:
      "date night evening; chic elevated styling; flattering silhouette; warm cinematic lighting; premium nightlife mood",
    label: "Date night",
  },
  {
    value:
      "night out nightlife; bold trendy going-out look; city lights or neon bokeh; confident, fashion-forward vibe",
    label: "Night out",
  },
  {
    value:
      "music festival outdoors; youthful playful energy; street-style vibe; sunlit daytime; fun accessories, not cluttered",
    label: "Festival",
  },
  {
    value:
      "vacation / resort lifestyle; breezy sun-kissed look; relaxed luxury; airy atmosphere; bright natural light",
    label: "Vacation / Resort",
  },
  {
    value:
      "beachwear coastal; sunny seaside environment; clean sand and gentle water; airy warm-weather vibe; uncluttered",
    label: "Beachwear",
  },
  {
    value:
      "modern workwear; office-ready smart casual; polished and professional; clean interior; soft diffused daylight",
    label: "Work / Office",
  },
  { value: "custom", label: "Custom" },
];

export const occasionPresetLabelByValue: Record<string, string> = Object.fromEntries(
  occasionPresetOptions
    .filter((o) => o.value && o.value !== "custom")
    .map((o) => [o.value, o.label]),
);

export const footwearPresetOptions: Option[] = [
  { value: "", label: "Auto" },
  { value: "none", label: "Nil" },
  { value: "white_sneakers", label: "White sneakers" },
  { value: "chunky_sneakers", label: "Chunky sneakers" },
  { value: "strappy_heels", label: "Strappy heels" },
  { value: "block_heels", label: "Block heels" },
  { value: "minimal_sandals", label: "Minimal sandals" },
  { value: "platform_sandals", label: "Platform sandals" },
  { value: "ankle_boots", label: "Ankle boots" },
  { value: "knee_boots", label: "Knee-high boots" },
  { value: "ballet_flats", label: "Ballet flats" },
  { value: "loafers", label: "Loafers" },
  { value: "mules", label: "Mules" },
  { value: "slides", label: "Slides" },
  { value: "custom", label: "Custom" },
];

export const footwearPresetLabelByValue: Record<string, string> = Object.fromEntries(
  footwearPresetOptions
    .filter((o) => o.value && o.value !== "custom")
    .map((o) => [o.value, o.label]),
);

export const footwearPresetKeywordsByValue: Record<string, string> = {
  white_sneakers: "clean white sneakers, modern, minimal, ecommerce-friendly",
  chunky_sneakers: "chunky sneakers, trendy, streetwear-leaning, modern",
  strappy_heels: "strappy heels, sleek, going-out, elegant",
  block_heels: "block heels, comfortable, modern, polished",
  minimal_sandals: "minimal sandals, neutral, clean, warm-weather",
  platform_sandals: "platform sandals, trendy, bold, fashion-forward",
  ankle_boots: "ankle boots, modern, sleek, versatile",
  knee_boots: "knee-high boots, statement, sleek, fashion-forward",
  ballet_flats: "ballet flats, feminine, classic, minimal",
  loafers: "loafers, smart casual, modern, polished",
  mules: "mules, chic, minimal, elevated casual",
  slides: "slides, casual, modern, warm-weather",
};

export const stylePresetOptions: Option[] = [
  { value: "", label: "Auto" },
  {
    value:
      "minimal clean modern styling; premium basics; crisp lines; neutral palette; no loud logos; ecommerce lookbook vibe",
    label: "Minimal / Clean",
  },
  {
    value:
      "quiet luxury; understated tailoring; premium fabrics; refined proportions; neutral/earth tones; no flashy branding",
    label: "Quiet luxury",
  },
  {
    value:
      "classic timeless styling; wardrobe staples; polished and modern; clean lines; subtle elegance; premium feel",
    label: "Classic / Timeless",
  },
  {
    value:
      "contemporary streetwear; urban modern; relaxed silhouette; trendy styling; bold but clean; ecommerce editorial vibe",
    label: "Streetwear",
  },
  {
    value:
      "boho relaxed airy styling; earthy textures; soft movement; natural materials; effortless, sunlit lifestyle vibe",
    label: "Boho",
  },
  {
    value:
      "romantic feminine styling; soft delicate details; graceful silhouette; flattering look; light airy mood; tasteful",
    label: "Romantic / Feminine",
  },
  {
    value:
      "vintage / Y2K inspired; playful nostalgic energy; early-2000s vibe; trendy styling; clean modern execution",
    label: "Vintage / Y2K",
  },
  {
    value:
      "coastal resort lifestyle; breezy sun-kissed styling; linen textures; relaxed luxury; Mediterranean vacation vibe",
    label: "Coastal / Resort",
  },
  {
    value:
      "edgy bold styling; high-contrast palette; confident modern vibe; statement accessories (minimal count); clean framing",
    label: "Edgy / Bold",
  },
  {
    value:
      "luxury editorial styling; premium high-end feel; refined, fashion-magazine photoshoot vibe; tasteful details; clean composition",
    label: "Luxury / Editorial",
  },
  { value: "custom", label: "Custom" },
];

export const stylePresetLabelByValue: Record<string, string> = Object.fromEntries(
  stylePresetOptions
    .filter((o) => o.value && o.value !== "custom")
    .map((o) => [o.value, o.label]),
);

export const modelStylingPresetOptions: Option[] = [
  { value: "", label: "Auto" },
  { value: "none", label: "Nil" },
  {
    value:
      "natural glam makeup; fresh dewy skin; softly defined eyes; subtle lip; polished but effortless; ecommerce-friendly",
    label: "Natural glam",
  },
  {
    value:
      "soft glam; slightly more defined eye makeup; luminous skin; refined look; editorial but wearable; premium finish",
    label: "Soft glam",
  },
  {
    value:
      "minimal jewelry; small hoops or studs; delicate necklace; understated accessories; premium, clean styling",
    label: "Minimal jewelry",
  },
  {
    value: "hair up; clean bun or sleek ponytail; tidy flyaways; modern polished styling; premium look",
    label: "Hair up",
  },
  {
    value: "sleek hair; straight or slicked-back; glossy finish; modern editorial styling; premium feel",
    label: "Sleek",
  },
  {
    value:
      "beachy styling; loose natural waves; sun-kissed vibe; natural makeup; minimal jewelry; airy warm-weather mood",
    label: "Beachy",
  },
  { value: "custom", label: "Custom" },
];

export const modelStylingPresetLabelByValue: Record<string, string> = Object.fromEntries(
  modelStylingPresetOptions
    .filter((o) => o.value && o.value !== "custom")
    .map((o) => [o.value, o.label]),
);

export const modelPosePresetOptions: Option[] = [
  { value: "", label: "Auto" },
  {
    value:
      "standing front-facing ecommerce hero pose; full-body head-to-toe; relaxed weight shift (S-curve); shoulders relaxed; arms slightly away from torso; hands relaxed; garment fully visible and unobstructed",
    label: "Standing front (hero)",
  },
  {
    value:
      "standing three-quarter turn (30–45°) toward camera; natural weight shift; slight torso twist; relaxed hands; shows silhouette and garment drape; clean ecommerce pose; garment unobstructed",
    label: "Standing 3/4 turn",
  },
  {
    value:
      "natural walking step; one foot forward; subtle motion; relaxed arms; soft smile; shows garment movement/drape; full-body head-to-toe with feet visible; product-first",
    label: "Walking step",
  },
  {
    value:
      "casual lean pose; slight lean on one leg; gentle shoulder tilt; relaxed arms; one hand lightly on hip or along thigh; clean commercial look; garment unobstructed",
    label: "Casual lean",
  },
  {
    value:
      "hand on hip; other arm relaxed; confident but friendly; clean ecommerce full-body stance; keeps garment unobstructed; no aggressive posture",
    label: "Hand on hip",
  },
  {
    value:
      "hands in pockets (if garment allows); relaxed stance; slight weight shift; shoulders relaxed; clean ecommerce look; ensure garment details remain visible",
    label: "Hands in pockets",
  },
  {
    value:
      "seated on a simple studio stool; upright posture; relaxed shoulders; legs uncrossed; feet/shoes visible; full-body head-to-toe framing; garment unobstructed",
    label: "Sitting (stool)",
  },
  {
    value:
      "seated on steps/bench in a clean setting; upright posture; legs naturally placed (not crossed); feet visible; relaxed hands; full-body head-to-toe framing; garment unobstructed",
    label: "Sitting (steps/bench)",
  },
  { value: "custom", label: "Custom" },
];

export const modelPosePresetLabelByValue: Record<string, string> = Object.fromEntries(
  modelPosePresetOptions
    .filter((o) => o.value && o.value !== "custom")
    .map((o) => [o.value, o.label]),
);

export const modelEthnicityOptions: Option[] = [
  { value: "", label: "Auto" },
  { value: "South Asian (Indian)", label: "Indian" },
  { value: "East Asian", label: "East Asian" },
  { value: "Black", label: "Black" },
  { value: "White / European", label: "White / European" },
  { value: "Middle Eastern", label: "Middle Eastern" },
  { value: "Latina", label: "Latina" },
  { value: "Mixed / Diverse", label: "Mixed / Diverse" },
  { value: "custom", label: "Custom" },
];

export const backgroundThemeOptions: Option[] = [
  { value: "", label: "Auto" },
  {
    value:
      "studio — bright modern ecommerce studio set; seamless backdrop or clean wall; soft diffused daylight; neutral tones; minimal props",
    label: "Studio",
  },
  {
    value:
      "beach — sunny coastal beach; clean sand; gentle waves; bright natural daylight; airy vacation vibe; uncluttered background",
    label: "Beach",
  },
  {
    value:
      "sunset shoreline — golden hour beach at sunset; warm sky gradient; soft reflections; romantic coastal mood; clean framing",
    label: "Sunset Shoreline",
  },
  {
    value:
      "arcade — modern neon-lit arcade; colorful ambient lights; glossy floor; playful nightlife energy; clean composition with soft bokeh",
    label: "Arcade",
  },
  {
    value:
      "upscale city street — modern storefronts; clean sidewalks; contemporary lifestyle vibe; soft daylight; minimal clutter; premium feel",
    label: "City",
  },
  {
    value:
      "rooftop terrace — modern rooftop with skyline; clean railings; golden-hour or soft daylight; premium lifestyle vibe; minimal clutter",
    label: "Rooftop",
  },
  {
    value:
      "coffee shop — modern cafe interior; warm daylight; clean tables; subtle background blur; trendy lifestyle vibe; uncluttered",
    label: "Coffee shop",
  },
  {
    value:
      "garden — lush landscaped garden; greenery; clean stone paths; soft natural light; elegant outdoor lifestyle; subtle bokeh",
    label: "Garden",
  },
  {
    value:
      "art gallery — minimal contemporary gallery; white walls; clean lines; soft even lighting; premium editorial vibe; uncluttered background",
    label: "Gallery",
  },
  {
    value:
      "minimal neutral interior — light textured wall; clean lines; neutral palette; uncluttered set; soft natural daylight; calm premium vibe",
    label: "Minimal",
  },
  {
    value:
      "luxury hotel / penthouse — premium interior; marble/wood textures; tasteful decor; warm daylight; high-end lifestyle vibe; minimal clutter",
    label: "Luxury",
  },
  {
    value:
      "mediterranean terrace — white stucco; stone tiles; olive trees; coastal Europe resort vibe; bright sun; airy open space; clean composition",
    label: "Mediterranean Terrace",
  },
  {
    value:
      "EDM concert / music festival stage — realistic nighttime crowd scene; high-energy but clean composition; colorful neon lasers and LED screens; soft bokeh stage lighting; light haze/fog and confetti optional, model should be in the crowd, it should look realistic",
    label: "Concert",
  },
  {
    value:
      "nightclub lounge — upscale lounge; subtle neon accents; stylish nightlife vibe; moody but clean lighting; uncluttered background",
    label: "Nightlife",
  },
  { value: "custom", label: "Custom" },
];
