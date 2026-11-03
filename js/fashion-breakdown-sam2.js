/* Nalan AI Fashion Breakdown — SAM 2 adapter
 * The browser does not run SAM 2 itself. This adapter talks to a user-provided
 * inference service implementing the documented JSON contract in docs/.
 * No endpoint or credential is bundled with the application.
 */
(function (root) {
  'use strict';

  function assertBox(box) {
    const values = box && [box.x, box.y, box.w, box.h];
    if (!values || !values.every(Number.isFinite) ||
        box.x < 0 || box.y < 0 || box.w <= 0 || box.h <= 0 ||
        box.x + box.w > 1.001 || box.y + box.h > 1.001) {
      throw new Error('无效的分割提示框');
    }
  }

  function imageToDataUrl(image, maxEdge) {
    const limit = Math.max(256, Number(maxEdge) || 1600);
    const scale = Math.min(1, limit / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  async function segment(options) {
    const endpoint = String(options.endpoint || '').trim();
    if (!endpoint) throw new Error('请先配置 SAM 2 推理服务地址');
    assertBox(options.box);
    if (!options.image) throw new Error('缺少待分割图片');

    const headers = { 'Content-Type': 'application/json' };
    if (options.token) headers.Authorization = 'Bearer ' + options.token;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        image: imageToDataUrl(options.image, options.maxEdge),
        prompt: { type: 'box', x: options.box.x, y: options.box.y, w: options.box.w, h: options.box.h },
        output: 'mask_png'
      }),
      signal: options.signal
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 240);
      throw new Error('SAM 2 服务返回 ' + response.status + (detail ? '：' + detail : ''));
    }

    const result = await response.json();
    if (!result || typeof result.mask !== 'string' ||
        !/^data:image\/png;base64,/.test(result.mask)) {
      throw new Error('SAM 2 响应缺少有效 PNG mask');
    }
    if (result.confidence != null &&
        (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1)) {
      throw new Error('SAM 2 返回的置信度无效');
    }
    return { mask: result.mask, confidence: result.confidence ?? null };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('无法读取 SAM 2 mask 图片'));
      image.src = src;
    });
  }

  async function applyMaskToCrop(sourceImage, box, maskDataUrl) {
    assertBox(box);
    const mask = await loadImage(maskDataUrl);
    const sx = Math.round(box.x * sourceImage.naturalWidth);
    const sy = Math.round(box.y * sourceImage.naturalHeight);
    const sw = Math.max(1, Math.round(box.w * sourceImage.naturalWidth));
    const sh = Math.max(1, Math.round(box.h * sourceImage.naturalHeight));

    const crop = document.createElement('canvas');
    crop.width = sw;
    crop.height = sh;
    const ctx = crop.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(sourceImage, sx, sy, sw, sh, 0, 0, sw, sh);

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = sw;
    maskCanvas.height = sh;
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    maskCtx.drawImage(mask, 0, 0, sw, sh);
    const pixels = maskCtx.getImageData(0, 0, sw, sh);
    for (let i = 0; i < pixels.data.length; i += 4) {
      // Convert grayscale mask luminance into alpha. Supports white-foreground
      // masks and keeps antialiased edges instead of thresholding them.
      const luminance = Math.round(
        pixels.data[i] * 0.2126 + pixels.data[i + 1] * 0.7152 + pixels.data[i + 2] * 0.0722
      );
      pixels.data[i + 3] = Math.round(pixels.data[i + 3] * luminance / 255);
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    }
    maskCtx.putImageData(pixels, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0);
    return crop.toDataURL('image/png');
  }

  root.NalanSam2 = Object.freeze({ segment, applyMaskToCrop, imageToDataUrl });
})(typeof window !== 'undefined' ? window : globalThis);
