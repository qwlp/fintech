# Setup and deployment

Use the local Docker setup below to run the whole app on one computer. Payments remain simulated. No managed Convex account is needed for this option.

## 1. Install what you need

- Bun (the version is listed in `package.json`).
- Docker Engine or Docker Desktop, running, with Docker Compose v2.
- A model service with an OpenAI-compatible `/v1` endpoint and tool calling. A local service such as Ollama can be used if its chosen model supports tools.
- Internet access to download packages, Docker images, and model files initially.

Use a fresh checkout of the repository. Run commands from its root folder.

## 2. Create your settings

```sh
bun install --frozen-lockfile
bun run deploy:local
```

The first run creates **`.env.self-hosted`**, prints instructions, and stops. Open that file and set:

| Setting           | What to enter                                                                     |
| ----------------- | --------------------------------------------------------------------------------- |
| `AI_BASE_URL`     | Model API base URL, including `/v1`                                               |
| `AI_MODEL`        | Exact name of an installed, tool-capable model                                    |
| `AI_API_KEY`      | Your model service key, if required                                               |
| `AI_ALLOW_NO_KEY` | `true` only for an intentionally private service without a key; otherwise `false` |

For a model on the Docker host, use `http://host.docker.internal:11434/v1`. The model server must listen on an interface reachable from Docker. Inside the backend container, `localhost` means that container, not your computer. Keep an unauthenticated model service private.

Do not add `CONVEX_DEPLOYMENT` or `CONVEX_DEPLOY_KEY` to this file. The script uses it separately from `.env.local`, so your existing cloud settings are preserved. The file contains secrets and is ignored by Git.

## 3. Deploy locally

```sh
bun run deploy:local -- --check  # Check settings and prerequisites only.
bun run deploy:local
```

The script:

1. Checks the local settings, Bun, Docker, and Compose.
2. Starts the local Convex backend and waits for it to respond.
3. Generates an admin key if needed and saves it privately in `.env.self-hosted`.
4. Sets up login keys and AI settings, then uploads the backend code.
5. Builds the website with the local backend URL and starts Nginx.

Open **http://127.0.0.1:8080**. Create a new Student account. Local accounts and data are separate from any managed deployment. The backend API uses port **3210** and auth/HTTP uses **3211**. All three ports bind to this computer only.

Run the same deployment command after changing source code or AI settings. Existing login keys and database data are preserved. AI setup replaces its listed settings, including clearing omitted old values.

## Stop, restart, and inspect

```sh
# Stop containers; keep data.
docker compose -p movewire-local -f deploy/compose.yaml stop

# Restart the existing containers.
docker compose -p movewire-local -f deploy/compose.yaml start

# Show service status and recent logs.
docker compose -p movewire-local -f deploy/compose.yaml ps
docker compose -p movewire-local -f deploy/compose.yaml logs --tail=100
```

Data lives in the `movewire-local_convex-data` Docker volume. Deleting that volume deletes local accounts and records. Keep `.env.self-hosted` private and retain it for restarts.

## Check that it works

Create a Student, save a plan, and reload it. Compare tuition routes and complete a simulated payment. Check that a repeated send returns the same receipt. Create a Sponsor and connect through an invitation; check that the student controls sharing. Try AI comparison and preparation with the chosen model.

Local scripts and mocked tests do not prove that your model handles tools correctly. Test it on the target machine before presenting.

## Common problems

| Problem                                | What to check                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Docker is unavailable                  | Start Docker and run `docker info`. Confirm `docker compose version` works.           |
| A port is already in use               | Stop the other service using 3210, 3211, or 8080. This script uses fixed local ports. |
| Backend does not start                 | Inspect the backend logs using the command above.                                     |
| AI cannot connect                      | Check the model name, `/v1` URL, key, and Docker-to-host access.                      |
| Login fails after database replacement | Keep the settings file and database from the same installation; inspect backend logs. |
| Quote expired                          | Refresh quotes while connected, then prepare and approve a new proposal.              |
| Browser cannot reach backend           | Open the app on the deployment computer; loopback URLs do not support another device. |

## Restricted networks and China

Download dependencies, images, and models before moving to a restricted network. Transfer Docker images with `docker save` and `docker load` if needed. The Compose file accepts `CONVEX_BACKEND_IMAGE` and `WEB_SERVER_IMAGE` overrides; pin image tags or digests for repeatable installs. It follows the [upstream Convex Docker setup](https://github.com/get-convex/convex-backend/tree/main/self-hosted/docker).

Browser exchange rates default to Frankfurter. Backend payment-rate refresh uses Frankfurter with an ECB fallback and still needs external connectivity. Fully offline quote refresh is not implemented. Test access on the actual target network; local deployment does not establish public hosting availability in China.

For a prebuilt frontend, edit `dist/deployment-config.js` after building:

```js
window.MOVEWISE_CONFIG = {
  convexUrl: "http://127.0.0.1:3210",
  fxRatesUrl: "", // Disable browser rate requests.
  fxSourceUrl: "",
  fxSourceLabel: "Local rate service",
};
```

These public settings override build settings. Never put secrets here. A custom rates endpoint must accept `base`, `quotes`, `from`, and `to`, allow the frontend through CORS, and return Frankfurter-v2-style rows, for example `[{"date":"2026-10-12","base":"CNY","quote":"GBP","rate":0.105}]`. Rates must be finite and positive. This browser setting does not change the backend's rate sources.

Public or LAN hosting needs deliberate origin, binding, and HTTPS configuration. Use the machine's reachable address for browser/backend origins and a reverse proxy with WebSocket support for HTTPS. The local script intentionally supports one computer only.

## Alternative: managed Convex development

Use a separate checkout and follow the CLI's account setup:

```sh
bun install --frozen-lockfile
bunx convex dev --once
bun run auth:setup
# Add AI_BASE_URL, AI_MODEL, AI_API_KEY and AI_ALLOW_NO_KEY to .env.local.
bun run ai:setup
bun run dev
```

For managed mode, remove self-hosted settings and use the deployment and `VITE_CONVEX_URL` written by Convex. The root `.env.example` explains the settings; do not copy its local backend values into a managed setup unchanged.

For public managed hosting, deploy backend code to your intended production deployment, configure its own auth/AI settings, build the frontend with that deployment's `VITE_CONVEX_URL`, and publish `dist/` using the supplied `vercel.json` or a static host with SPA fallback. The local script does not publish or configure production.
