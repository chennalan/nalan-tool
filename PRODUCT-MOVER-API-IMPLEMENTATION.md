# Nalan 商品搬家助手 — API 接入实现说明

## 本阶段已搭建
- Cloudflare Pages Functions 路由：`functions/api/product-mover/[[path]].js`
- 健康检查：`GET /api/product-mover/health`
- 平台配置状态：`GET /api/product-mover/platforms`
- 受保护的授权初始化占位：`POST /api/product-mover/connections/{douyin|kuaishou|wechat}/authorize`
- OAuth 回调安全占位：`GET /api/product-mover/connections/{platform}/callback`
- 商品、类目、属性模板、素材、发布、库存等 API 路由的明确待实现响应。
- 服务端配置变量清单：`PRODUCT-MOVER-ENV.example.md`

## 为什么没有直接写死三个平台的请求地址
三平台 OAuth 参数、签名算法、授权范围、分页方式、商品结构和素材上传协议并不通用。当前快手普通小店商品 API 和视频号小店现行商品接口仍需从对应开发者后台取得确切文档及权限。写入猜测的 URL/签名会造成授权失败、错误调用或误操作，因此本阶段采用严格的接口契约与安全路由，不伪造“已连通”。

## 下一阶段所需资料（请勿在聊天中发送密钥）
1. 三个平台分别创建/审核通过的应用信息与权限列表。
2. 官方后台提供的 OAuth、签名、商品、SKU、素材上传 API 文档版本。
3. 每个平台的测试店铺授权能力或沙箱。
4. 明确服务端 Token 存储方案后，再启用加密持久化（当前未绑定 D1，不会自行创建或复用数据库）。

## 安全约束
- Access Token / Refresh Token 不回传浏览器，不写入 Git。
- OAuth 必须校验一次性 state，回调完成后立即清理 state。
- 写接口默认关闭；发布、编辑、库存调整必须先生成差异预览，再经用户逐批确认。
- 每次写操作需幂等键、审计日志、限流和错误脱敏。
- 无沙箱时仅可读取与校验，不能自动发布或修改线上商品。
