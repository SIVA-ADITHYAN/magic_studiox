export type ModelTemplate = {
  id: string;
  category: string;
  label: string;
  ethnicityLabel: string;
  url: string;
  ethnicityKeyword: string; // The exact modelEthnicity description string to inject into LLM
};

export const modelTemplates: ModelTemplate[] = [
  // Men
  {
    id: "male_young_white",
    category: "Men",
    label: "Young Male",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_male_1775069093813.png",
    ethnicityKeyword: "Young adult male, White / European",
  },
  {
    id: "male_young_black",
    category: "Men",
    label: "Young Male",
    ethnicityLabel: "Black / African American",
    url: "/model-templates/model_male_black_1775069759266.png",
    ethnicityKeyword: "Young adult male, Black / African American",
  },
  {
    id: "man_adult_white",
    category: "Men",
    label: "Adult Man",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_man_1775069160608.png",
    ethnicityKeyword: "Adult male, White / European",
  },
  {
    id: "man_adult_indian",
    category: "Men",
    label: "Adult Man",
    ethnicityLabel: "South Asian / Indian",
    url: "/model-templates/model_man_indian_1775069827000.png",
    ethnicityKeyword: "Adult male, South Asian / Indian",
  },

  // Women
  {
    id: "female_young_white",
    category: "Women",
    label: "Young Female",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_female_1775069111183.png",
    ethnicityKeyword: "Young adult female, White / European",
  },
  {
    id: "female_young_asian",
    category: "Women",
    label: "Young Female",
    ethnicityLabel: "East Asian",
    url: "/model-templates/model_female_asian_1775069775087.png",
    ethnicityKeyword: "Young adult female, East Asian",
  },
  {
    id: "woman_adult_white",
    category: "Women",
    label: "Adult Woman",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_woman_1775069175465.png",
    ethnicityKeyword: "Adult female, White / European",
  },
  {
    id: "woman_adult_native",
    category: "Women",
    label: "Adult Woman",
    ethnicityLabel: "Native American",
    url: "/model-templates/model_woman_native_american_1775069844622.png",
    ethnicityKeyword: "Adult female, Native American",
  },

  // Kids
  {
    id: "boy_white",
    category: "Kids",
    label: "Young Boy",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_boy_1775069127084.png",
    ethnicityKeyword: "Young boy child, White / European",
  },
  {
    id: "boy_hispanic",
    category: "Kids",
    label: "Young Boy",
    ethnicityLabel: "Hispanic",
    url: "/model-templates/model_boy_hispanic_1775069791086.png",
    ethnicityKeyword: "Young boy child, Hispanic",
  },
  {
    id: "girl_white",
    category: "Kids",
    label: "Young Girl",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_girl_1775069144145.png",
    ethnicityKeyword: "Young girl child, White / European",
  },
  {
    id: "girl_middle_eastern",
    category: "Kids",
    label: "Young Girl",
    ethnicityLabel: "Middle Eastern",
    url: "/model-templates/model_girl_middle_eastern_1775069807552.png",
    ethnicityKeyword: "Young girl child, Middle Eastern",
  },

  // Middle-Aged
  {
    id: "man_middle_white",
    category: "Middle-Aged",
    label: "Middle-Aged Man",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_middle_aged_man_1775069215678.png",
    ethnicityKeyword: "Middle-aged adult man, White / European",
  },
  {
    id: "man_middle_latino",
    category: "Middle-Aged",
    label: "Middle-Aged Man",
    ethnicityLabel: "Latino",
    url: "/model-templates/model_middle_aged_man_latino_1775069881214.png",
    ethnicityKeyword: "Middle-aged adult man, Latino",
  },
  {
    id: "woman_middle_white",
    category: "Middle-Aged",
    label: "Middle-Aged Woman",
    ethnicityLabel: "White / European",
    url: "/model-templates/model_middle_aged_woman_1775069193797.png",
    ethnicityKeyword: "Middle-aged adult woman, White / European",
  },
  {
    id: "woman_middle_east_asian",
    category: "Middle-Aged",
    label: "Middle-Aged Woman",
    ethnicityLabel: "East Asian",
    url: "/model-templates/model_middle_aged_woman_east_asian_1775069863475.png",
    ethnicityKeyword: "Middle-aged adult woman, East Asian",
  },

  // Diverse
  {
    id: "person_diverse",
    category: "Diverse",
    label: "Diverse Person",
    ethnicityLabel: "Mixed Ethnicity",
    url: "/model-templates/model_ethnic_1775069232726.png",
    ethnicityKeyword: "Person of mixed diverse ethnicity",
  },
];
