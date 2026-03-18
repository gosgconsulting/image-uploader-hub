# Project Overview

This app is built with:
- Vite + React 18 + TypeScript
- Tailwind CSS & shadcn/ui
- TanStack Query
- Supabase for data and auth

## Getting Started

1. Install dependencies:
   - npm i
2. Run the dev server:
   - npm run dev
3. Build for production:
   - npm run build
4. Preview the build:
   - npm run preview

## Supabase

The Supabase client is initialized at:
- src/integrations/supabase/client.ts

Ensure your Supabase project URL and anon key are configured in your environment (.env) if needed.

## Testing

- Run all tests: npm run test
- Watch mode: npm run test:watch

## Notes

- All data access should go through Supabase. Any previous references to third-party project builders or tagging plugins have been removed.