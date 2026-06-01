# SweetPotato Backend Deployment

This project backend is located in `server/` and exposes:

- `GET /api/health`
- `GET /api/orders`
- `GET /api/orders/:orderNumber`
- `PATCH /api/orders/:orderNumber/status`
- `POST /api/orders`

## Option A: Render (recommended)

1. Push this repository to GitHub.
2. In Render: **New +** -> **Blueprint**.
3. Select this repository.
4. Render reads `render.yaml` automatically.
5. Deploy.

After deploy, verify:

- `https://<your-render-service>.onrender.com/api/health`

Use this URL in `admin.html` "API URL" input.

## Option B: Railway

1. In Railway: **New Project** -> **Deploy from GitHub repo**.
2. Select this repository.
3. Railway reads `railway.json`.
4. Deploy and wait for generated public URL.

Verify:

- `https://<your-railway-domain>/api/health`

Use this URL in `admin.html` "API URL" input.

## Option C: VPS + Docker (persistent orders without MongoDB)

**Recommended if you do not want MongoDB Atlas.**

Orders are stored in `server/data/orders.json` on a mounted volume. Data survives container restarts.

See the full guide (Traditional Chinese): [docs/DEPLOY_VPS.md](docs/DEPLOY_VPS.md)

Quick start on VPS:

```bash
git clone https://github.com/davidping-happy/sweetpotato.git
cd sweetpotato
cp server/.env.vps.example server/.env
# edit server/.env (ADMIN_*, PUBLIC_API_BASE_URL, SMTP, etc.)
mkdir -p server/data
docker compose up -d --build
curl http://127.0.0.1:3000/api/health
```

## MongoDB (optional)

| Deployment | `MONGODB_URI` | Order storage |
|------------|---------------|---------------|
| VPS + Docker volume | leave empty | `server/data/orders.json` (persistent) |
| Render free | Atlas recommended | JSON file is wiped on redeploy |
| Any + Atlas | set connection string | MongoDB |

If `MONGODB_URI` is empty, the API skips MongoDB and uses the JSON file store.
