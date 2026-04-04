# 部署指南

本文档介绍如何将 feishu-flow-kit 部署到生产环境。四种方式都会生成一个公开可访问的 webhook 端点，用于在飞书开放平台注册。

---

## TL;DR — Railway（推荐）

Railway 是最快上线的方式：

1. 将本仓库 Fork 到自己的 GitHub。
2. 在 Railway 创建 **New Project → Deploy from GitHub repo**，关联你的 Fork。
3. 在 Railway 的 Variables 面板添加环境变量（参考 [.env.example](./.env.example)）：
   - `FEISHU_APP_ID`、`FEISHU_APP_SECRET`
   - `FEISHU_WEBHOOK_SECRET`
   - `FEISHU_WEBHOOK_URL`：先在 Settings → Networking → Domain 设置 Railway 分配的域名，然后填入完整 URL，例如 `https://your-railway-app.up Railway.app/webhook`
   - `FEISHU_MOCK_MODE=false`
4. 准备好后开启 `FEISHU_ENABLE_OUTBOUND_REPLY=true`（或 `_DOC_CREATE=true`、`_TABLE_CREATE=true`）。
5. Railway 自动检测 Dockerfile 并完成构建部署。
6. 将 `https://your-railway-app.up Railway.app/webhook` 注册到飞书开放平台 → 事件订阅 → 请求地址。

> **注意**：先在 Railway Settings → Networking 设置域名，再把完整 URL（含 `/webhook`）填入飞书和 `FEISHU_WEBHOOK_URL`。

---

## 方式二 — Render

