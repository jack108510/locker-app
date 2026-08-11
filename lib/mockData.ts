export type MaterialType =
  | "notes"
  | "study-guide"
  | "practice-questions"
  | "flashcards"
  | "summary"
  | "prep-material";

export type ModerationStatus = "approved" | "pending" | "blocked";

export interface StudyMaterial {
  id: string;
  title: string;
  type: MaterialType;
  school: string;
  course: string;
  teacher?: string;
  pseudonym: string;
  uploadedAt: string;
  upvotes: number;
  saves: number;
  status: ModerationStatus;
  blockedReason?: string;
  tags: string[];
  preview: string;
  pages?: number;
}

export interface School {
  id: string;
  name: string;
  courses: string[];
}

export const SCHOOLS: School[] = [
  {
    id: "halifax-west-hs",
    name: "Halifax West High School",
    courses: ["Chemistry 12", "Biology 11", "Pre-Calculus 12", "English 12", "Canadian History"],
  },
  {
    id: "citadel-hs",
    name: "Citadel High School",
    courses: ["IB Biology", "Math 11", "English 11", "World History", "Physics 12"],
  },
  {
    id: "auburn-drive-hs",
    name: "Auburn Drive High School",
    courses: ["Chemistry 11", "Math 10", "Global Geography", "English 10", "Law 12"],
  },
  {
    id: "prince-andrew-hs",
    name: "Prince Andrew High School",
    courses: ["Biology 12", "Advanced Math 12", "English 12", "Economics", "Physics 11"],
  },
  {
    id: "dartmouth-hs",
    name: "Dartmouth High School",
    courses: ["Math 11", "Chemistry 12", "English 11", "Canadian History", "Biology 11"],
  },
  {
    id: "lincoln-hs",
    name: "Lincoln High School",
    courses: ["AP Chemistry", "AP US History", "Pre-Calculus", "AP English", "AP Biology", "Economics"],
  },
  {
    id: "riverside-hs",
    name: "Riverside High School",
    courses: ["Algebra II", "World History", "AP Physics", "AP Spanish", "Statistics", "AP Psychology"],
  },
  {
    id: "westview-hs",
    name: "Westview High School",
    courses: ["AP Calculus AB", "AP Government", "Chemistry", "AP Literature", "AP Environmental Science"],
  },
  {
    id: "central-hs",
    name: "Central High School",
    courses: ["AP Macro", "AP Micro", "AP Computer Science", "AP Human Geography", "AP Art History"],
  },
];

export const MATERIAL_TYPES: { value: MaterialType; label: string; emoji: string }[] = [
  { value: "notes", label: "Class Notes", emoji: "📝" },
  { value: "study-guide", label: "Study Guide", emoji: "📚" },
  { value: "practice-questions", label: "Practice Questions", emoji: "❓" },
  { value: "flashcards", label: "Flashcards", emoji: "🃏" },
  { value: "summary", label: "Chapter Summary", emoji: "📋" },
  { value: "prep-material", label: "Public Prep Material", emoji: "🎯" },
];

