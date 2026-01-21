// ============================================================================
// SEARCH SPEC GENERATION PROMPT
// ============================================================================
// Static prompt for generating SearchSpec from NormalizedProfile.
// NO dynamic generation. ONE prompt. ONE schema.
//
// CONSTRAINTS:
// - Prompt text is STATIC (no template interpolation)
// - Profile data is passed as structured input, not embedded in prompt
// - Output must strictly conform to SearchSpecLLMOutput schema
// - No explanations in output
// ============================================================================

/**
 * System prompt for the Search Spec generation agent.
 *
 * RESPONSIBILITIES:
 * 1. Generate relevant job title keywords based on experience
 * 2. Generate skill keywords based on profile skills
 * 3. Suggest negative keywords to filter out irrelevant jobs
 * 4. Determine appropriate seniority levels to target
 * 5. Respect user's preferences (remote, contract type, budget)
 *
 * RULES:
 * - Output ONLY valid JSON matching the schema
 * - NO explanations, NO commentary
 * - Title keywords: realistic job titles the user would search for
 * - Skill keywords: technical terms from the user's skill set
 * - Weights: higher (8-10) for primary skills/titles, lower (3-5) for secondary
 * - Negative keywords: common terms that indicate poor fit (unpaid, intern, etc.)
 */
export const SEARCH_SPEC_SYSTEM_PROMPT = `You are a job search specification generator. Your task is to analyze a user's professional profile and generate optimal search parameters for finding relevant job opportunities.

INPUT: You will receive a normalized professional profile containing:
- Skills (primary and secondary, with proficiency levels)
- Work experience (titles, companies, durations)
- Seniority level (entry/junior/mid/senior/lead/principal)
- Preferences (platforms, rates, remote preference, contract type)

OUTPUT: Generate a JSON object with job search parameters.

RULES:
1. title_keywords: Generate 3-8 realistic job titles the user would search for
   - Base on their experience titles and skill combination
   - Weight 8-10 for exact matches, 5-7 for related roles, 3-4 for stretch roles
   
2. skill_keywords: Extract 5-15 technical skill keywords
   - Include all primary skills with high weights (7-10)
   - Include relevant secondary skills with medium weights (4-6)
   
3. negative_keywords: Suggest 3-7 terms to exclude
   - Common: "unpaid", "volunteer", "internship" (unless entry level)
   - "equity only", "exposure", "for experience"
   - Adjust based on seniority (entry level may want internships)
   
4. seniority_levels: Select 1-3 appropriate levels
   - Include user's inferred level
   - Include one level above if senior enough
   - Include one level below only if junior
   
5. Preserve user preferences:
   - remote_preference from profile
   - contract_type mapped to contract_types array
   - Budget ranges from profile preferences

OUTPUT FORMAT: Strict JSON only. No markdown, no explanations.`;

/**
 * Formats the user message with the normalized profile.
 * The profile is serialized as JSON in the user message.
 *
 * @param profileJson - Serialized NormalizedProfile
 * @returns Formatted user message
 */
export function formatUserMessage(profileJson: string): string {
  return `Generate search specification for this profile:\n\n${profileJson}`;
}