[Render](https://render.com) 提供免费层 Docker Web Service。

### 操作步骤

1. 将仓库 Fork 到 GitHub。
2. 在 Render 创建 **Web Service**：
   - 连接你的 GitHub 仓库。
   - **Region**：选择离飞书租户最近的区域。
   - **Runtime**：选择 **Docker**。
   - **Instance Type**：Free（免费实例 15 分钟无活动后休眠，生产环境建议升级）。
3. 添加环境变量（参考 [.env.example](./.env.example)）：
   - `FEISHU_APP_ID`、`FEISHU_APP_SECRET`
   - `FEISHU_WEBHOOK_SECRET`
   - `FEISHU_WEBHOOK_URL` = `https://your-app.onrender.com/webhook`
   - `FEISHU_MOCK_MODE=false`
4. Render 会自动从 `Dockerfile` 构建并部署。
5. 将 `https://your-app.onrender.com/webhook` 注册到飞书开放平台。

---

## 方式三 — fly.io

[fly.io](https://fly.io) 在全球多区域运行 Docker 容器，有不错的免费额度。

### 前提条件

```bash
npm install -g flyctl
flyctl auth login
```

### 操作步骤

1. Fork 仓库并推送到 GitHub。
2. 执行 `flyctl launch`，按提示填写：
   - **App name**：填一个全局唯一的名字（URL 中使用，如 `https://your-app.fly.dev`）。
   - **Region**：选择离飞书租户最近的区域。
   - **Dedicated IPv4**：选择 No（IPv6 对飞书 webhook 足够）。
3. 设置密钥：

   ```bash
   flyctl secrets set FEISHU_APP_ID=your_app_id
   flyctl secrets set FEISHU_APP_SECRET=your_app_secret
   flyctl secrets set FEISHU_WEBHOOK_SECRET=your_webhook_secret
   flyctl secrets set FEISHU_WEBHOOK_URL=https://your-app.fly.dev/webhook
   flyctl secrets set FEISHU_MOCK_MODE=false
   flyctl secrets set FEISHU_ENABLE_OUTBOUND_REPLY=false
   ```

4. 部署：

   ```bash
   flyctl deploy
   ```

5. 查看公网地址：

   ```bash
   flyctl info
   ```

6. 将 `https://your-app.fly.dev/webhook` 注册到飞书开放平台。

### 休眠恢复

fly.io 在应用静置约 5 天后会暂停。暂停后首次请求会触发 VM 重新启动（冷启动约 10–20 秒）。飞书 webhook 会在超时后自动重试，所以通常可以透明恢复。

---

## 方式四 — 手动 Ubuntu VPS

已在 Ubuntu 22.04 LTS 上测试通过。任何带有 Docker 的 Debian 类主机操作方式相同。

### 1. 在服务器上克隆仓库

```bash
git clone https://github.com/learner20230724/feishu-flow-kit.git
cd feishu-flow-kit
```

### 2. 配置环境变量

```bash
cp .env.example .env
nano .env   # 填入 FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_WEBHOOK_SECRET
```

`FEISHU_WEBHOOK_URL` 设为公网地址（如 `https://your-domain.com/webhook`）。

### 3. 域名解析（如有）

创建一条 A 记录指向服务器公网 IP，然后用 nginx 或 Caddy 做反向代理：

```nginx
# /etc/nginx/sites-available/feishu-flow-kit
server {
    listen 80;
    server_name your-domain.example.com;

    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/feishu-flow-kit /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

启用 HTTPS（强烈推荐）：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example.com
```

> 如果不绑定域名，飞书在生产环境下可能会拒绝非 HTTPS 的 webhook URL。建议使用 HTTPS。

### 4. 使用 Docker Compose 启动

```bash
# 确保 .env 中 FEISHU_WEBHOOK_URL 指向公网地址
docker compose up -d --build
```

### 5. 验证健康检查端点

```bash
curl https://your-domain.example.com/healthz
# 预期返回: {"ok":true,"ts":1712224000}
```

### 6. 在飞书开放平台注册 webhook

URL：`https://your-domain.example.com/webhook`

前往 **飞书开放平台 → 你的应用 → 事件订阅 → 请求地址**，填入上述 URL。

---

## 方式五 — 直接使用 GHCR 镜像

每次 `main` 分支推送和每个 `v*` 标签都会将容器镜像发布到 [GitHub Container Registry](https://github.com/learner20230724/feishu-flow-kit/generate)。不想 clone 仓库或本地构建时，可直接使用预构建镜像。

### 镜像地址

```
ghcr.io/learner20230724/feishu-flow-kit:<tag>
```

可用标签：

| 标签 | 来源 | 用途 |
|------|------|------|
| `latest` | 每次 main 推送 | 最新版本 |
| `v1.0.1`, `v1.0.0` | 每次 git tag | 稳定版 |
| `1.0`, `1` | 每个 minor/major tag | 稳定版，自动跟随 patch |
| `<sha>` | 每次提交 | 精确版本 |

### 本地快速测试（mock 模式）

无需飞书凭证，mock 模式完全离线运行：

```bash
docker run -d \
  --name feishu-flow-kit \
  -p 8787:8787 \
  -e FEISHU_MOCK_MODE=true \
  -e PORT=8787 \
  ghcr.io/learner20230724/feishu-flow-kit:latest
```

访问 `http://localhost:8787/healthz` 确认运行状态。Mock 模式下 bot 加载 `examples/mock-message-event.json`，无需真实飞书应用即可返回草稿回复。

### 自建 VPS（docker-compose）

在有公网 IP 的服务器上，创建以下 `docker-compose.yml`：

```yaml
services:
  feishu-flow-kit:
    image: ghcr.io/learner20230724/feishu-flow-kit:latest
    container_name: feishu-flow-kit
    restart: unless-stopped
    ports:
      - "8787:8787"
    environment:
      FEISHU_APP_ID: ${FEISHU_APP_ID}
      FEISHU_APP_SECRET: ${FEISHU_APP_SECRET}
      FEISHU_WEBHOOK_SECRET: ${FEISHU_WEBHOOK_SECRET}
      FEISHU_WEBHOOK_URL: https://your-domain.example.com/webhook
      FEISHU_MOCK_MODE: "false"
      FEISHU_ENABLE_OUTBOUND_REPLY: "true"
      # FEISHU_BITABLE_APP_TOKEN: your_bitable_token
      # FEISHU_BITABLE_TABLE_ID: your_table_id
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8787/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
# 在 docker-compose.yml 同目录创建 .env
cp .env.example .env
nano .env   # 填写 FEISHU_APP_ID、FEISHU_APP_SECRET、FEISHU_WEBHOOK_SECRET

# 先在 DNS 添加 A 记录指向服务器公网 IP
# 再将 FEISHU_WEBHOOK_URL 设为 https://your-domain.example.com/webhook

docker compose up -d
curl https://your-domain.example.com/healthz
```

然后在飞书开放平台 → 你的应用 → 事件订阅注册 `https://your-domain.example.com/webhook`。

### 更新到新版本

```bash
# 拉取最新镜像
docker pull ghcr.io/learner20230724/feishu-flow-kit:latest

# 重启容器以使用新镜像
docker compose restart
```

或固定到指定版本：

```bash
docker pull ghcr.io/learner20230724/feishu-flow-kit:v1.0.1
# 更新 docker-compose.yml 的 image 行后重启
```

---

## 飞书侧注册（通用）

不管选择哪种部署方式，飞书侧的配置流程一致：

1. 打开 [open.feishu.cn/app](https://open.feishu.cn/app) → 你的应用。
2. **凭证与基础信息** → 复制 **App ID** 和 **App Secret**。
3. **事件订阅**：
   - 开启 `im.message.receive_v1` 事件。
   - 请求地址填入你的 bot 公网 `/webhook` 端点。
   - 如启用加密（`FEISHU_WEBHOOK_SECRET`），飞书会显示「加密密钥」字段，将其填入 `FEISHU_WEBHOOK_SECRET`。
   - URL 验证：飞书发送 GET 请求带 `challenge` 参数，bot 自动处理（返回 `{"challenge":"..."}`）。
4. **权限管理** → 确认已添加以下权限：
   - `im:message` — 读取和发送消息
   - `docx:document` — 创建文档
   - `bitable:app` — 读写多维表格
5. **发布**应用版本。

> 生产环境下飞书只支持 HTTPS 的 webhook URL。沙箱/测试租户可能允许 HTTP。

---

## 生产环境检查清单

- [ ] `FEISHU_MOCK_MODE=false`
- [ ] `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 已配置
- [ ] `FEISHU_WEBHOOK_SECRET` 已配置（启用 x-lark-signature 验签）
- [ ] `FEISHU_WEBHOOK_URL` 设为**公网**地址（不能是 localhost）
- [ ] 功能开关（`FEISHU_ENABLE_OUTBOUND_REPLY` 等）按需开启
- [ ] 使用 `/table` 时配置了 `FEISHU_BITABLE_APP_TOKEN`、`FEISHU_BITABLE_TABLE_ID`
- [ ] 健康检查 `GET /healthz` 返回 `{"ok":true,...}`
- [ ] 飞书应用已发布（不是仅保存）
- [ ] 飞书开放平台上应用已添加所需权限
