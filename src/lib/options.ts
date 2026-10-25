export const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Python Developer",
  "Java Developer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "Software Engineer",
  "Database Administrator",
  "Cybersecurity Analyst",
  "DevOps Engineer",
  "HR Interview",
  "General Aptitude",
];

export const LEVELS = [
  { value: "beginner", label: "Beginner / Fresher" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
] as const;

export const CATEGORIES = [
  "Technical Knowledge",
  "Programming Fundamentals",
  "Data Structures and Algorithms",
  "Database and SQL",
  "Web Development",
  "Python",
  "Java",
  "Behavioral Questions",
  "HR Interview",
  "Aptitude and Logical Reasoning",
  "Mixed Interview",
];

export const DIFFICULTIES = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "adaptive", label: "Adaptive" },
] as const;

export const LENGTHS = [5, 10, 15, 20] as const;

export function formatDuration(s: number | null | undefined) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}
