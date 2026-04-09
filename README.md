# Croppy (Vite + React)

Croppy is a client-side social media image crop studio. Upload once, export multiple platform-specific sizes.

## What Croppy Does

- Runs fully in-browser (no server image uploads)
- Supports major social/web presets (YouTube, Instagram, X, LinkedIn, Facebook, TikTok, Pinterest, Snapchat, Threads, Reddit, OG)
- Provides interactive crop controls with zoom and rotation
- Exports high-resolution JPG, PNG, and WEBP output
- Includes safe-zone overlays for relevant presets (for example YouTube banner visibility)

## Scripts

- `npm run dev` starts the Vite dev server
- `npm run build` runs TypeScript checks and creates a production build
- `npm run preview` serves the production build locally
- `npm run lint` runs ESLint across the project

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the app:

`http://localhost:5173`

## Run From Repo Root

If your terminal is at the repository root (`Croppy/`) instead of `Croppy/client/`, use:

```bash
npm --prefix /Users/adilhusain/Downloads/Croppy/client run dev
```

## Tech Stack

- React 19
- Vite 7
- TypeScript
- Tailwind CSS v4 utilities (via `@import "tailwindcss"`)
- `react-easy-crop` for crop interactions

## Project Layout

- `src/App.tsx`: main Croppy UI
- `src/styles.css`: theme and utility styling
- `lib/presets.ts`: platform and dimension presets
- `lib/crop-image.ts`: canvas export pipeline
- `public/`: static assets (favicon)
