import { kuaishouGetItem, kuaishouEditItem } from "./_lib/kuaishou.js";

const PLATFORMS = ["douyin", "kuaishou", "wechat"];
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS }); }
function has(env, key) { return Boolean(env[key]); }
function statusFor(env, platform) {
  const fields = platform === "kuaishou"
    ? ["KUAISHOU_APP_KEY", "KUAISHOU_SIGN_SECRET", "KUAISHOU_ACCESS_TOKEN"]
    : platform === "douyin"
      ? ["DOUYIN_CLIENT_ID", "DOUYIN_CLIENT_SECRET", "DOUYIN_API_BASE_URL"]
      : ["WECHAT_CLIENT_ID", "WECHAT_CLIENT_SECRET", "WECHAT_API_BASE_URL"];
  return {
    platform,
    configured: fields.every(k => has(env, k)),
    fields: Object.fromEntries(fields.map(k => [k, has(env, k)])),
    adapter: platform === "kuaishou" ? "signed-merchant-api-read-detail" : "protocol-awaiting-official-app-docs",
    connection: "not_verified",
    note: "已填写凭证不代表店铺授权有效；需通过实际只读接口验证",
  };
}
function requireAdmin(request, env) {
  const expected = env.PRODUCT_MOVER_ADMIN_KEY;
  return Boolean(expected && request.headers.get("authorization") === `Bearer ${expected}`);
}
function pending(platform, feature) {
  return json({ ok: false, code: "ADAPTER_NOT_READY", platform, feature,
    message: "该平台此项接口尚未完成官方协议/权限核验，当前不会发起请求。" }, 501);
}
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const routePath = url.pathname.startsWith("/api/product-mover/") ? url.pathname.slice("/api/product-mover/".length) : "";
  const parts = routePath.split("/").filter(Boolean);
  const [resource, platform, action] = parts;
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || url.origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-product-mover-confirm",
    "access-control-max-age": "86400",
  }});
  if (resource === "health" && request.method === "GET")
    return json({ ok: true, service: "nalan-product-mover-api", version: 2, mode: "adapter-scaffold" });
  if (resource === "platforms" && request.method === "GET")
    return json({ ok: true, platforms: PLATFORMS.map(p => statusFor(env, p)) });

  if (!requireAdmin(request, env))
    return json({ ok: false, code: "UNAUTHORIZED", message: "需要服务端管理会话；禁止把管理密钥放入公开前端。" }, 401);

  if (resource === "products" && platform === "kuaishou" && request.method === "GET" && action) {
    try {
      const result = await kuaishouGetItem(env, action);
      return json({ ok: true, platform, operation: "get_item", result });
    } catch (error) {
      const message = String(error?.message || "");
      const status = message === "KUAISHOU_CONFIG_INCOMPLETE" ? 409 : 502;
      return json({ ok: false, code: message || "KUAISHOU_REQUEST_FAILED",
        message: status === 409 ? "请在 Cloudflare 服务端填写快手 appKey、signSecret 和授权 accessToken。" : "快手接口调用失败，请检查应用权限、授权状态和平台返回码；敏感信息已隐藏。" }, status);
    }
  }

  if (resource === "products" && platform === "kuaishou" && action === "edit" && request.method === "POST") {
    if (env.PRODUCT_MOVER_WRITE_ENABLED !== "true")
      return json({ ok: false, code: "WRITE_DISABLED", message: "线上商品写操作默认关闭；需完成测试与单独启用。" }, 403);
    if (request.headers.get("x-product-mover-confirm") !== "CONFIRM_SINGLE_ITEM_WRITE")
      return json({ ok: false, code: "EXPLICIT_CONFIRM_REQUIRED", message: "缺少单商品写入确认标记。" }, 400);
    try {
      const payload = await request.json();
      const result = await kuaishouEditItem(env, payload);
      return json({ ok: true, platform, operation: "edit_item", result });
    } catch (error) {
      const message = String(error?.message || "");
      return json({ ok: false, code: message || "KUAISHOU_EDIT_FAILED",
        message: "快手编辑请求失败；请检查字段、商品状态和应用权限。敏感信息已隐藏。" }, message === "KUAISHOU_CONFIG_INCOMPLETE" ? 409 : 502);
    }
  }

  if (resource === "connections" && PLATFORMS.includes(platform))
    return pending(platform, action || "oauth");
  if (resource === "products" && PLATFORMS.includes(platform))
    return pending(platform, action || "products");
  return json({ ok: false, code: "NOT_FOUND" }, 404);
}
