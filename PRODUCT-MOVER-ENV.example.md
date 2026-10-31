# Nalan 商品搬家助手 — 服务端环境变量模板

本文件只列变量名，不包含真实凭证。请在 Cloudflare Pages → Settings → Environment variables 中填写，并区分 Preview / Production。真实值绝不提交 Git。

## 通用
- `PRODUCT_MOVER_ADMIN_KEY`：管理 API 密钥。仅服务端保存，不能写入公开网页 JS。
- `ALLOWED_ORIGIN`：允许的前端来源。
- `PRODUCT_MOVER_WRITE_ENABLED`：默认不设置或设为 false。只有完成测试并明确决定开放写操作后才设为 true。

## 快手电商开放平台（当前已实现签名请求 + 商品详情只读适配器）
- `KUAISHOU_APP_KEY`：开放平台分配的 appKey / appId。
- `KUAISHOU_SIGN_SECRET`：应用签名密钥 signSecret。
- `KUAISHOU_ACCESS_TOKEN`：商家授权后取得的 access_token。当前先手工填写；后续完成 OAuth 后改为服务端加密保存。
- `KUAISHOU_API_BASE_URL`：可选，默认 `https://openapi.kwaixiaodian.com`。

## 抖店（待完成正式适配）
- `DOUYIN_CLIENT_ID`
- `DOUYIN_CLIENT_SECRET`
- `DOUYIN_API_BASE_URL`
- `DOUYIN_REDIRECT_URI`

## 微信小店 / 视频号小店（待完成正式适配）
- `WECHAT_CLIENT_ID`
- `WECHAT_CLIENT_SECRET`
- `WECHAT_API_BASE_URL`
- `WECHAT_REDIRECT_URI`

## 当前可用接口
- `GET /api/product-mover/health`：健康检查。
- `GET /api/product-mover/platforms`：检查三个目标平台服务端变量是否已填写（不暴露变量值）。
- `GET /api/product-mover/sources/weigou/status`：微购相册来源状态；当前明确返回官方 Excel 导入模式和 API 未配置状态，不会调用微购 API。
- `GET /api/product-mover/products/kuaishou/{itemId}`：快手商品详情只读接口，需管理端授权。
- `POST /api/product-mover/products/kuaishou/edit`：快手编辑接口已接入，但默认由 `PRODUCT_MOVER_WRITE_ENABLED` 关闭，且要求单商品确认头；不要在未测试前开启。

## 尚未启用
- 快手 OAuth 自动授权与 token 刷新、商品列表分页、商品创建、图片上传、SKU/库存更新。
- 抖店完整商品 API、OAuth、签名与素材上传。
- 视频号小店完整商品 API、授权与素材上传。
- Token 加密持久化：当前项目没有专用 D1/KV 绑定；本次未创建或复用任何数据库。


## 微购相册（来源平台）
- 当前不需要任何微购 API 环境变量。
- 官方 Excel 导出/导入是当前支持路径。
- 只有在微购科技提供正式 API 文档、应用授权和商用许可后，才新增服务端 Secret；不在浏览器保存凭证。
- 详细接入清单见 `PRODUCT-MOVER-WEIGOU-ADAPTER.md`。
