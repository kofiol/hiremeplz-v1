import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CollectedData } from "@/lib/onboarding/schema";
import { isSkipped } from "@/lib/onboarding/schema";

export type TeamMode = "solo" | "team";

export type ProfilePath = "linkedin" | "upwork" | "cv" | "portfolio" | "manual" | null;

export type ExperienceLevel =
  | "intern_new_grad"
  | "entry"
  | "mid"
  | "senior"
  | "lead"
  | "director";

export type OnboardingProfileSetup = {
  method: Exclude<ProfilePath, null>;
  linkedinUrl: string;
  upworkUrl: string;
  portfolioUrl: string;
};

export type OnboardingProfile = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
};

export type OnboardingSkill = {
  id: string;
  name: string;
  level: number;
  years: number | null;
};

export type OnboardingExperience = {
  id: string;
  title: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  highlights: string;
};

export type OnboardingEducation = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
};

export type OnboardingPreferences = {
  platforms: ("upwork" | "linkedin")[];
  currency: string;
  hourlyMin: number | null;
  hourlyMax: number | null;
  fixedBudgetMin: number | null;
  projectTypes: string[];
  timeZones: string[];
  remoteOnly: boolean;
  preferredProjectLengthDays: [number, number];
  engagementTypes: ("full_time" | "part_time" | "internship")[];
  tightness: number;
};

export type OnboardingCv = {
  storagePath: string | null;
  filename: string | null;
  uploadProgress: number;
  isUploading: boolean;
  error: string | null;
};

export type OnboardingCompletion = {
  score: number;
  missingFields: string[];
};

export type OnboardingState = {
  currentStep: number;
  totalSteps: number;
  teamMode: TeamMode;
  profilePath: ProfilePath;
  profileSetup: OnboardingProfileSetup;
  experienceLevel: ExperienceLevel | null;
  profile: OnboardingProfile;
  cv: OnboardingCv;
  skills: OnboardingSkill[];
  experiences: OnboardingExperience[];
  educations: OnboardingEducation[];
  preferences: OnboardingPreferences;
  completion: OnboardingCompletion;
  isSaving: boolean;
  saveError: string | null;
};

const initialState: OnboardingState = {
  currentStep: 1,
  totalSteps: 3,
  teamMode: "solo",
  profilePath: null,
  profileSetup: {
    method: "manual",
    linkedinUrl: "",
    upworkUrl: "",
    portfolioUrl: "",
  },
  experienceLevel: null,
  profile: {
    firstName: "",
    lastName: "",
    dateOfBirth: null,
  },
  cv: {
    storagePath: null,
    filename: null,
    uploadProgress: 0,
    isUploading: false,
    error: null,
  },
  skills: [],
  experiences: [],
  educations: [],
  preferences: {
    platforms: ["upwork", "linkedin"],
    currency: "USD",
    hourlyMin: null,
    hourlyMax: null,
    fixedBudgetMin: null,
    projectTypes: ["short_gig", "medium_project"],
    timeZones: [],
    remoteOnly: true,
    preferredProjectLengthDays: [7, 30],
    engagementTypes: [],
    tightness: 3,
  },
  completion: {
    score: 0,
    missingFields: [],
  },
  isSaving: false,
  saveError: null,
};

