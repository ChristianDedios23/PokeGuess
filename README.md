# PokeGuess

Multiplayer Pokémon guessing game. Create a room, share the link, ready up, then play and chat.

## Stack

- **Backend** — Express, DynamoDB, WebSockets (`backend/`)
- **Frontend** — Next.js (`frontend/`)

## Run locally

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run db:up
npm run db:setup
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- App: http://localhost:3001
- API: http://localhost:3000
- API docs: http://localhost:3000/api-docs

## Flow

1. Enter your name → create room
2. Share `/room/{code}` with a friend
3. Both ready up → host starts the game
4. Chat opens once the game is active
