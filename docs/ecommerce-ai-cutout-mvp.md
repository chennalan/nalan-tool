# AI 智能抠图 MVP

## 实现范围
- 独立于现有基础修图流程，新增单图 AI 抠图区。
- 使用 BiRefNet Lite 512 ONNX 模型，经 Transformers.js 在浏览器本地推理。
- 优先 WebGPU，初始化失败时回退 WASM CPU。
- 支持透明 PNG、白/奶油白/浅灰背景 JPG 导出，以及边缘柔化预览。
- 图片不上传；推理运行库和模型权重从 CDN / Hugging Face 下载并由浏览器缓存。

## 模型与许可
- 模型：studioludens/birefnet-lite-512
- 模型卡：https://huggingface.co/studioludens/birefnet-lite-512
- 模型卡声明 MIT，FP16 ONNX 权重约 94MB，输入 512×512。
- 该模型是 BiRefNet Lite 的 512×512 浏览器适配导出。它不是 2K/4K 细节级 matting 模型；大图细肩带、蕾丝、网纱和半透明材质仍需人工检查。
- 模型仓库要求再分发时附带其 LICENSE 文件和版权声明。本项目不把模型权重复制进 Git 仓库，而是首次使用时从 Hugging Face 加载。

## 依赖
- @huggingface/transformers 3.8.1（jsDelivr ESM）
- studioludens/birefnet-lite-512（Hugging Face）

## 验收边界
- 已实现文件选择、模型加载、WebGPU/WASM 分支、蒙版应用、背景合成和导出流程。
- 需要在真实 Chrome/Edge 浏览器中验证 WebGPU 设备兼容、模型缓存、CORS/CDN 可用性及真实服装图边缘质量。
- 未宣称蕾丝/网纱完美抠图；512 输入分辨率是当前 MVP 的主要质量限制。
