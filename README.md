# FlareDrive

Cloudflare Workers + R2 轻量云盘：Web 文件管理 + WebDAV。无 D1。

## 路径

- Web UI：`/`（登录页 + 文件管理）
- WebDAV 正式：`/dav`
- WebDAV 兼容：`/webdav`（同一套 core）
- 登录 API：`/api/auth/login` `logout` `me`

## 鉴权

- Web UI：用户名密码 → HttpOnly Session Cookie
- WebDAV 客户端：HTTP Basic（与 UI 同一套 Secret）
- Secret：`WEBDAV_USERNAME` / `WEBDAV_PASSWORD`

## 本地

```bash
npm install
npm run build
npx wrangler deploy
```

账号密码只走 `wrangler secret`，不要写进仓库。
