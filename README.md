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
npm run pokemon:build   # one-time PokéAPI → data/pokemon.json (no API calls at runtime)
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- App: http://localhost:3001
- API: http://localhost:3000
- WebSocket: `ws://localhost:3000/ws`

## Backend architecture

Game actions use **WebSocket handlers** (`backend/src/handlers/`). REST is only used for health checks and Pokémon data.

```
ws/server.ts       → transport (connection lifecycle)
handlers/          → route by message action
services/          → business logic + DynamoDB
```

### WebSocket actions (implemented)

| Client → server | Description |
|-----------------|-------------|
| `createRoom` | Create a room and attach host as player 1 |
| `joinRoom` | Join as player 2 |
| `register` | Re-attach socket after navigation / refresh |
| `readyUp` | Mark yourself ready in the lobby |
| `startGame` | Host starts the match (both must be ready) |
| `sendChatMessage` | Send chat (active games only) |

| Server → client | Description |
|-----------------|-------------|
| `roomCreated`, `joined`, `registered` | Lobby join responses |
| `roomUpdated`, `playerJoined` | Room state changes |
| `gameStarted` | Match began |
| `chatMessage`, `chatMessageSent` | Chat delivery |
| `error` | `{ status, message }` |

### WebSocket actions (not implemented yet)

- `makeGuess` — submit a Pokémon guess
- `endTurn` — pass turn to opponent
- `forfeitGame` — concede the match
- `leaveRoom` — leave the room
- `requestRematch` — start a new round

### REST endpoints

- `GET /heartbeat` — health check
- `GET /pokemon` — full cached species list
- `GET /pokemon/:id` — one species by national dex id

## Pokémon data

Species data is prebuilt into `backend/data/pokemon.json` (id, name, sprite, types, abilities). Runtime uses only that file — never PokéAPI.

```bash
cd backend
npm run pokemon:build   # refresh cache (rare)
```

## Tests

```bash
cd backend
npm test                # all tests
npm run test:unit       # unit tests only
npm run test:integration  # DynamoDB + WebSocket integration tests
```

Requires DynamoDB local for integration tests (`npm run db:up && npm run db:setup`).

## Flow

1. Enter your name → create room (WebSocket)
2. Share `/room/{code}` with a friend
3. Guest joins → both register on the room page
4. Both ready up → host starts the game
5. Chat opens once the game is active

## Not yet built

- Core guessing gameplay (`makeGuess`, turns, win/lose)
- Shared 30-Pokémon board per room (see note in `backend/src/data/pokemon.ts`)
- Forfeit, leave, and rematch flows
- Sanitized room payloads (hide opponent `secretPokemonId` from broadcasts)
