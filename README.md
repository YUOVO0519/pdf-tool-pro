# PDF 工具箱 Pro

高级版 PDF 工具，使用云端服务提供真正的 PDF 压缩和 OCR 识别功能。

## 功能

- 📷 拍照转 PDF
- 🖼️ 图片转 PDF
- 🔗 合并 PDF
- ✂️ 裁剪白边
- 📝 提取文字
- 🔬 OCR 文字识别（Pro）
- 🗜️ PDF 压缩（Pro）

## 架构

- **前端**: GitHub Pages
- **后端**: Vercel Serverless Functions
- **处理**: pdf-lib (本地) + Ghostscript (云端 Pro)

## 部署

### 前端 (GitHub Pages)
自动部署到 `https://yuovo0519.github.io/pdf-tool-pro/`

### 后端 (Vercel)
```bash
npm install -g vercel
vercel login
vercel --prod
```

## API

- `GET /api/health` - 健康检查
- `POST /api/compress` - PDF 压缩（需要 Vercer 部署）
- `POST /api/ocr` - OCR 识别（需要 Vercel 部署）
