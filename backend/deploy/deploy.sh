#!/usr/bin/env bash
# Run this FROM the EC2 instance over SSH — not from CI (there is no CI for
# this project by design; see the AWS deployment plan for why).
set -euo pipefail

cd ~/PokeGuess
git pull origin main

cd backend
docker build -t pokeguess-backend:latest .

docker stop pokeguess-backend 2>/dev/null || true
docker rm pokeguess-backend 2>/dev/null || true

docker run -d --restart unless-stopped --name pokeguess-backend \
  -p 127.0.0.1:3000:3000 \
  --env-file /etc/pokeguess/backend.env \
  pokeguess-backend:latest

sleep 2
curl -sf http://127.0.0.1:3000/heartbeat && echo "OK" || echo "Health check failed — check: docker logs pokeguess-backend"
