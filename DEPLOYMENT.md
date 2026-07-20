# Deploying PokeGuess to AWS — a walkthrough

This is a beginner-friendly, in-order log of everything that was done to get the
backend running on a real AWS server, written for someone who's never done this
before. The frontend is hosted separately on Vercel and isn't covered here
(Vercel handles builds/deploys automatically from git pushes).

## 1. Launch an EC2 instance

**What it is:** EC2 ("Elastic Compute Cloud") is AWS's raw virtual machine
service — you get a Linux (or Windows) box in the cloud that you can SSH into,
just like a computer sitting in a data center. This is where the backend server
actually runs.

We launched an Amazon Linux instance in the `us-east-2` region.

## 2. Allocate and associate an Elastic IP

**What it is:** By default, an EC2 instance's public IP address changes every
time you stop and restart it. An **Elastic IP** is a static IP address you
"claim" from AWS and attach to your instance, so the address never changes.

Important side effect: associating an Elastic IP **changes the instance's
public DNS hostname** to match the new IP (e.g.
`ec2-3-151-36-228.us-east-2.compute.amazonaws.com`). If you ever re-associate a
different Elastic IP, the hostname changes again — everything downstream
(nginx config, TLS cert, frontend env vars) has to be updated to match.

## 3. Configure the Security Group

**What it is:** A Security Group is a virtual firewall attached to the
instance. By default almost nothing is allowed in. We opened:

- **Port 22 (SSH)** — restricted to our own IP, for management access
- **Port 80 (HTTP)** — open to everyone, needed for the TLS certificate process
  and to redirect to HTTPS
- **Port 443 (HTTPS)** — open to everyone, this is the real public entry point

Port 3000 (where the app actually listens) was deliberately **not** opened —
the app is only reachable through nginx, which is the only thing exposed
publicly.

## 4. Create an IAM policy and role for DynamoDB access

**What it is:** IAM ("Identity and Access Management") controls who/what can do
what in AWS. Instead of putting AWS access keys inside the app's config (which
would be a security risk if the server were ever compromised), we created an
**IAM Role** and attached it directly to the EC2 instance. AWS's SDKs
automatically detect this and use it — no secrets stored anywhere on disk.

The policy granted only what the app actually needs:
- Read/write access (`GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`,
  `Scan`) scoped to the two specific DynamoDB tables the app uses
  (`GameRooms`, `FeedbackReports`)
- `CreateTable`/`DescribeTable`/`UpdateTimeToLive` so the one-time table setup
  script could run
