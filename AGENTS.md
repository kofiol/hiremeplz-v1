# Agents Guide • hiremeplz.app

## Rules:

After completing a task that involves tool use, provide a quick summary of the work you've done

By default, implement changes rather than only suggesting them. If the user's intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing. Try to infer the user's intent about whether a tool call (e.g. file edit or read) is intended or not, and act accordingly.

If you intend to call multiple tools and there are no dependencies between the tool calls, make all of the independent tool calls in parallel. Prioritize calling tools simultaneously whenever the actions can be done in parallel rather than sequentially. For example, when reading 3 files, run 3 tool calls in parallel to read all 3 files into context at the same time. Maximize use of parallel tool calls where possible to increase speed and efficiency.

However, if some tool calls depend on previous calls to inform dependent values like the parameters, do not call these tools in parallel and instead call them sequentially. Never use placeholders or guess missing parameters in tool calls.

Never speculate about code you have not opened. If the user references a specific file, you MUST read the file before answering. Make sure to investigate and read relevant files BEFORE answering questions about the codebase. Never make any claims about code before investigating unless you are certain of the correct answer - give grounded and hallucination-free answers. If the user asks you to use web search to retrieve information, always do so before providing any answers.

When an LLM is needed, please default to ChatGPT 5 Nano unless the user requests otherwise. The exact model string for ChatGPT 5 Nano is gpt-5-nano-2025-08-07.

Please write a high-quality, general-purpose solution using the standard tools available. Do not create helper scripts or workarounds to accomplish the task more efficiently. Implement a solution that works correctly for all valid inputs, not just the test cases. Do not hard-code values or create solutions that only work for specific test inputs. Instead, implement the actual logic that solves the problem generally.

Focus on understanding the problem requirements and implementing the correct algorithm. Tests are there to verify correctness, not to define the solution. Provide a principled implementation that follows best practices and software design principles.

If the task is unreasonable or infeasible, or if any of the tests are incorrect, please inform me rather than working around them. The solution should be robust, maintainable, and extendable.

## Dev environment tips
- Start the web app: `cd apps/web; pnpm dev`  
- Build everything: `pnpm build`  
- Lint all files: `pnpm lint`  
- Type-check all: `pnpm check-types`  
- Test everything: `pnpm test`  
- For package-specific tasks, use Turbo filters: `pnpm turbo run <task> --filter <package_name>`

## Code style & best practices
- Use **double quotes**; omit semicolons  
- Prefer **named exports**  
- Keep functions **small, pure, and typed**  
- Follow **shadcn/ui** patterns (`cn` util, `cva` variants, `data-*` attributes)  
- Separate server/client logic and **never log secrets**  
- You MUST consult `skills/react-best-practices` and `skills/web-design-guidelines` for React and web guidelines prior to any significant code changes. 

## PR instructions
- Title format: `[<project_name>] <Title>`  
- Always run `pnpm lint` and `pnpm test` before committing  
- Add or update tests for any code changes