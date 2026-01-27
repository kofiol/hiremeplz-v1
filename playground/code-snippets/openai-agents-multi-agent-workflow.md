# OpenAI Agents Multi-Agent Workflow Example

Multi-agent workflow with a user-facing agent that passes a URL to a LinkedIn scraping agent.

```typescript
import { tool, Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { z } from "zod";

// Tool definitions
const triggerLinkedinScraping = tool({
  name: "triggerLinkedinScraping",
  description: "Triggers scraping of user's LinkedIn profile given its URL.",
  parameters: z.object({
    url: z.string()
  }),
  execute: async (input: {url: string}) => {
    // TODO: Unimplemented
  },
});
const LinkedinScrapingAgentSchema = z.object({});
const UserFacingAgentSchema = z.object({ URL: z.string() });
const linkedinScrapingAgent = new Agent({
  name: "LinkedIn scraping agent",
  instructions: "Uses the scraping function as a tool, gets URL from the user facing agent",
  model: "gpt-4.1-nano-2025-04-14",
  tools: [
    triggerLinkedinScraping
  ],
  outputType: LinkedinScrapingAgentSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    parallelToolCalls: true,
    maxTokens: 2048,
    store: true
  }
});

const userFacingAgent = new Agent({
  name: "User facing agent",
  instructions: "User facing agent. Passes the URL to the next agent",
  model: "gpt-4.1-nano-2025-04-14",
  outputType: UserFacingAgentSchema,
  modelSettings: {
    temperature: 1,
    topP: 1,
    maxTokens: 2048,
    store: true
  }
});

type WorkflowInput = { input_as_text: string };

// Main code entrypoint
export const runWorkflow = async (workflow: WorkflowInput) => {
  return await withTrace("New agent", async () => {
    const conversationHistory: AgentInputItem[] = [
      { role: "user", content: [{ type: "input_text", text: workflow.input_as_text }] }
    ];
    const runner = new Runner({
      traceMetadata: {
        trace_source: "agent-builder",
        workflow_id: "wf_69785a3b8d8881908aa3bd0ecac81ad80f90fc539b90716b"
      }
    });
    const userFacingAgentResultTemp = await runner.run(
      userFacingAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...userFacingAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!userFacingAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const userFacingAgentResult = {
      output_text: JSON.stringify(userFacingAgentResultTemp.finalOutput),
      output_parsed: userFacingAgentResultTemp.finalOutput
    };
    const linkedinScrapingAgentResultTemp = await runner.run(
      linkedinScrapingAgent,
      [
        ...conversationHistory
      ]
    );
    conversationHistory.push(...linkedinScrapingAgentResultTemp.newItems.map((item) => item.rawItem));

    if (!linkedinScrapingAgentResultTemp.finalOutput) {
        throw new Error("Agent result is undefined");
    }

    const linkedinScrapingAgentResult = {
      output_text: JSON.stringify(linkedinScrapingAgentResultTemp.finalOutput),
      output_parsed: linkedinScrapingAgentResultTemp.finalOutput
    };
  });
}
```
