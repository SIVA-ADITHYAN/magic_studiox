export type PoseTemplate = {
  id: string;
  category: string;
  label: string;
  url: string; // empty string means pending generation (displays gray box placeholder)
  poseKeyword: string;
};

export const poseTemplates: PoseTemplate[] = [
  // Front & Back
  { id: "pose_front", category: "Front & Back", label: "Front Pose", url: "", poseKeyword: "front-facing pose, standing straight, facing the camera" },
  { id: "pose_back", category: "Front & Back", label: "Back Pose", url: "", poseKeyword: "back pose, facing away from camera, showing the back of the garment" },
  { id: "pose_standing_straight", category: "Front & Back", label: "Standing Straight Pose", url: "", poseKeyword: "standing perfectly straight, relaxed arms, front-facing" },
  
  // Side & Angles
  { id: "pose_side_left", category: "Side & Angles", label: "Side Pose (Left)", url: "", poseKeyword: "side profile pose facing left, showing the side of the garment" },
  { id: "pose_side_right", category: "Side & Angles", label: "Side Pose (Right)", url: "", poseKeyword: "side profile pose facing right, showing the side of the garment" },
  { id: "pose_three_quarter", category: "Side & Angles", label: "3/4 Angle Pose", url: "", poseKeyword: "3/4 angle pose, slightly turned away from the camera" },
  { id: "pose_over_shoulder", category: "Side & Angles", label: "Over Shoulder Look", url: "", poseKeyword: "looking over the shoulder towards the camera, body turned slightly away" },
  { id: "pose_head_turn", category: "Side & Angles", label: "Head Turn Pose", url: "", poseKeyword: "body facing forward, head turned sharply to the side" },
  { id: "pose_back_look_over", category: "Side & Angles", label: "Back Look Over Shoulder", url: "", poseKeyword: "facing away, looking back over the shoulder" },

  // Movement
  { id: "pose_walking", category: "Movement", label: "Walking Pose", url: "", poseKeyword: "mid-stride walking pose, natural motion" },
  { id: "pose_runway_walk", category: "Movement", label: "Runway Walk Pose", url: "", poseKeyword: "runway walk, confident stride, dynamic movement" },
  { id: "pose_one_leg_forward", category: "Movement", label: "One Leg Forward Pose", url: "", poseKeyword: "standing with one leg elegantly placed forward" },
  { id: "pose_twirl", category: "Movement", label: "Twirl Pose", url: "", poseKeyword: "twirling, dress or skirt flowing outward in motion" },
  { id: "pose_flowing_dress", category: "Movement", label: "Flowing Dress Pose", url: "", poseKeyword: "holding dress fabric out, letting it flow dynamically" },

  // Seated
  { id: "pose_sitting", category: "Seated", label: "Sitting Pose", url: "", poseKeyword: "sitting gracefully on a stool or chair" },
  { id: "pose_sitting_cross_leg", category: "Seated", label: "Sitting Cross-Leg", url: "", poseKeyword: "sitting on the floor or block with legs crossed" },
  { id: "pose_kneeling", category: "Seated", label: "Kneeling Pose", url: "", poseKeyword: "kneeling on one or both knees, editorial pose" },
  
  // Traditional & Stylized
  { id: "pose_cross_leg_stand", category: "Stylized", label: "Cross-Leg Stand Pose", url: "", poseKeyword: "standing with ankles crossed, relaxed pose" },
  { id: "pose_hand_in_pocket", category: "Stylized", label: "Hand in Pocket Pose", url: "", poseKeyword: "one or both hands casually in pockets" },
  { id: "pose_arms_crossed", category: "Stylized", label: "Arms Crossed Pose", url: "", poseKeyword: "arms crossed confidently over the chest" },
  { id: "pose_leaning", category: "Stylized", label: "Leaning Pose", url: "", poseKeyword: "leaning casually forward or to the side" },
  { id: "pose_wall_lean", category: "Stylized", label: "Wall Lean Pose", url: "", poseKeyword: "leaning shoulder or back against a wall" },
  { id: "pose_hands_on_waist", category: "Stylized", label: "Hands on Waist Pose", url: "", poseKeyword: "confident pose with hands on waist or hips" },
  { id: "pose_casual_relaxed", category: "Stylized", label: "Casual Relaxed Pose", url: "", poseKeyword: "highly candid, relaxed, natural stance" },

  // Garment Interactions (Traditional & Outerwear)
  { id: "pose_pallu_display", category: "Garment Interaction", label: "Pallu Display Pose", url: "", poseKeyword: "traditional pose, gracefully holding or displaying the saree pallu" },
  { id: "pose_dupatta_hold", category: "Garment Interaction", label: "Dupatta Hold Pose", url: "", poseKeyword: "traditional pose, delicately holding the dupatta fabric" },
  { id: "pose_jacket_hold", category: "Garment Interaction", label: "Jacket Hold Pose", url: "", poseKeyword: "holding jacket collar or lapels, opening the jacket slightly" },
  { id: "pose_hoodie_up", category: "Garment Interaction", label: "Hoodie Up Pose", url: "", poseKeyword: "wearing the hood up, hands adjusting the hood strings" },
  { id: "pose_collar_adjust", category: "Garment Interaction", label: "Collar Adjust Pose", url: "", poseKeyword: "hands adjusting the shirt collar, dapper pose" },
  { id: "pose_buttoning_shirt", category: "Garment Interaction", label: "Buttoning Shirt Pose", url: "", poseKeyword: "mid-action buttoning up a shirt cuffs or front" },
];
