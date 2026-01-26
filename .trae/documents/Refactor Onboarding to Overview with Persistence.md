I will refactor the onboarding flow to integrate the chatbot into the `/overview` page while preserving the legacy route and layout.

1. **Create Persistence API (`apps/web/src/app/api/v1/onboarding/progress/route.ts`)**:

   * Create a new API endpoint to save and retrieve the chatbot's state (messages and collected data) using the `user_agent_settings` table in Supabase.

   * This ensures users can pick up where they left off.

2. **Create** **`OnboardingChatbot`** **Component (`apps/web/src/components/onboarding-chatbot.tsx`)**:

   * Extract the chatbot logic and UI from the current onboarding page into a reusable component.

   * Add logic to fetch saved progress on mount and auto-save progress during the conversation.

   * Include the "Welcome to HireMePlz" screen as the initial state of this component.

3. **Update Overview Page (`apps/web/src/app/(app)/overview/page.tsx`)**:

   * Modify the page to check the user's `profile_completeness_score`.

   * If the profile is incomplete, render the `OnboardingChatbot` component instead of the dashboard.

   * This fulfills the requirement to "Make the /overview page actually the same chatbot" for new users.

4. **Update Authentication Flow (`apps/web/src/app/(auth)/auth/callback/page.tsx`)**:

   * Change the post-login redirection logic to *always* send users to `/overview`, removing the conditional redirect to `/onboarding`.

5. **Update Legacy Page (`apps/web/src/app/(onboarding)/onboarding/page.tsx`)**:

   * Replace the internal code with the new `OnboardingChatbot` component to ensure both routes share the same state and behavior.

6. **Update Completeness Reminder (`apps/web/src/components/onboarding-completeness-reminder.tsx`)**:

   * Update the "Finish onboarding" toast action to redirect users to `/overview` instead of the legacy route.