export const APPROVED_MATERIALS: StudyMaterial[] = [
  {
    id: "h1",
    title: "Chemistry 12 Bonding Review Sheet",
    type: "study-guide",
    school: "Halifax West High School",
    course: "Chemistry 12",
    teacher: "Ms. Clarke",
    pseudonym: "HarbourFox42",
    uploadedAt: "2024-01-16",
    upvotes: 58,
    saves: 34,
    status: "approved",
    tags: ["bonding", "VSEPR", "intermolecular forces"],
    preview: "Clean review sheet for bonding, polarity, molecular shapes, and intermolecular forces. Built from class notes and textbook examples.",
    pages: 7,
  },
  {
    id: "h2",
    title: "Biology 11 Cell Unit Notes",
    type: "notes",
    school: "Halifax West High School",
    course: "Biology 11",
    pseudonym: "NorthOwl19",
    uploadedAt: "2024-01-16",
    upvotes: 41,
    saves: 29,
    status: "approved",
    tags: ["cells", "organelles", "microscope", "membranes"],
    preview: "Student-made cell biology notes covering organelles, membrane transport, microscope terms, and diagrams for quick studying.",
    pages: 9,
  },
  {
    id: "h3",
    title: "Citadel Math 11 Functions Practice Pack",
    type: "practice-questions",
    school: "Citadel High School",
    course: "Math 11",
    pseudonym: "FogHawk77",
    uploadedAt: "2024-01-15",
    upvotes: 36,
    saves: 22,
    status: "approved",
    tags: ["functions", "quadratics", "graphs", "domain"],
    preview: "Self-made practice questions for functions, transformations, graphing, and domain/range. Includes worked examples.",
    pages: 11,
  },
  {
    id: "1",
    title: "AP Chemistry Unit 4 - Chemical Reactions Notes",
    type: "notes",
    school: "Lincoln High School",
    course: "AP Chemistry",
    teacher: "Mr. Patterson",
    pseudonym: "BlueFox42",
    uploadedAt: "2024-01-15",
    upvotes: 47,
    saves: 23,
    status: "approved",
    tags: ["stoichiometry", "limiting reagent", "molar mass"],
    preview: "Comprehensive notes covering balancing equations, stoichiometric calculations, limiting reagents, and percent yield. Includes worked examples from class.",
    pages: 8,
  },
  {
    id: "2",
    title: "APUSH Unit 5 Reconstruction Era - Full Study Guide",
    type: "study-guide",
    school: "Lincoln High School",
    course: "AP US History",
    pseudonym: "StormEagle77",
    uploadedAt: "2024-01-14",
    upvotes: 62,
    saves: 41,
    status: "approved",
    tags: ["reconstruction", "civil war", "freedmen", "amendments"],
    preview: "Covers all major events, key figures, and political changes during Reconstruction (1865-1877). Includes timeline, key terms, and DBQ tips.",
    pages: 12,
  },
  {
    id: "3",
    title: "Pre-Calc Trig Identities Flashcard Set",
    type: "flashcards",
    school: "Lincoln High School",
    course: "Pre-Calculus",
    teacher: "Ms. Rivera",
    pseudonym: "NightOwl99",
    uploadedAt: "2024-01-13",
    upvotes: 38,
    saves: 55,
    status: "approved",
    tags: ["trig", "identities", "unit circle", "sin", "cos", "tan"],
    preview: "50-card set covering all Pythagorean identities, sum/difference formulas, double angle, and half angle formulas with visual memory aids.",
    pages: 10,
  },
  {
    id: "4",
    title: "AP Biology Chapter 9 - Cellular Respiration Summary",
    type: "summary",
    school: "Lincoln High School",
    course: "AP Biology",
    pseudonym: "WildPanda11",
    uploadedAt: "2024-01-12",
    upvotes: 29,
    saves: 18,
    status: "approved",
    tags: ["glycolysis", "krebs cycle", "ATP", "ETC", "mitochondria"],
    preview: "Concise 3-page summary of cellular respiration stages: glycolysis, pyruvate oxidation, Krebs cycle, and oxidative phosphorylation. Net ATP yield calculations included.",
    pages: 3,
  },
  {
    id: "5",
    title: "AP Physics 1 - Official College Board Practice FRQs",
    type: "prep-material",
    school: "Riverside High School",
    course: "AP Physics",
    pseudonym: "SwiftHawk33",
    uploadedAt: "2024-01-11",
    upvotes: 84,
    saves: 72,
    status: "approved",
    tags: ["FRQ", "kinematics", "forces", "energy", "College Board"],
    preview: "Collection of released College Board free-response questions from 2019-2023 with scoring guidelines. All publicly available from the AP Central website.",
    pages: 24,
  },
  {
    id: "6",
    title: "Statistics Unit 3 - Probability Practice Problems",
    type: "practice-questions",
    school: "Riverside High School",
    course: "Statistics",
    teacher: "Dr. Okonkwo",
    pseudonym: "CoolMoose55",
    uploadedAt: "2024-01-10",
    upvotes: 31,
    saves: 27,
    status: "approved",
    tags: ["probability", "Bayes", "conditional", "distributions"],
    preview: "40 practice problems covering basic probability, conditional probability, Bayes theorem, and discrete distributions with full solutions.",
    pages: 15,
  },
  {
    id: "7",
    title: "AP Calculus AB - Limits & Derivatives Cheat Sheet",
    type: "study-guide",
    school: "Westview High School",
    course: "AP Calculus AB",
    pseudonym: "GlowFish88",
    uploadedAt: "2024-01-09",
    upvotes: 95,
    saves: 103,
    status: "approved",
    tags: ["limits", "derivatives", "chain rule", "product rule", "L'Hopital"],
    preview: "One-page reference covering all derivative rules, limit theorems, and common derivatives. Perfect for last-minute review before the exam.",
    pages: 2,
  },
  {
    id: "8",
    title: "AP Gov - Landmark Supreme Court Cases Study Sheet",
    type: "study-guide",
    school: "Westview High School",
    course: "AP Government",
    pseudonym: "TigerSpark21",
    uploadedAt: "2024-01-08",
    upvotes: 56,
    saves: 44,
    status: "approved",
    tags: ["SCOTUS", "constitutional law", "civil liberties", "required cases"],
    preview: "All 15 required Supreme Court cases with background, ruling, constitutional principle, and significance. Formatted for quick review.",
    pages: 6,
  },
];

