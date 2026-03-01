# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this directory.

## Stack

- Next.js 16 with App Router (`src/app/`)
- React 19, TypeScript (strict mode)
- Tailwind CSS v4 via `@tailwindcss/postcss` plugin
- ESLint with `eslint-config-next` (core-web-vitals + typescript rules)
- Fonts: Geist Sans and Geist Mono (loaded via `next/font/google`)

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build
npm run lint     # eslint
```

## Conventions

- Path alias: `@/*` maps to `./src/*` — use `@/` imports instead of relative paths.
- Tailwind v4 uses CSS-first config — theme customization lives in `src/app/globals.css` via `@theme inline`, not a `tailwind.config` file.
- Dark mode uses `prefers-color-scheme` media query with CSS variables (`--background`, `--foreground`).
- Backend API is at `http://localhost:8000` during development.

## UI Theme (MANDATORY)

**All frontend components MUST follow the UI theme established in the landing page (`src/app/page.tsx`) and the design tokens in `src/app/globals.css`.** This applies regardless of which page or component is being built. Specifically:

- Use the semantic CSS variables (e.g. `--background`, `--foreground`, `--surface`, `--border-subtle`, `--brand-primary`, `--text-muted`, etc.) defined in `globals.css`. Never use hardcoded colors.
- Follow the same border radius, spacing, shadow, and typography patterns used on the landing page.
- Maintain visual consistency: glassmorphism effects, subtle borders, gradient accents, and the existing dark/light theme support.
- Reference `src/app/page.tsx` as the source of truth for the design language when building any new UI.

## What This Frontend Will Contain

- `/clients` dashboard — client cards with research summaries, meeting details
- Live call UI — real-time transcript display, suggestion overlay
- Audio capture via Web Media APIs (`getUserMedia` for mic, `getDisplayMedia` for speaker/tab audio)
- WebSocket connections to backend for audio streaming and real-time transcript updates
