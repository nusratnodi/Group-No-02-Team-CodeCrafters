# Tripza web app (frontend)

React 19 + TypeScript + Vite app built from the Tripza Figma design. See the [main README](../README.md) for the full setup.

```bash
npm install
npm run dev     # http://localhost:5173 (expects the API on localhost:4000)
npm test        # 21 unit + component tests
npm run build   # production build in dist/ (served by the backend with `npm start`)
```

`src/index.css` is the design system from the Figma prototype, kept unchanged; `src/app.css` adds the extra states and components the working app needs, using the same tokens.