- `ListTables` (this one can't be scoped to specific tables — DynamoDB doesn't
  support that — so it's granted on all resources). This was needed because
  the app runs a startup health check that calls `ListTables` to confirm
  DynamoDB is reachable before reporting itself healthy.

## 5. Connect over SSH

**What it is:** SSH is how you get a remote terminal session on the instance,
authenticated with the private key file downloaded when the instance was
launched.

```bash
ssh ec2-user@<public-dns> -i /path/to/key.pem
```

## 6. Install base software on the instance

Everything the deployment needs, installed directly on the OS:
- **Docker** — runs the backend as a container (see step 9)
- **git** — to pull the source code
- **nginx** — the reverse proxy that sits in front of the app (see step 11)
- **certbot** — automates getting/renewing free TLS certificates (see step 12)
- **Node.js/npm** — needed once, to run the one-time DynamoDB table-setup
  script directly on the host (the running app itself only needs Docker, not a
  host-level Node install)

## 7. Fix the container → instance-metadata "hop limit"

**What it is:** When code inside a Docker container asks AWS "who am I, what
permissions do I have?", that request goes to a special internal address
(the EC2 "instance metadata service"). By default, AWS limits how many network
hops that request can take — and a request from inside a container (through
Docker's internal network) counts as one extra hop beyond what's allowed by
default. This silently breaks the IAM role from step 4 for anything running
in a container.

**Fix:** in the EC2 console, we increased the instance's metadata **hop limit**
from 1 to 2 (Actions → Instance settings → Modify instance metadata options).

## 8. Clone the repo and set up the environment file

```bash
git clone <repo-url> ~/PokeGuess
```

Then created `/etc/pokeguess/backend.env` — a file **outside** the git repo,
containing the settings that differ between local dev and production:

```
PORT=3000
CORS_ORIGINS=https://<the-real-frontend-domain>
AWS_REGION=us-east-2
```

Notably, this file does **not** set `DYNAMODB_ENDPOINT` or AWS access
keys — their absence is exactly what tells the app to use the real AWS
DynamoDB service via the IAM role (step 4), instead of a local test database.

**Permissions gotcha:** the file was initially created with `chmod 600`
(root-only), which blocked `docker run --env-file` from reading it as a
non-root user. Fixed by making it group-readable by the `docker` group instead
of world-readable — keeps it locked down but still usable.

## 9. Build the Docker image and create the DynamoDB tables

**What Docker is doing here:** the backend has a `Dockerfile` that packages the
compiled app plus its dependencies into a portable image — so it runs the same
way regardless of what's installed on the host.

```bash
docker build -t pokeguess-backend:latest .
docker run --rm --env-file /etc/pokeguess/backend.env \
  pokeguess-backend:latest node dist/db/setup.js
```

This one-off container run creates the DynamoDB tables (idempotent — safe to
run again). It's a one-time step, not part of normal deploys.

## 10. Run the real backend container

```bash
bash backend/deploy/deploy.sh
```

This script (already in the repo) rebuilds the image, stops any previous
container, and starts the new one bound only to `127.0.0.1:3000` (i.e., only
reachable from the instance itself, not the outside world) — then checks the
app's `/heartbeat` endpoint to confirm it started successfully.

## 11. Configure nginx as a reverse proxy

**What it is:** a **reverse proxy** sits in front of your actual app and
forwards public traffic to it. This is the standard pattern for running web
apps on Linux servers — the app itself only listens on `localhost`, and nginx
is the only thing exposed to the internet, forwarding requests to it
internally. This also lets nginx handle TLS termination (HTTPS) so the app
code itself doesn't have to.

```bash
sudo cp backend/deploy/nginx.conf.example /etc/nginx/conf.d/pokeguess.conf
# (edit the hostname inside to match the real one)
sudo nginx -t && sudo systemctl reload nginx
```

Hit one nginx-specific snag: `server_names_hash_bucket_size` (an internal
lookup table size) defaulted too small for a long hostname — fixed by bumping
it to 128 in `/etc/nginx/nginx.conf`.

## 12. Get a TLS certificate — and a real domain workaround

**What TLS/HTTPS needs:** a publicly trusted certificate, which normally
requires proving you control a domain name.

**The snag:** Let's Encrypt (and most certificate authorities) refuse to issue
certificates for the raw `*.compute.amazonaws.com` hostname AWS gives every
EC2 instance — it's on a shared "public suffix list," similar to how
`*.github.io` is treated, so no individual cert can be issued for it.

**The fix, without buying a domain:** [sslip.io](https://sslip.io) is a free
wildcard DNS service — any hostname like `3-151-36-228.sslip.io` automatically
resolves to the IP address embedded in it (`3.151.36.228`), with no signup.
Unlike the AWS hostname, this isn't on the blocked list, so:

```bash
sudo certbot --nginx -d 3-151-36-228.sslip.io
```

...issued a real, trusted certificate for free, and automatically rewrote the
nginx config to add HTTPS and a scheduled auto-renewal task.

## 13. Point the frontend at the backend

Two separate environment variables were needed on the Vercel project (the
frontend reads both at **build time**, so changing them requires a new
deploy, not just a settings change):

```
NEXT_PUBLIC_WS_URL=wss://3-151-36-228.sslip.io/ws
NEXT_PUBLIC_API_URL=https://3-151-36-228.sslip.io
```

- `NEXT_PUBLIC_WS_URL` — the WebSocket connection used for live game state and
  chat
- `NEXT_PUBLIC_API_URL` — the plain REST API base, used e.g. to fetch the
  Pokémon sprite/data catalog. Missing this one was the cause of sprites not
  showing up in production — the app was silently falling back to
  `localhost:3000`, which doesn't exist from a deployed user's browser.

## Summary of the moving pieces

| Piece | Purpose |
|---|---|
| EC2 instance | Runs the backend |
| Elastic IP | Gives it a stable address |
| Security Group | Firewall — only 22/80/443 open |
| IAM Role | Lets the app talk to DynamoDB without stored secrets |
| Docker | Packages/runs the backend consistently |
| nginx | Reverse proxy — the only public entry point, handles TLS |
| certbot + sslip.io | Free TLS certificate without owning a domain |
| DynamoDB | The actual database (managed by AWS, separate from EC2) |
| Vercel | Hosts and builds the frontend from git pushes |
