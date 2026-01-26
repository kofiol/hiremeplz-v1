export { setPgPoolForTests, withPgTransaction, writeJobSearchBatch } from "../transaction.js";
export type { JobSearchBatchWriteInput, JobSearchBatchWriteResult } from "../transaction.js";

// User profile fetching
export { 
  fetchUserProfile, 
  fetchUserProfileByTeam, 
  fetchUserProfileWithClient,
  setProfileFetcherPool 
} from "./fetch-profile.js";
export type { FetchedUserProfile } from "./fetch-profile.js";
