const BASE = "https://openapi.kwaixiaodian.com";

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function hmacBase64(secret, message) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
function sortedPairs(params) {
  return Object.entries(params).filter(([,v]) => v !== undefined && v !== null)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`).join("&");
}

/**
 * Kuaishou Merchant Open Platform signing/call.
 * Signature format follows official "API调用说明":
 * sorted system params + param JSON, append signSecret=..., HMAC_SHA256,
 * then form-encode fields for POST.
 */
export async function kuaishouCall(env, method, businessParam, options = {}) {
  const appKey = env.KUAISHOU_APP_KEY || env.KUAISHOU_CLIENT_ID;
  const signSecret = env.KUAISHOU_SIGN_SECRET || env.KUAISHOU_CLIENT_SECRET;
  const accessToken = env.KUAISHOU_ACCESS_TOKEN;
  if (!appKey || !signSecret || !accessToken) {
    throw new Error("KUAISHOU_CONFIG_INCOMPLETE");
  }
  const timestamp = String(Date.now());
  const param = JSON.stringify(businessParam || {});
  const system = {
    access_token: accessToken,
    appkey: appKey,
    method,
    param,
    signMethod: "HMAC_SHA256",
    timestamp,
    version: "1",
  };
  const canonical = sortedPairs(system) + `&signSecret=${signSecret}`;
  const sign = await hmacBase64(signSecret, canonical);
  const form = new URLSearchParams({ ...system, sign });
  const base = (env.KUAISHOU_API_BASE_URL || BASE).replace(/\/$/, "");
  const path = "/" + method.replaceAll(".", "/");
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: form.toString(),
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { raw: raw.slice(0, 1200) }; }
  if (!response.ok) throw new Error(`KUAISHOU_HTTP_${response.status}`);
  return data;
}

export async function kuaishouGetItem(env, itemId) {
  if (!/^\d+$/.test(String(itemId))) throw new Error("INVALID_ITEM_ID");
  return kuaishouCall(env, "open.item.get", { itemId: String(itemId) });
}

export async function kuaishouEditItem(env, payload) {
  if (!payload || !payload.itemId) throw new Error("ITEM_ID_REQUIRED");
  return kuaishouCall(env, "open.item.edit", payload);
}
