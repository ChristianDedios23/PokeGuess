# PokeGuess

Multiplayer Pokémon guessing game. Create a room, share the link, ready up, then play and chat.

**Live demo:** [poke-guess-who.vercel.app](https://poke-guess-who.vercel.app)

## Stack

- **Backend** — Express, DynamoDB, WebSockets (`backend/`)
- **Frontend** — Next.js (`frontend/`)

## Architecture

- **Frontend** is deployed on Vercel, built from `frontend/` on every push to `main`.
- **Backend** runs as a Docker container on an AWS EC2 instance, reverse-proxied by nginx with a Let's Encrypt TLS certificate. It authenticates to DynamoDB via an EC2 IAM instance role (no long-lived AWS keys on the box).
- **Database** is AWS DynamoDB (two tables: `GameRooms` with a TTL for ephemeral room state, `FeedbackReports` for user-submitted bug reports).
- Deploys are manual and SSH-driven (`backend/deploy/deploy.sh`) rather than CI-based — see `backend/deploy/` for the deploy script and reverse-proxy config.

## Run locally

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:up
npm run db:setup
npm run pokemon:build   # one-time PokéAPI → data/pokemon.json (no API calls at runtime)
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- App: http://localhost:3001
- API: http://localhost:3000
- API docs: http://localhost:3000/api-docs

## Pokémon data

Species data is prebuilt into `backend/data/pokemon.json` (id, name, sprite, types, abilities). Runtime uses only that file — never PokéAPI.

```bash
cd backend
npm run pokemon:build   # refresh cache (rare)
```

- `GET /pokemon` — full list
- `GET /pokemon/:id` — one species

## Flow

1. Enter your name → create room
2. Share `/room/{code}` with a friend
3. Both ready up → host starts the game
4. Chat opens once the game is active
