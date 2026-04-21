# AI Rules

This document describes the tech stack and rules for AI-assisted development on this project.

## Tech Stack

- **React 18 + TypeScript** — All UI is built with React functional components and TypeScript. No class components. All files use `.tsx` or `.ts` extensions.
- **Vite** — Build tool and dev server. Config lives in `vite.config.ts`. Do not use Create React App or any other bundler.
- **React Router v6** — Client-side routing via `react-router-dom`. All routes are defined in `src/App.tsx` using `<Routes>` and `<Route>`. Pages live in `src/pages/`.
- **Tailwind CSS v3** — All styling is done with Tailwind utility classes. Do not write custom CSS files or use inline `style` props unless absolutely necessary. Config lives in `tailwind.config.ts`.
- **shadcn/ui** — Primary component library. Pre-built components live in `src/components/ui/`. Do not edit files in `src/components/ui/` — create new wrapper components instead.
- **Radix UI** — Underlying primitive library for shadcn/ui. Use Radix primitives directly only when shadcn/ui does not provide a suitable component.
- **TanStack Query (React Query v5)** — All async server state (fetching, caching, mutations) is managed with `@tanstack/react-query`. Do not use `useEffect` for data fetching.
- **Supabase** — Backend-as-a-service for database and auth. The client is initialized in `src/integrations/supabase/client.ts`. Types are generated in `src/integrations/supabase/types.ts`.
- **React Hook Form + Zod** — All forms use `react-hook-form` with `@hookform/resolvers/zod` for validation. Define schemas with `zod` and pass them to `useForm` via `zodResolver`.
- **Recharts** — Use `recharts` for all charts and data visualizations. Do not use other charting libraries.

## Library Usage Rules

### Icons
- **Always use `lucide-react`** for icons. Do not use other icon libraries (e.g., FontAwesome, Heroicons, react-icons).

### UI Components
- **Always prefer shadcn/ui components** (`src/components/ui/`) over building from scratch.
- Do **not** modify files inside `src/components/ui/`. If customization is needed, create a new component in `src/components/` that wraps the shadcn/ui primitive.
- Use `class-variance-authority` (CVA) and `tailwind-merge` / `clsx` (via `cn()` from `src/lib/utils.ts`) for conditional class composition.

### Styling
- Use **Tailwind CSS classes exclusively**. Avoid writing new CSS rules in `.css` files.
- Use CSS variables for theming (already configured via shadcn/ui's `cssVariables: true` setup in `components.json`).
- For dark mode, use the `next-themes` package (already installed).

### Forms
- All forms **must** use `react-hook-form` + `zod`. Do not use uncontrolled forms or manual `useState` for form fields.
- Use the `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, and `<FormMessage>` components from `src/components/ui/form.tsx`.

### Data Fetching & State
- Use **TanStack Query** (`useQuery`, `useMutation`) for all server data. Do not fetch data inside `useEffect`.
- Use React's built-in `useState` and `useContext` for local/UI state only.
- Do not introduce additional state management libraries (e.g., Redux, Zustand, Jotai).

### Notifications / Toasts
- Use **`sonner`** (via `src/components/ui/sonner.tsx`) for toast notifications as the primary option.
- The legacy `useToast` hook (`src/hooks/use-toast.ts`) is available but prefer `sonner` for new code.

### Date Handling
- Use **`date-fns`** for all date formatting and manipulation. Do not use `moment.js` or `dayjs`.

### Routing
- All routes are declared in **`src/App.tsx`** only. Do not define routes elsewhere.
- Use `react-router-dom` hooks (`useNavigate`, `useParams`, `useLocation`) for navigation and route access.

### Testing
- Use **Vitest** + **`@testing-library/react`** for unit and component tests.
- Test files live in `src/test/` or co-located with source files using `.test.ts` / `.test.tsx` extensions.

### File & Folder Conventions
- Pages → `src/pages/`
- Reusable components → `src/components/`
- shadcn/ui primitives → `src/components/ui/` (do not edit)
- Hooks → `src/hooks/`
- Utilities → `src/lib/` or `src/utils/`
- Supabase integration → `src/integrations/supabase/`
