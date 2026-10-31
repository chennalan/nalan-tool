# Nalan 商品搬家助手 — API 接入实现说明

## 已实现
- Cloudflare Pages Functions 服务端路由。
- 健康检查、三平台配置状态查询。
- 快手电商开放平台签名请求模块：按官方 API 调用说明构造排序参数、HMAC-SHA256 签名、表单编码和 POST 请求。
- 快手商品详情只读：`open.item.get`，线上 API 默认域名 `https://openapi.kwaixiaodian.com`。
- 快手商品编辑：`open.item.edit` 路由已接入，但写操作默认关闭；需显式启用环境变量并提供单商品确认头。
- 抖店和视频号小店保留独立 adapter 边界，未混用抖音生活服务团购 API、微信旧版公众号小店 API。

## 快手调用环境变量
- `KUAISHOU_APP_KEY`
- `KUAISHOU_SIGN_SECRET`
- `KUAISHOU_ACCESS_TOKEN`
- `KUAISHOU_API_BASE_URL`（可选）

只读请求：
`GET /api/product-mover/products/kuaishou/{itemId}`

编辑请求：
`POST /api/product-mover/products/kuaishou/edit`
默认关闭 `PRODUCT_MOVER_WRITE_ENABLED`，需另行开启并提交 `x-product-mover-confirm: CONFIRM_SINGLE_ITEM_WRITE`。真实商家商品编辑仍应先做差异预览和人工确认。

## 仍待官方协议/权限完成的部分
1. 快手：OAuth 授权与 token 刷新、商品列表分页、创建商品、图片上传、SKU/库存更新的完整请求结构。
2. 抖店：普通抖店商品 API 的正式请求路径、签名、OAuth、分页和 SKU/素材参数需按开放平台文档及应用角色落地。
3. 微信小店：视频号小店现行商品 API 的请求协议、授权与字段结构需以当前开发者后台可访问文档为准；不使用旧版公众号微信小店 API。

## 安全约束
- 所有平台凭证只放 Cloudflare 服务端环境变量/Secret，不回传浏览器。
- 管理密钥不能硬编码在前端。
- Token 加密持久化需在确认存储方案后开发；当前未绑定/创建 D1 或 KV。
- 写操作默认关闭；商品发布、编辑、库存更新必须先预览差异、逐批确认、使用幂等键并留审计日志。
- 平台 API 返回内容不把 access_token、signSecret 或完整敏感请求写入日志。
