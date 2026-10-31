/**
 * Nalan Product Mover — Cloudflare Pages Function API
 *
 * Credentials are read only from Cloudflare Pages Environment Variables.
 * Never return secrets or access tokens to the browser.
 *
 * This is a secure integration scaffold. Platform-specific signing, OAuth
 * endpoints and payload schemas must be filled from each merchant's approved
 * official API documentation; no undocumented endpoint is guessed here.
 */
const PLATFORMS = ["douyin", "kuaishou", "wechat"];
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
function platformConfig(env, platform) {
  const prefix = platform.toUpperCase();
  return {
    clientId: env[`${prefix}_CLIENT_ID`] || "",
    clientSecret: env[`${prefix}_CLIENT_SECRET`] || "",
    authorizeUrl: env[`${prefix}_AUTHORIZE_URL`] || "",
    tokenUrl: env[`${prefix}_TOKEN_URL`] || "",
    apiBaseUrl: env[`${prefix}_API_BASE_URL`] || "",
    redirectUri: env[`${prefix}_REDIRECT_URI`] || "",
  };
}
function isConfigured(c) {
  return Boolean(c.clientId && c.clientSecret && c.authorizeUrl && c.tokenUrl && c.redirectUri);
}
function safePlatformStatus(env, platform) {
  const c = platformConfig(env, platform);
  return {
    platform,
    configured: isConfigured(c),
    fields: {
      clientId: Boolean(c.clientId),
      clientSecret: Boolean(c.clientSecret),
      authorizeUrl: Boolean(c.authorizeUrl),
      tokenUrl: Boolean(c.tokenUrl),
      apiBaseUrl: Boolean(c.apiBaseUrl),
      redirectUri: Boolean(c.redirectUri),
    },
    connection: "not_connected",
    note: "配置项状态不代表平台应用已审核或店铺已授权",
  };
}
function requireAdmin(request, env) {
  const expected = env.PRODUCT_MOVER_ADMIN_KEY;
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}
function notReady(platform, feature) {
  return json({
    ok: false,
    code: "PLATFORM_ADAPTER_PENDING",
    platform,
    feature,
    message: "此平台的官方接口签名、权限和字段协议尚未完成核验；为避免调用错误接口，本功能暂未启用。",
  }, 501);
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/product-mover\/?/, "").split("/").filter(Boolean);
  const [resource, platform, action] = parts;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": env.ALLOWED_ORIGIN || url.origin,
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-max-age": "86400",
    }});
  }

  if (resource === "health" && request.method === "GET") {
    return json({ ok: true, service: "nalan-product-mover-api", version: 1, mode: "scaffold" });
  }
  if (resource === "platforms" && request.method === "GET") {
    return json({ ok: true, platforms: PLATFORMS.map(p => safePlatformStatus(env, p)) });
  }

  if (!requireAdmin(request, env)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "需要在服务端配置 PRODUCT_MOVER_ADMIN_KEY，并由管理端安全调用。" }, 401);
  }

  if (resource !== "connections" || !PLATFORMS.includes(platform)) {
    return json({ ok: false, code: "NOT_FOUND" }, 404);
  }

  const config = platformConfig(env, platform);
  if (action === "authorize" && request.method === "POST") {
    if (!isConfigured(config)) {
      return json({
        ok: false, code: "MISSING_PLATFORM_CONFIG",
        missing: Object.entries(config).filter(([, value]) => !value).map(([key]) => key),
        message: "请先在 Cloudflare Pages 对应环境中填写该平台配置；不要把密钥发到聊天或写入前端。",
      }, 409);
    }
    // OAuth parameters differ by platform. This endpoint deliberately does
    // not invent scopes/state/signature rules. Implement after official docs
    // and app permission review are available.
    return json({
      ok: false, code: "OAUTH_PROTOCOL_PENDING",
      message: "配置项已齐备，但该平台 OAuth 参数、签名和授权范围需按已审核应用的官方文档实现后才能生成授权链接。",
    }, 501);
  }

  if (action === "callback" && request.method === "GET") {
    // Do not accept a callback until state validation and provider-specific
    // code exchange + encrypted server-side token persistence are implemented.
    return json({
      ok: false, code: "OAUTH_CALLBACK_PENDING",
      message: "授权回调尚未启用：需先实现平台 state 校验、code 换 token 和加密持久化。",
    }, 501);
  }

  if (["products", "categories", "schema", "media", "publish", "inventory"].includes(action)) {
    return notReady(platform, action);
  }
  return json({ ok: false, code: "NOT_FOUND" }, 404);
}
