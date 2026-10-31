# 三平台商品搬家 API 接入核验（2026-10-31）

本文件区分“平台有商品相关 API”与“已经确认可对接目标小店的商品管理 API”。未取得应用权限、商家授权和实际店铺验证前，不得把平台能力标记为已接通。

## 结论摘要

| 平台 | 已核实的官方能力 | 尚未确认 / 风险 | 当前接入状态 |
|---|---|---|---|
| 抖音小店（抖店） | 抖店开放平台明确面向自研商家和软件服务商提供商品查询、发布、编辑、SKU、库存等商品管理能力；平台介绍明确提及商品搬家软件服务 | 需完成开发者/服务商入驻、应用审核、具体商品权限申请、商家授权；每个类目需按平台发布规则取模板并校验 | 可进入正式 API 适配开发，等待应用权限 |
| 快手小店 | 快手开放平台存在“电商开放”产品形态；另有快手小程序商品挂载、编辑、上下线接口 | 已检索到的商品挂载接口属于小程序/POI 商品场景，不等于快手小店普通实物商品 SPU/SKU 管理接口。必须取得快手电商开放的商家商品 API 文档及应用权限 | 待官方确认接口范围，不实现猜测接口 |
| 微信小店（视频号小店） | 微信生态有微信小店商品展示组件；微信渠道存在商品相关 API 与开发者能力 | 旧版公众号“微信小店”及“扫一扫商品”文档不等于当前视频号小店接口。需以当前视频号小店官方 API 文档、商家授权流程和应用权限为准 | 待官方文档/权限确认，不使用旧接口 |

## 官方资料

### 抖音 / 抖店
- 抖店开放平台：https://op.jinritemai.com/api-docs
- 开放平台说明：自研商家通过 API 管理商品；软件服务商可开发商品搬家软件：https://op.jinritemai.com/api-docs
- 开发者入驻：https://open.douyin.com/platform/resource/docs/accession-guide/platform-accession
- 授权流程：https://open.douyin.com/platform/resource/docs/develop/permission/overall-permission
- 注意：抖音生活服务 / 团购商品接口与抖店普通实物商品接口不是同一业务线，不能混用。

### 快手
- 快手开放平台：https://open.kuaishou.com/platform/openApi
- 平台介绍（明确列出快手电商开放）：https://open.kuaishou.com/platformDocs/newGuide/introduce
- 快手小程序商品挂载接口（仅作边界参考，不作为快手小店商品 API）：https://open.kuaishou.com/docs/develop/IndustrySolutions/introduction/miniprogram/productMount
- 商品发布规范（小程序场景）：https://open.kuaishou.com/docs/operate/specification/productLaunch

### 微信小店
- 视频号小店商品 API 官方文档入口（需登录/权限时由商家开发者后台确认）：https://developers.weixin.qq.com/doc/channels/API/channels-shop-product/shop/
- 微信小店商品组件说明：https://docs.cloudbase.net/lowcode/components/wedaUI/src/docs/compsdocs/wxOpen/WdStoreProduct
- 注意：公众号旧版微信小店、微信“扫一扫商品”API不可作为视频号小店商品创建/编辑 API 的替代品。

## 目标架构

所有平台通过统一商品模型进行转换，但平台 API、授权令牌和字段映射必须隔离：

`NormalizedProduct`
- SPU：title、brand、category、description、images、attributes
- SKU：seller_sku、specs、price、stock、barcode
- Logistics：delivery_method、freight_template_ref（平台侧引用，不跨平台复制）
- Compliance：qualification_refs、category_required_fields、review_state

每个平台独立实现 Adapter：
- authorize / refreshToken / revoke
- listProducts / getProduct
- getCategories / getProductSchema
- uploadMedia
- validateProduct
- createProduct / updateProduct
- updateSku / updateInventory
- getReviewStatus

## 必须遵守的业务规则

1. 目标平台类目 ID、属性模板、品牌资质、运费模板 ID 不可从来源平台原样复制；必须在目标店铺重新匹配。
2. SKU 规格值需映射到目标平台允许的规格名/枚举；无法映射时阻止发布并提示人工处理。
3. 图片 URL 不能直接视为已上传到目标平台。需下载/处理后走目标平台素材上传 API，并校验尺寸、格式、数量、大小及审核规则。
4. 商品详情应清洗外链、二维码、其他平台水印和不允许的联系方式；保留合规商品信息，不做规避审核处理。
5. 价格和库存先生成变更预览；用户确认后才可执行写操作。库存同步应考虑多平台库存共享和超卖风险。
6. 所有写接口使用幂等键/外部商品编码，记录请求摘要、响应、平台商品 ID、审核状态；不得并发重复创建。
7. 授权令牌只保存在服务端加密存储；不放浏览器 localStorage、前端代码、Excel、日志或 Git。
8. 没有沙箱时只允许读取/校验；真实店铺的发布、编辑、上下架均需用户逐批明确确认。

## 当前实现边界
当前前端只负责本地文件读取、商品字段归一、批量调整和通用导出。它不调用平台接口、不上传图片、不保存店铺令牌、不修改任何线上商品。正式 API 适配器必须部署在独立服务端，并完成安全评审和店铺授权后才启用。
