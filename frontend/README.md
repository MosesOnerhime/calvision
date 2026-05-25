# CalVision Frontend

React, TypeScript, Vite, and Tailwind frontend for CalVision.

## Development

```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev -- --port 3000
```

## Build

```bash
npm run build
```

The backend origin is configured with `VITE_API_URL`. If it is omitted, the app
defaults to `http://localhost:8000`.
