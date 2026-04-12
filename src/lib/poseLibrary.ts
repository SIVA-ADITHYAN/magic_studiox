export type PoseTemplate = {
  id: string;
  category: string; // garment name — filter pill & group header
  label: string;    // pose type — sub-category header inside group
  url: string;
  poseKeyword: string;
};

function p(
  garment: string,
  pose: string,
  folder: string,
  keyword: string,
  files: string[]
): PoseTemplate[] {
  const gSlug = garment.toLowerCase().replace(/[^a-z0-9]/g, "");
  const pSlug = pose.toLowerCase().replace(/[^a-z0-9]/g, "");
  return files.map((file, i) => ({
    id: `${gSlug}_${pSlug}_${folder}_${file.replace(".", "_")}`,
    category: garment,
    label: pose,
    url: `/pose-templates/${folder}/${file}`,
    poseKeyword: keyword,
  }));
}

export const poseTemplates: PoseTemplate[] = [

  // ── T-shirt ──────────────────────────────────────────────────────────────
  ...p("T-shirt", "Back Poses",  "back-poses",      "back pose facing away, showing back of garment",            ["t.jpg"]),
  ...p("T-shirt", "Front Poses", "front-poses",      "front-facing pose, standing, facing the camera directly",   ["t.jpg"]),
  ...p("T-shirt", "Head Turn",   "head-turn-tshirt", "body facing forward, head turned sharply to the side",      ["1.jpg", "2.jpg"]),

  // ── Shirt ────────────────────────────────────────────────────────────────
  ...p("Shirt", "Arm Crossed",       "arm-crossed-shirt",    "arms crossed confidently over the chest",                           ["1.jpg", "2.jpg"]),
  ...p("Shirt", "Back Look",         "back-look-shirt",      "facing away, looking back over the shoulder",                       ["3.jpg"]),
  ...p("Shirt", "Buttoning",         "buttoning-shirt",      "mid-action buttoning up a shirt",                                   ["1.jpg"]),
  ...p("Shirt", "Front Poses",       "front-poses",          "front-facing pose, standing, facing the camera directly",           ["s.jpg", "s1.jpg", "s2.jpg"]),
  ...p("Shirt", "Leaning Pose",      "leaning-pose-shirt",   "leaning casually forward or to the side",                           ["2.jpg", "3.jpg"]),
  ...p("Shirt", "Side & Angles",     "side-angles",          "angled pose showing the side and profile of the garment",           ["s.jpg", "s1.jpg"]),
  ...p("Shirt", "Side Pose (Left)",  "side-pose-left-shirt", "side profile pose facing left, showing the side of the garment",    ["1.jpg", "3.jpg", "5.jpg"]),

  // ── Jacket ───────────────────────────────────────────────────────────────
  ...p("Jacket", "Back Poses",        "back-poses",     "back pose facing away, showing back of garment",            ["j.jpg"]),
  ...p("Jacket", "Side & Angles",     "side-angles",    "angled pose showing the side and profile of the garment",   ["j.jpg"]),
  ...p("Jacket", "Side Pose (Right)", "side-pose-right","side profile pose facing right, showing the side of the garment", ["J.jpg", "J1.jpg"]),
  ...p("Jacket", "Wall Lean",         "wall-lean",      "leaning shoulder or back against a wall",                   ["J.jpg", "J1.jpg"]),

  // ── Pant ─────────────────────────────────────────────────────────────────
  ...p("Pant", "Cross Leg",    "cross-leg-pant", "standing with ankles crossed, relaxed pose",                  ["2.jpg", "3.jpg"]),
  ...p("Pant", "Side & Angles","side-angles",    "angled pose showing the side and profile of the garment",      ["p.jpg"]),

  // ── Hoodie ───────────────────────────────────────────────────────────────
  ...p("Hoodie", "Hand in Pocket", "hand-in-pocket-hoodie", "one or both hands casually in pockets",                    ["2.jpg", "4.jpg"]),
  ...p("Hoodie", "Hoodie Up",      "hoodie-up",             "wearing the hood up, hands adjusting the hood strings",     ["1.jpg", "3.jpg", "4.jpg"]),
  ...p("Hoodie", "Stand Straight", "stand-straight-hoodie", "standing perfectly straight, relaxed arms, front-facing",   ["1.jpg", "2.jpg", "3.jpg", "4.jpg", "5.jpg"]),

  // ── Sweater ──────────────────────────────────────────────────────────────
  ...p("Sweater", "Over Shoulder",     "over-shoulder-sweater", "looking over the shoulder towards the camera",                    ["1.jpg", "2.jpg"]),
  ...p("Sweater", "Side Pose (Right)", "side-pose-right",       "side profile pose facing right, showing the side of the garment", ["S.jpg"]),
  ...p("Sweater", "Walking Pose",      "walking-pose-sweater",  "mid-stride walking pose, natural motion",                         ["2.jpg", "3.jpg"]),
  ...p("Sweater", "Wall Lean",         "wall-lean",             "leaning shoulder or back against a wall",                         ["S.jpg"]),

  // ── Blazer ───────────────────────────────────────────────────────────────
  ...p("Blazer", "3/4 Angle",     "3by4-blazer",         "3/4 angle pose, slightly turned away from the camera",  ["1.jpg", "2.jpg", "3.jpg"]),
  ...p("Blazer", "Run Away Walk", "run-away-walk-blazer", "dynamic walk away pose, movement away from camera",     ["1.jpg", "2.jpg", "3.jpg"]),

  // ── Saree ────────────────────────────────────────────────────────────────
  ...p("Saree", "Pallu Display", "pallu-display", "traditional pose, gracefully holding or displaying the saree pallu", ["1.jpg", "2.jpg", "3.jpg"]),
];
