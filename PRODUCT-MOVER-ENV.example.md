# Nalan 商品搬家助手 — 服务端环境变量模板

本文件只列出变量名，不包含真实凭证。请在 Cloudflare Pages 项目的 **Settings → Environment variables** 中填写，开发预览与 Production 环境分开设置。不要把真实值提交到 Git。

## 通用管理保护
- `PRODUCT_MOVER_ADMIN_KEY`：管理 API 的随机高强度访问密钥。仅服务端配置；管理端通过受保护的服务端会话调用，不能硬编码在公开网页 JS 中。
- `ALLOWED_ORIGIN`：允许的前端来源，例如开发预览域名。上线后改为正式工具域名。

## 抖店
- `DOUYIN_CLIENT_ID`
- `DOUYIN_CLIENT_SECRET`
- `DOUYIN_AUTHORIZE_URL`
- `DOUYIN_TOKEN_URL`
- `DOUYIN_API_BASE_URL`
- `DOUYIN_REDIRECT_URI`

## 快手小店
- `KUAISHOU_CLIENT_ID`
- `KUAISHOU_CLIENT_SECRET`
- `KUAISHOU_AUTHORIZE_URL`
- `KUAISHOU_TOKEN_URL`
- `KUAISHOU_API_BASE_URL`
- `KUAISHOU_REDIRECT_URI`

## 微信小店（视频号小店）
- `WECHAT_CLIENT_ID`
- `WECHAT_CLIENT_SECRET`
- `WECHAT_AUTHORIZE_URL`
- `WECHAT_TOKEN_URL`
- `WECHAT_API_BASE_URL`
- `WECHAT_REDIRECT_URI`

## 当前实现状态
- Pages Function API 路由已建立：`/api/product-mover/health`、`/api/product-mover/platforms`、`/api/product-mover/connections/:platform/authorize`、`/api/product-mover/connections/:platform/callback`。
- 健康检查和平台配置状态可用。
- 授权、Token 交换、Token 加密存储、商品查询/发布、素材上传和库存更新暂不启用；需要根据每个平台获批应用的真实官方协议实现，不能只凭 Client ID/Secret 推测。
- 当前项目没有专用 D1 数据库绑定。未创建或复用任何数据库；Token 持久化功能必须在确认存储方案后再开发。
- 平台凭证只允许填写在 Cloudflare 服务端环境变量/Secret 中。严禁写入 HTML/JS、`.dev.vars`、示例文件、Excel、浏览器 localStorage、日志或 Git。
