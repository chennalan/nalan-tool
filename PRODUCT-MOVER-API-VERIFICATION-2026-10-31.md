# API 核验补充（2026-10-31）

## 快手电商
- 官方 API 调用说明确认：生产域名为 https://openapi.kwaixiaodian.com；API 名称中的点替换为路径斜杠；POST 使用 application/x-www-form-urlencoded；业务参数放入 param。
- 签名流程：系统参数与业务参数按参数名字典序排序，拼接 key=value 并以 & 连接，再追加 &signSecret=...；HMAC_SHA256 的密钥为 signSecret，结果 Base64 编码。签名完成后再进行 URL/form 编码。
- 已确认普通商品接口 open.item.get、open.item.edit；商品编辑需要商家授权及 merchant_item 商品权限组。商品主图需要快手平台图片 URL；外链图需先调用 open.item.image.upload 转换。
- 官方应用开发指南说明：开发者资质审核、创建应用、审核后获得 appKey/appSecret/signSecret、申请权限包、添加测试用户授权、测试扫描后上线。第三方服务应用上线后需走服务市场相关流程。
- 当前代码已实现签名调用和商品详情读取。签名字段排序现使用确定性的代码点顺序；商品编辑路由仍默认关闭。

## OAuth 边界
- 快手通用开放平台登录页的 OAuth 说明不能直接等同于快手电商商家授权协议。电商开发指南要求使用其 APP 授权说明和商家授权关系；在核实专用授权链接、code 换 token、刷新 token 参数前，不实现或调用通用登录 OAuth endpoint。
- access_token / refresh_token / appSecret / signSecret 必须留在服务端。刷新 token 可能使旧 refresh_token 失效，必须有安全持久化与并发锁，当前未配置存储层，因此暂不做自动刷新。

## 抖店
- 抖店官方开放平台明确列有普通商品查询、编辑、发布、SKU 与库存 API，并支持软件服务商开发商品搬家软件。
- 抖音生活服务团购 API 属于不同产品场景，不得用于普通抖店实物商品搬家。
- 当前仍需按抖店应用角色、API 文档、权限申请与商家授权落地独立 adapter。

## 微信小店
- 继续以当前视频号小店官方开发文档为准。尚未获得足够完整、可核验的商品读写 API 字段和授权协议，因此不编造 endpoint，也不复用旧版公众号微信小店接口。

## 安全与部署边界
- 未配置任何真实平台凭证，未调用真实商家接口。
- 商品编辑/发布/库存写入保持关闭。
- 未创建或绑定 D1/KV/R2，不写生产数据库，不合并 main，不进行生产部署。
