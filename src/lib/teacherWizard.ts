import { z } from "zod";

export const wizardSchema = z.object({
  // Step 1 — Personal information
  full_name: z.string().trim().min(2, "Enter your full name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9][0-9 ()-]{7,19}$/, "Enter a valid phone number"),
  city: z.string().trim().min(2, "Enter your city"),
  state: z.string().trim().min(2, "Enter your state"),
  current_school: z.string().trim().max(120).optional().or(z.literal("")),

  // Step 2 — Education
  qualification: z.string().trim().min(2, "Enter your highest qualification"),
  languages: z.array(z.string()).min(1, "Add at least one language"),

  // Step 3 — Teaching experience
  experience_years: z.coerce.number().min(0, "Cannot be negative").max(60, "That seems too high"),
  notice_period_days: z.coerce.number().min(0).max(365).optional(),
  headline: z.string().trim().min(6, "Write a short professional headline").max(120),
  bio: z.string().trim().max(1200).optional().or(z.literal("")),

  // Step 4 — Subjects
  subjects: z.array(z.string()).min(1, "Select at least one subject"),
  grades: z.array(z.string()).min(1, "Select at least one grade band"),

  // Step 5 — Salary expectations
  current_salary: z.coerce.number().min(0).optional(),
  expected_salary: z.coerce.number().min(1, "Enter your expected salary"),
  available_from: z.string().optional().or(z.literal("")),
  available: z.boolean(),

  // Step 6 — Resume
  resume_url: z.string().min(1, "Upload your resume to continue"),

  // Step 7 — Certificates (optional but tracked)
  certificate_count: z.coerce.number().min(0),
});

export type WizardValues = z.infer<typeof wizardSchema>;

export const emptyWizard: WizardValues = {
  full_name: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  current_school: "",
  qualification: "",
  languages: [],
  experience_years: 0,
  notice_period_days: 30,
  headline: "",
  bio: "",
  subjects: [],
  grades: [],
  current_salary: undefined,
  expected_salary: undefined as unknown as number,
  available_from: "",
  available: true,
  resume_url: "",
  certificate_count: 0,
};

export const STEPS = [
  { key: "personal", title: "Personal information", blurb: "How schools reach you.", fields: ["full_name", "email", "phone", "city", "state", "current_school"] },
  { key: "education", title: "Education", blurb: "Your qualifications and languages.", fields: ["qualification", "languages"] },
  { key: "experience", title: "Teaching experience", blurb: "Your track record in the classroom.", fields: ["experience_years", "notice_period_days", "headline", "bio"] },
  { key: "subjects", title: "Subjects", blurb: "What and whom you teach.", fields: ["subjects", "grades"] },
  { key: "salary", title: "Salary expectations", blurb: "Kept private until you apply.", fields: ["current_salary", "expected_salary", "available_from", "available"] },
  { key: "resume", title: "Upload resume", blurb: "PDF or Word, up to 10 MB.", fields: ["resume_url"] },
  { key: "certificates", title: "Upload certificates", blurb: "Degrees, training and ID proofs.", fields: ["certificate_count"] },
  { key: "review", title: "Review", blurb: "Check everything, then submit.", fields: [] },
] as const;

export type StepKey = (typeof STEPS)[number]["key"];

/** Validate only the fields belonging to one step. */
export function validateStep(stepIndex: number, values: WizardValues) {
  const step = STEPS[stepIndex];
  const errors: Record<string, string> = {};
  if (!step) return errors;
  const result = wizardSchema.safeParse(values);
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = String(issue.path[0]);
    if ((step.fields as readonly string[]).includes(field) && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export const REQUIRED_FIELDS: (keyof WizardValues)[] = [
  "full_name",
  "email",
  "phone",
  "city",
  "state",
  "qualification",
  "languages",
  "experience_years",
  "headline",
  "subjects",
  "grades",
  "expected_salary",
  "resume_url",
];

export function completionPercent(values: WizardValues) {
  const filled = REQUIRED_FIELDS.filter((field) => {
    const value = values[field];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "number") return !Number.isNaN(value);
    return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
  }).length;
  return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

export const SUBJECT_OPTIONS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", "Hindi",
  "Social Studies", "History", "Geography", "Economics", "Computer Science",
  "Business Studies", "Accountancy", "Physical Education", "Art", "Music",
  "Early Years", "Special Education",
];

export const GRADE_OPTIONS = [
  "Pre-primary", "Grades 1–2", "Grades 3–5", "Grades 6–8", "Grades 9–10", "Grades 11–12",
];

export const LANGUAGE_OPTIONS = [
  "English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali",
  "Gujarati", "Malayalam", "Urdu", "French", "Spanish",
];
