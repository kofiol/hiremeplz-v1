# Agents Guide • hiremeplz.app

## Tech Stack
- **Frontend:** Next.js (App Router), React  
- **Language & Modules:** TypeScript, ESM modules  
- **Monorepo & Package Management:** pnpm + Turborepo  
- **UI & Styling:** Tailwind CSS, shadcn/ui, Radix UI  
- **State & Data:** Redux Toolkit, TanStack Table  
- **AI & Automation:** OpenAI Agents SDK, trigger.dev  
- **Testing & Quality:** Vitest, ESLint (flat config), Prettier  

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
- Always consult skills in `skills/*` for React and web guidelines  

## PR instructions
- Title format: `[<project_name>] <Title>`  
- Always run `pnpm lint` and `pnpm test` before committing  
- Add or update tests for any code changes