function generateId() {
  return Math.random().toString(36).slice(2);
}

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setCurrentStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    nextStep(state) {
      if (state.currentStep < state.totalSteps) {
        state.currentStep += 1;
      }
    },
    previousStep(state) {
      if (state.currentStep > 1) {
        state.currentStep -= 1;
      }
    },
    setTeamMode(state, action: PayloadAction<TeamMode>) {
      state.teamMode = action.payload;
    },
    setProfilePath(state, action: PayloadAction<ProfilePath>) {
      state.profilePath = action.payload;
      if (action.payload) {
        state.profileSetup.method = action.payload;
      }
    },
    setProfileSetupUrl(
      state,
      action: PayloadAction<{
        field: "linkedinUrl" | "upworkUrl" | "portfolioUrl";
        value: string;
      }>,
    ) {
      state.profileSetup[action.payload.field] = action.payload.value;
    },
    setExperienceLevel(state, action: PayloadAction<ExperienceLevel | null>) {
      state.experienceLevel = action.payload;
    },
    setProfileField(
      state,
      action: PayloadAction<{ field: keyof OnboardingProfile; value: string | null }>,
    ) {
      const { field, value } = action.payload;
      if (field === "dateOfBirth") {
        state.profile.dateOfBirth = value;
      } else if (field === "firstName") {
        state.profile.firstName = value ?? "";
      } else if (field === "lastName") {
        state.profile.lastName = value ?? "";
      }
    },
    setCvUploading(state) {
      state.cv.isUploading = true;
      state.cv.error = null;
      state.cv.uploadProgress = 0;
    },
    setCvUploadProgress(state, action: PayloadAction<number>) {
      state.cv.uploadProgress = action.payload;
    },
    setCvUploadResult(
      state,
      action: PayloadAction<{ storagePath: string; filename: string }>,
    ) {
      state.cv.isUploading = false;
      state.cv.uploadProgress = 100;
      state.cv.storagePath = action.payload.storagePath;
      state.cv.filename = action.payload.filename;
    },
    setCvUploadError(state, action: PayloadAction<string>) {
      state.cv.isUploading = false;
      state.cv.error = action.payload;
    },
    addSkill(state, action: PayloadAction<{ name: string }>) {
      const name = action.payload.name.trim();
      if (!name) {
        return;
      }
      state.skills.push({
        id: generateId(),
        name,
        level: 3,
        years: null,
      });
    },
    updateSkill(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<OnboardingSkill, "id">>;
      }>,
    ) {
      const { id, changes } = action.payload;
      const skill = state.skills.find((item) => item.id === id);
      if (!skill) {
        return;
      }
      if (typeof changes.name === "string") {
        skill.name = changes.name;
      }
      if (typeof changes.level === "number") {
        skill.level = changes.level;
      }
      if (typeof changes.years === "number" || changes.years === null) {
        skill.years = changes.years;
      }
    },
    removeSkill(state, action: PayloadAction<string>) {
      state.skills = state.skills.filter((item) => item.id !== action.payload);
    },
    addExperience(
      state,
      action: PayloadAction<{
        title: string;
        company: string;
        startDate: string | null;
        endDate: string | null;
        highlights: string;
      }>,
    ) {
      state.experiences.push({
        id: generateId(),
        title: action.payload.title,
        company: action.payload.company,
        startDate: action.payload.startDate,
        endDate: action.payload.endDate,
        highlights: action.payload.highlights,
      });
    },
    updateExperience(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<OnboardingExperience, "id">>;
      }>,
    ) {
      const { id, changes } = action.payload;
      const experience = state.experiences.find((item) => item.id === id);
      if (!experience) {
        return;
      }
      if (typeof changes.title === "string") {
        experience.title = changes.title;
      }
      if (typeof changes.company === "string") {
        experience.company = changes.company;
      }
      if (typeof changes.startDate !== "undefined") {
        experience.startDate = changes.startDate;
      }
      if (typeof changes.endDate !== "undefined") {
        experience.endDate = changes.endDate;
      }
      if (typeof changes.highlights === "string") {
        experience.highlights = changes.highlights;
      }
    },
    removeExperience(state, action: PayloadAction<string>) {
      state.experiences = state.experiences.filter(
        (item) => item.id !== action.payload,
      );
    },
    addEducation(
      state,
      action: PayloadAction<{
        school: string;
        degree: string;
        field: string;
        startYear: string;
        endYear: string;
      }>,
    ) {
      state.educations.push({
        id: generateId(),
        school: action.payload.school,
        degree: action.payload.degree,
        field: action.payload.field,
        startYear: action.payload.startYear,
        endYear: action.payload.endYear,
      });
    },
    updateEducation(
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<OnboardingEducation, "id">>;
      }>,
    ) {
      const { id, changes } = action.payload;
      const education = state.educations.find((item) => item.id === id);
      if (!education) {
        return;
      }
      if (typeof changes.school === "string") {
        education.school = changes.school;
      }
      if (typeof changes.degree === "string") {
        education.degree = changes.degree;
      }
      if (typeof changes.field === "string") {
        education.field = changes.field;
      }
      if (typeof changes.startYear === "string") {
        education.startYear = changes.startYear;
      }
      if (typeof changes.endYear === "string") {
        education.endYear = changes.endYear;
      }
    },
    removeEducation(state, action: PayloadAction<string>) {
      state.educations = state.educations.filter(
        (item) => item.id !== action.payload,
      );
    },
    setPlatforms(
      state,
      action: PayloadAction<("upwork" | "linkedin")[]>,
    ) {
      state.preferences.platforms = action.payload;
    },
    setCurrency(state, action: PayloadAction<string>) {
      state.preferences.currency = action.payload;
    },
    setHourlyRange(
      state,
      action: PayloadAction<{ min: number | null; max: number | null }>,
    ) {
      state.preferences.hourlyMin = action.payload.min;
      state.preferences.hourlyMax = action.payload.max;
    },
    setFixedBudgetMin(state, action: PayloadAction<number | null>) {
      state.preferences.fixedBudgetMin = action.payload;
    },
    setProjectTypes(state, action: PayloadAction<string[]>) {
      state.preferences.projectTypes = action.payload;
    },
    setTimeZones(state, action: PayloadAction<string[]>) {
      state.preferences.timeZones = action.payload;
    },
    setRemoteOnly(state, action: PayloadAction<boolean>) {
      state.preferences.remoteOnly = action.payload;
    },
    setPreferredProjectLengthDays(
      state,
      action: PayloadAction<[number, number]>,
    ) {
      state.preferences.preferredProjectLengthDays = action.payload;
    },
    setEngagementTypes(
      state,
      action: PayloadAction<("full_time" | "part_time" | "internship")[]>,
    ) {
      state.preferences.engagementTypes = action.payload;
    },
    setTightness(state, action: PayloadAction<number>) {
      state.preferences.tightness = action.payload;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.isSaving = action.payload;
      if (action.payload) {
        state.saveError = null;
      }
    },
    setSaveError(state, action: PayloadAction<string | null>) {
      state.saveError = action.payload;
      state.isSaving = false;
    },
    setCompletion(
      state,
      action: PayloadAction<{ score: number; missingFields: string[] }>,
    ) {
      state.completion.score = action.payload.score;
      state.completion.missingFields = action.payload.missingFields;
    },
    setCollectedData(_state, action: PayloadAction<CollectedData>) {
      // Sync chat-collected data into Redux for cross-component access
      // Note: This maps from the chat's CollectedData shape to the Redux OnboardingState shape
      // but we store it as-is on a dedicated key rather than trying to reconcile all fields
      const d = action.payload;
      return {
        ...initialState,
        teamMode: d.teamMode ?? "solo",
        profilePath: d.profilePath ?? null,
        profileSetup: {
          ...initialState.profileSetup,
          linkedinUrl: isSkipped(d.linkedinUrl) ? "" : (d.linkedinUrl ?? ""),
        },
        experienceLevel: isSkipped(d.experienceLevel) ? null : (d.experienceLevel ?? null),
        profile: {
          ...initialState.profile,
          firstName: d.fullName?.split(" ")[0] ?? "",
          lastName: d.fullName?.split(" ").slice(1).join(" ") ?? "",
        },
        skills: isSkipped(d.skills) ? [] : (d.skills ?? []).map((s) => ({
          id: generateId(),
          name: s.name,
          level: 3,
          years: null,
        })),
        experiences: isSkipped(d.experiences) ? [] : (d.experiences ?? []).map((e) => ({
          id: generateId(),
          title: e.title,
          company: e.company ?? "",
          startDate: e.startDate,
          endDate: e.endDate,
          highlights: e.highlights ?? "",
        })),
        educations: isSkipped(d.educations) ? [] : (d.educations ?? []).map((e) => ({
          id: generateId(),
          school: e.school,
          degree: e.degree ?? "",
          field: e.field ?? "",
          startYear: e.startYear ?? "",
          endYear: e.endYear ?? "",
        })),
        preferences: {
          ...initialState.preferences,
          currency: d.currency ?? "USD",
          hourlyMin: isSkipped(d.currentRateMin) ? null : d.currentRateMin,
          hourlyMax: isSkipped(d.currentRateMax) ? null : d.currentRateMax,
          engagementTypes: isSkipped(d.engagementTypes) ? [] : (d.engagementTypes ?? []) as ("full_time" | "part_time" | "internship")[],
        },
      };
    },
    resetOnboardingState() {
      return initialState;
    },
  },
});

export const {
  setCurrentStep,
  nextStep,
  previousStep,
  setTeamMode,
  setProfilePath,
  setProfileSetupUrl,
  setExperienceLevel,
  setProfileField,
  setCvUploading,
  setCvUploadProgress,
  setCvUploadResult,
  setCvUploadError,
  addSkill,
  updateSkill,
  removeSkill,
  addExperience,
  updateExperience,
  removeExperience,
  addEducation,
  updateEducation,
  removeEducation,
  setPlatforms,
  setCurrency,
  setHourlyRange,
  setFixedBudgetMin,
  setProjectTypes,
  setTimeZones,
  setRemoteOnly,
  setPreferredProjectLengthDays,
  setEngagementTypes,
  setTightness,
  setSaving,
  setSaveError,
  setCompletion,
  setCollectedData,
  resetOnboardingState,
} = onboardingSlice.actions;

export default onboardingSlice.reducer;
