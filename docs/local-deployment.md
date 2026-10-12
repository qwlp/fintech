# Local deployment (including a machine in China)

The app can use a self-hosted Convex backend, any OpenAI-compatible chat service with tool calling, and an optional local exchange-rate service. Vercel, managed Convex, OpenRouter and Frankfurter are not required at runtime. The payment system remains a sandbox.

## Prepare

Install Bun and Docker Compose. Download dependencies, container images and your chosen model before moving to an offline/restricted network. Images can be transferred with `docker save` / `docker load`; `CONVEX_BACKEND_IMAGE` and `WEB_SERVER_IMAGE` can point to local images or your own registry. Pin image versions for repeatable deployments. The Compose file follows [Convex's upstream Docker setup](https://github.com/get-convex/convex-backend/tree/main/self-hosted/docker).

1. Copy `.env.example` to `.env.local` in a separate checkout for this deployment. Remove `CONVEX_DEPLOYMENT` and `CONVEX_DEPLOY_KEY` entirely when self-hosting; do not mix managed and self-hosted settings. Existing accounts/data are not automatically migrated.
2. Run `bun install --frozen-lockfile` and `docker compose -f deploy/compose.yaml up -d backend`.
3. Generate the admin key with `docker compose -f deploy/compose.yaml exec backend ./generate_admin_key.sh`. Put it in `CONVEX_SELF_HOSTED_ADMIN_KEY` in `.env.local`; never in browser configuration.
4. Set `AI_MODEL` to an installed tool-capable model. For an OpenAI-compatible service such as Ollama on the Docker host, the example AI base URL is `http://host.docker.internal:11434/v1`. Configure that model server to listen on an interface reachable from the backend container. `localhost` inside a container means the container itself. Keep the model endpoint private; `AI_ALLOW_NO_KEY=true` is only for an intentionally unauthenticated private service. A remote provider instead needs its own base URL and key, with `AI_ALLOW_NO_KEY=false`.
5. Run `bunx convex dev --once`, `bun run auth:setup`, then `bun run ai:setup`. These push code and settings to the selected self-hosted backend. AI setup overwrites all listed AI settings, including clearing omitted legacy settings. For direct local evaluations outside Docker, override `AI_BASE_URL` with a host-accessible URL such as `http://127.0.0.1:11434/v1`.
6. Run `bun run build`, then `docker compose -f deploy/compose.yaml up -d web`. Open `http://127.0.0.1:8080` and create a new account.

`deploy/compose.yaml` keeps data in the `convex-data` volume. Do not delete it unless you intend to delete the local database. Backend origins come from `CONVEX_CLOUD_ORIGIN` and `CONVEX_SITE_ORIGIN`; provide these in the shell or Compose's `--env-file` when overriding the defaults. They map to ports 3210 (API/WebSocket) and 3211 (HTTP/auth).

## Configure a prebuilt frontend

Edit `dist/deployment-config.js` after building, or edit `public/deployment-config.js` before building:

```js
window.MOVEWISE_CONFIG = {
  convexUrl: "http://127.0.0.1:3210",
  fxRatesUrl: "", // Empty disables rate-service requests.
  fxSourceUrl: "",
  fxSourceLabel: "Local rate service",
};
```

Runtime values override `VITE_*` build variables, including empty strings. This file is public: no AI keys or admin keys. The frontend can be served by any static web server with SPA fallback; the provided Nginx configuration is one option. For LAN deployment, use the machine's LAN address instead of loopback for browser URLs and backend origins, and configure `BIND_ADDRESS` deliberately. Public HTTPS frontends need HTTPS backend URLs and a reverse proxy that forwards WebSockets.

An optional rates endpoint uses `base`, `quotes`, `from` and `to` query parameters and returns a JSON array such as `[{
  "date": "2026-10-12", "base": "CNY", "quote": "GBP", "rate": 0.105
}]`. Rates must be positive finite numbers. This is the Frankfurter-v2-compatible response format, but no Frankfurter URL is assumed. A cross-origin endpoint must allow your frontend origin through CORS. Leaving it unconfigured shows “Rate unavailable”; sandbox calculations continue to work.

## Verify on the target machine

Create Student and Sponsor accounts, save/reload a study plan, connect a sponsor, and check AI read/edit tools with the selected model. Disconnect external internet access and repeat. Verify that browser requests only contact your configured local services. External reference links in tuition guidance are optional links, not required services.

Build and mocked tests do not establish China-network access or certify a particular model's tool behavior. The local Docker deployment and live local model must be verified on the target machine. Hosting a public service in mainland China is a separate step from running this local setup.
