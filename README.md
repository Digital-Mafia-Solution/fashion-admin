# Digital Mafia Boilerplate

This repository has been converted into a reusable boilerplate built with Vite, React, and TypeScript. It contains a minimal project structure and a handful of generic components to help you kickstart new projects quickly.

## Features

- Vite for fast development and build
- React with TypeScript
- Tailwind CSS configured in `src/global.css`
- Minimal routing via `react-router-dom`

## Quick start

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open `http://localhost:8080` (or the port Vite reports).

## What I changed

- Removed site-specific content and pages and replaced them with placeholders in `src/pages`.
- Simplified header and footer components in `src/components`.
- Replaced analytics/cookie UI with no-op placeholders so you can plug-in your own implementations.
- Simplified `src/App.tsx` to a minimal router and updated `index.html` and `src/global.css` for a neutral starting point.

## Next steps

- Replace placeholder pages in `src/pages` with your app views.
- Add any global providers (state, auth, analytics) in `src/App.tsx` as needed.
- Update `package.json` scripts or dependencies for your project's needs.

If you want, I can:

- Commit these changes and create a clean branch.
- Remove unused dependencies from `package.json`.
- Wire up a CI workflow or prettier/ESLint setup.

Ready for the next step? Reply with what you'd like done next.
