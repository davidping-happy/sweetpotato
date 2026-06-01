#!/bin/bash
# 在 VPS 上以 root 執行（一行貼上即可）：
# curl -fsSL https://raw.githubusercontent.com/davidping-happy/sweetpotato/main/scripts/vps-one-click.sh | bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/davidping-happy/sweetpotato.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/sweetpotato}"
API_PORT="${API_PORT:-3000}"

echo "==> 安裝 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq git ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi

echo "==> 下載專案..."
mkdir -p "$(dirname "$INSTALL_DIR")"
if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR" && git pull
else
  git clone "$REPO_URL" "$INSTALL_DIR"
fi
cd "$INSTALL_DIR"

if [ ! -f server/.env ]; then
  echo "==> 建立 server/.env（請稍後修改密碼與網址）..."
  cp server/.env.vps.example server/.env
  PUBLIC_IP=$(curl -fsSL https://api.ipify.org || hostname -I | awk '{print $1}')
  sed -i "s/您的VPS_IP/${PUBLIC_IP}/g" server/.env
  JWT=$(openssl rand -hex 24 2>/dev/null || head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
  sed -i "s/請改成至少32字元的隨機字串/${JWT}/g" server/.env
  sed -i "s/請改成強密碼/ChangeMe-$(date +%s)/g" server/.env
fi

mkdir -p server/data
echo "==> 啟動 Docker Compose..."
docker compose up -d --build

sleep 3
echo "==> 健康檢查..."
curl -fsS "http://127.0.0.1:${API_PORT}/api/health" || true
echo ""
echo "完成！"
echo "  官網: http://${PUBLIC_IP:-<VPS_IP>}:${API_PORT}/index.html"
echo "  後台: http://${PUBLIC_IP:-<VPS_IP>}:${API_PORT}/admin-login.html"
echo "  請編輯 ${INSTALL_DIR}/server/.env 設定 ADMIN_EMAIL / 密碼 / SMTP"
echo "  訂單檔: ${INSTALL_DIR}/server/data/orders.json"
