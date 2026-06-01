# 磐石烤地瓜 — VPS 部署指南（不用 MongoDB Atlas）

訂單會寫入 **`server/data/orders.json`**，只要用 Docker 掛載資料夾，重啟後台訂單不會消失。

---

## 一、準備 VPS

任選一家（需有公網 IP）：

- [DigitalOcean](https://www.digitalocean.com/)
- [Vultr](https://www.vultr.com/)
- [Linode](https://www.linode.com/)
- 或台灣主機商

建議規格：**1 vCPU / 1GB RAM** 即可。

系統建議：**Ubuntu 22.04 LTS**。

---

## 二、SSH 登入並安裝 Docker

```bash
ssh root@您的VPS_IP
```

```bash
apt update && apt install -y git ca-certificates curl
curl -fsSL https://get.docker.com | sh
systemctl enable docker
```

確認：

```bash
docker compose version
```

---

## 三、下載專案

```bash
cd /opt
git clone https://github.com/davidping-happy/sweetpotato.git
cd sweetpotato
```

---

## 四、設定環境變數

```bash
cp server/.env.vps.example server/.env
nano server/.env
```

**至少修改：**

| 變數 | 說明 |
|------|------|
| `ADMIN_EMAIL` | 後台登入信箱 |
| `ADMIN_PASSWORD` | 後台密碼 |
| `ADMIN_JWT_SECRET` | 隨機長字串 |
| `PUBLIC_API_BASE_URL` | `http://您的VPS_IP:3000` |
| `ADMIN_APP_URL` | 同上 |
| `LINE_LOGIN_CALLBACK_URL` | 同上 + `/api/line/login/callback`（若用 LINE） |

**不要設定** `MONGODB_URI`（留空即可，訂單用 JSON 檔）。

儲存：`Ctrl+O` → Enter → `Ctrl+X`。

---

## 五、啟動服務

```bash
cd /opt/sweetpotato
mkdir -p server/data
docker compose up -d --build
```

查看狀態：

```bash
docker compose ps
docker compose logs -f api
```

應看到：`未設定 MONGODB_URI，訂單將儲存於 data/orders.json`

---

## 六、測試

```bash
curl http://127.0.0.1:3000/api/health
```

瀏覽器開啟：

- 官網：`http://您的VPS_IP:3000/index.html`
- 後台：`http://您的VPS_IP:3000/admin-login.html`

---

## 七、防火牆

```bash
ufw allow 22/tcp
ufw allow 3000/tcp
ufw enable
```

雲端主機控制台也要開放 **3000** 埠（Security Group / Firewall）。

---

## 八、前台仍用 GitHub Pages 時

若官網繼續放在 GitHub Pages，需讓前台連到 VPS API：

1. 在本機修改 `docs/app-config.json`：

```json
{
  "apiBaseUrl": "http://您的VPS_IP:3000"
}
```

2. 推送到 GitHub，等 Pages 更新。

後台可改用 VPS 上的：`http://您的VPS_IP:3000/admin-login.html`。

---

## 九、HTTPS 網域（建議）

有網域 `api.您的網域.com` 時，可裝 Nginx + Let's Encrypt：

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Nginx 站台設定（`/etc/nginx/sites-available/sweetpotato`）：

```nginx
server {
    listen 80;
    server_name api.您的網域.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/sweetpotato /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d api.您的網域.com
```

然後把 `server/.env` 裡的 `PUBLIC_API_BASE_URL`、`ADMIN_APP_URL` 改成 `https://api.您的網域.com`，重啟：

```bash
docker compose up -d
```

---

## 十、日常維護

| 動作 | 指令 |
|------|------|
| 重啟 API | `docker compose restart api` |
| 看日誌 | `docker compose logs -f api` |
| 更新程式 | `git pull && docker compose up -d --build` |
| 備份訂單 | 複製 `server/data/orders.json` |

---

## 常見問題

**Q：重啟 VPS 訂單還在嗎？**  
在，資料在 `server/data/orders.json`。

**Q：和 Render 可以同時用嗎？**  
可以，但訂單會分兩套；建議正式營運只選一個 API 網址。

**Q：之後想改用 MongoDB？**  
在 `server/.env` 加上 `MONGODB_URI=...` 後重啟，啟動時會自動匯入 JSON 裡的舊訂單。