const RISKY_KEYWORDS = [
  "exam key", "answer key", "test answers", "midterm answers", "final exam answers",
  "teacher copy", "teacher edition", "grade book", "student grades", "roster",
  "current exam", "this semester", "this year", "2024 exam", "actual test",
];

export function moderateUpload(
  title: string,
  type: MaterialType
): { status: ModerationStatus; reason?: string } {
  const lowerTitle = title.toLowerCase();

  for (const kw of RISKY_KEYWORDS) {
    if (lowerTitle.includes(kw)) {
      return {
        status: "blocked",
        reason: `Title contains prohibited keyword: "${kw}". Private exams, answer keys, and graded materials cannot be uploaded.`,
      };
    }
  }

  const alwaysPending = ["practice-questions"];
  if (alwaysPending.includes(type)) {
    return { status: "pending" };
  }

  const riskySuffixes = ["current", "this week", "test", "quiz", "midterm", "final"];
  if (riskySuffixes.some((s) => lowerTitle.includes(s))) {
    return {
      status: "pending",
      reason: "Material flagged for review — title suggests it may reference a current assessment.",
    };
  }

  return { status: "approved" };
}

export const PENDING_QUEUE: StudyMaterial[] = [
  {
    id: "q1",
    title: "World History Chapter 12 Practice Questions",
    type: "practice-questions",
    school: "Riverside High School",
    course: "World History",
    pseudonym: "RedDeer44",
    uploadedAt: "2024-01-15",
    upvotes: 0,
    saves: 0,
    status: "pending",
    tags: ["cold war", "decolonization"],
    preview: "Self-made practice questions based on lecture notes for Chapter 12.",
    pages: 4,
  },
  {
    id: "q2",
    title: "AP Macro Unit 2 Practice MCQs",
    type: "practice-questions",
    school: "Central High School",
    course: "AP Macro",
    pseudonym: "BlueStar90",
    uploadedAt: "2024-01-14",
    upvotes: 0,
    saves: 0,
    status: "pending",
    tags: ["GDP", "monetary policy", "inflation"],
    preview: "30 multiple choice questions covering circular flow, GDP components, and monetary policy basics.",
    pages: 8,
  },
];

export const BLOCKED_LOG = [
  {
    id: "b1",
    title: "Chemistry Midterm Answer Key Spring 2024",
    school: "Lincoln High School",
    course: "AP Chemistry",
    blockedAt: "2024-01-13",
    reason: "Prohibited: answer key",
    category: "answer-key",
  },
  {
    id: "b2",
    title: "Mr. Patterson Test Answers Unit 4",
    school: "Lincoln High School",
    course: "AP Chemistry",
    blockedAt: "2024-01-12",
    reason: "Prohibited: test answers / private teacher document",
    category: "answer-key",
  },
  {
    id: "b3",
    title: "Student Grade Roster Fall 2023",
    school: "Westview High School",
    course: "AP Calculus AB",
    blockedAt: "2024-01-11",
    reason: "Prohibited: student grades / personal information",
    category: "student-data",
  },
  {
    id: "b4",
    title: "Final Exam Current Semester Physics",
    school: "Riverside High School",
    course: "AP Physics",
    blockedAt: "2024-01-10",
    reason: "Prohibited: current exam",
    category: "current-exam",
  },
  {
    id: "b5",
    title: "Teacher Copy AP Gov Exam 2024",
    school: "Westview High School",
    course: "AP Government",
    blockedAt: "2024-01-09",
    reason: "Prohibited: teacher document / current exam",
    category: "teacher-doc",
  },
];

const ADJECTIVES = [
  "Swift", "Bold", "Calm", "Wild", "Bright", "Dark", "Fierce", "Quiet",
  "Brave", "Sharp", "Cool", "Glow", "Night", "Storm", "Blue", "Red",
];
const NOUNS = [
  "Fox", "Hawk", "Bear", "Wolf", "Eagle", "Panda", "Moose", "Deer",
  "Otter", "Lynx", "Owl", "Raven", "Kite", "Finch", "Heron", "Crane",
];

export function generatePseudonym(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}
