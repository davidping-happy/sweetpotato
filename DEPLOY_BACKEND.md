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

## Option C: VPS + Docker

Prerequisites:

- Docker installed on VPS
- Port 3000 open (or reverse proxy to HTTPS)

Commands:

```bash
git clone https://github.com/<your-user>/sweetpotato.git
cd sweetpotato/server
docker build -t sweetpotato-api .
docker run -d --name sweetpotato-api -p 3000:3000 sweetpotato-api
```

Verify:

```bash
curl http://<your-vps-ip>:3000/api/health
```

## MongoDB (optional but recommended)

If `MONGODB_URI` is not set, backend runs in memory fallback mode:

- Orders are available during runtime
- Data is lost when service restarts

For persistent orders, configure `MONGODB_URI` (e.g., MongoDB Atlas) in your cloud provider environment variables.
