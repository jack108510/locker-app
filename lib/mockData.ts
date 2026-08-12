export type MaterialType =
  | "assignment"
  | "quiz"
  | "exam"
  | "review-packet"
  | "practice-test"
  | "worksheet";

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
  { value: "assignment", label: "Old Assignment", emoji: "" },
  { value: "quiz", label: "Past Quiz", emoji: "" },
  { value: "exam", label: "Past Exam", emoji: "" },
  { value: "review-packet", label: "Review Packet", emoji: "" },
  { value: "practice-test", label: "Practice Test", emoji: "" },
  { value: "worksheet", label: "Worksheet", emoji: "" },
];

export const APPROVED_MATERIALS: StudyMaterial[] = [
  {
    id: "h1",
    title: "Chemistry 12 Bonding Quiz — Fall 2022",
    type: "quiz",
    school: "Halifax West High School",
    course: "Chemistry 12",
    teacher: "Ms. Clarke",
    pseudonym: "HarbourFox42",
    uploadedAt: "2024-01-16",
    upvotes: 58,
    saves: 34,
    status: "approved",
    tags: ["bonding", "VSEPR", "quiz"],
    preview: "Scanned past quiz covering bonding, polarity, molecular shapes, and intermolecular forces. Useful for seeing how questions were worded.",
    pages: 7,
  },
  {
    id: "h2",
    title: "Biology 11 Cell Unit Assignment",
    type: "assignment",
    school: "Halifax West High School",
    course: "Biology 11",
    teacher: "Mr. Bennett",
    pseudonym: "NorthOwl19",
    uploadedAt: "2024-01-16",
    upvotes: 41,
    saves: 29,
    status: "approved",
    tags: ["cells", "organelles", "assignment"],
    preview: "Old assignment page covering organelles, membrane transport, microscope terms, and diagrams from the cell unit.",
    pages: 3,
  },
  {
    id: "h3",
    title: "Math 11 Functions Quiz — 2021",
    type: "quiz",
    school: "Citadel High School",
    course: "Math 11",
    teacher: "Ms. Rivera",
    pseudonym: "FogHawk77",
    uploadedAt: "2024-01-15",
    upvotes: 36,
    saves: 22,
    status: "approved",
    tags: ["functions", "quadratics", "graphs"],
    preview: "Past quiz scan with functions, transformations, graphing, and domain/range questions.",
    pages: 5,
  },
];

export const COMMUNITY_STATS = {
  submitted: 1284,
  approved: 913,
  schools: 42,
};

const RISKY_KEYWORDS = [
  "exam key", "answer key", "test answers", "midterm answers", "final exam answers",
  "teacher copy", "teacher edition", "grade book", "student grades", "roster",
  "current exam", "this semester", "this year", "2024 exam", "actual test",
];

export function moderateUpload(
  title: string,
  type: MaterialType,
  scannedText = ""
): { status: ModerationStatus; reason?: string } {
  const lowerTitle = title.toLowerCase();
  const lowerScan = scannedText.toLowerCase();
  const reviewText = `${lowerTitle}\n${lowerScan}`;

  for (const kw of RISKY_KEYWORDS) {
    if (reviewText.includes(kw)) {
      return {
        status: "blocked",
        reason: `Upload text contains prohibited keyword: "${kw}". Current/private exams, answer keys, and personal student info cannot be uploaded.`,
      };
    }
  }

  const alwaysPending = ["exam", "quiz"];
  if (alwaysPending.includes(type)) {
    return { status: "pending" };
  }

  const riskySuffixes = ["current", "this week", "test", "quiz", "midterm", "final"];
  if (riskySuffixes.some((s) => lowerTitle.includes(s))) {
    return {
      status: "pending",
      reason: "Drop flagged for review — title suggests it may reference a current assessment.",
    };
  }

  return { status: "approved" };
}

export const PENDING_QUEUE: StudyMaterial[] = [
  {
    id: "q1",
    title: "World History Chapter 12 Old Quiz",
    type: "quiz",
    school: "Riverside High School",
    course: "World History",
    teacher: "Mrs. Allen",
    pseudonym: "RedDeer44",
    uploadedAt: "2024-01-15",
    upvotes: 0,
    saves: 0,
    status: "pending",
    tags: ["cold war", "decolonization"],
    preview: "Old quiz scan based on Chapter 12: cold war and decolonization prompts.",
    pages: 4,
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
