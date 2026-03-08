export interface Category {
    id: string;
    ja: string;
    en: string;
    icon?: string;
    minors?: string[]; // tags to search in arXiv/news
}

export interface MajorCategory {
    id: string;
    nameJa: string;
    nameEn: string;
    minors: Category[];
}

export const CATEGORIES_HIERARCHY: MajorCategory[] = [
    {
        id: "life_science",
        nameJa: "生物・生命科学",
        nameEn: "Life Science",
        minors: [
            { id: "biology", ja: "一般生物学", en: "General Biology", icon: "🧬" },
            { id: "neuroscience", ja: "脳・神経科学", en: "Neuroscience", icon: "🧠" },
            { id: "medicine", ja: "医学・医療", en: "Medicine", icon: "🏥" },
            { id: "genetics", ja: "遺伝学", en: "Genetics", icon: "🧬" },
        ]
    },
    {
        id: "physical_science",
        nameJa: "物理・数学・化学",
        nameEn: "Physical Science",
        minors: [
            { id: "physics", ja: "物理学", en: "Physics", icon: "⚛️" },
            { id: "chemistry", ja: "化学", en: "Chemistry", icon: "🧪" },
            { id: "math", ja: "数学", en: "Mathematics", icon: "📐" },
            { id: "astronomy", ja: "天文学", en: "Astronomy", icon: "🪐" },
        ]
    },
    {
        id: "tech_ai",
        nameJa: "IT・AI・テクノロジー",
        nameEn: "Tech & AI",
        minors: [
            { id: "computer_science", ja: "コンピュータ科学", en: "Computer Science", icon: "💻" },
            { id: "machine_learning", ja: "機械学習・AI", en: "Machine Learning / AI", icon: "🤖" },
            { id: "quantum", ja: "量子情報・計算", en: "Quantum Computing", icon: "⚛️" },
            { id: "robotics", ja: "ロボティクス", en: "Robotics", icon: "🦾" },
        ]
    }
];

export const ALL_MINOR_CATEGORIES = CATEGORIES_HIERARCHY.flatMap(major => major.minors);
