# PDF Tool Pro - 高级版

## 架构
- 前端: GitHub Pages (https://yuovo0519.github.io/pdf-tool-pro/)
- 后端: Deno Deploy (免费 Serverless)

## 部署 Deno Deploy
1. 安装 Deno: `curl -fsSL https://deno.land/install.sh | sh`
2. 登录 Deno Deploy: `deno deploy login`
3. 部署: `deno deploy deploy.ts`

## API 端点
- GET /api/health - 健康检查
- POST /api/compress - PDF 压缩
- POST /api/ocr - OCR 文字识别
- POST /api/pdf-to-word - PDF 转 Word

## 功能
- [x] PDF 压缩（真正的 Ghostscript 压缩）
- [x] OCR 文字识别
- [ ] PDF 转 Word
- [ ] PDF 合并
- [ ] PDF 拆分
