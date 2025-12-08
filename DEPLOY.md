# GitHub Pages 部署說明文件

本專案使用 React + Vite 建置。由於使用了 API Proxy 技術解決 CORS 問題，本專案可以完美運行於 GitHub Pages。

以下提供兩種部署方式：**自動部署 (推薦)** 與 **手動部署**。

## 前置準備

1. 確保您的電腦已安裝 [Node.js](https://nodejs.org/)。
2. 確保您有一個 [GitHub](https://github.com/) 帳號與建立好的 Repository。

## 關鍵設定 (重要！)

在開始之前，請務必修改 `vite.config.ts` 中的 `base` 設定：

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  // 請將 '/elliott-wave-pro/' 改為您的 Repository 名稱
  // 例如您的網址是 github.com/username/my-stock-app
  // 則這裡填寫 '/my-stock-app/'
  base: '/elliott-wave-pro/', 
})
```

---

## 方法一：使用 GitHub Actions 自動部署 (推薦)

本專案已包含 `.github/workflows/deploy.yml` 設定檔。

1. **建立 Repository**：在 GitHub 上建立一個新的 Repository。
2. **推送程式碼**：
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/您的帳號/您的Repo名稱.git
   git push -u origin main
   ```
3. **設定 Pages 權限**：
   - 進入 GitHub Repository 的 **Settings** > **Pages**。
   - 在 "Build and deployment" 區塊，Source 選擇 **Deploy from a branch**。
   - 這裡不需要手動選擇分支，Action 會自動建立 `gh-pages` 分支。
   - **重要**：前往 **Settings** > **Actions** > **General**，在 "Workflow permissions" 區塊，確保勾選 **Read and write permissions**，然後點擊 Save。
4. **觸發部署**：
   - 只要您推送程式碼到 `main` 分支，GitHub Actions 就會自動打包並部署。
   - 您可以在 Repository 的 **Actions** 頁籤查看進度。
   - 完成後，您的網站將會在 `https://您的帳號.github.io/您的Repo名稱/` 上線。

---

## 方法二：手動部署 (本機操作)

如果您不想使用 GitHub Actions，也可以在電腦上操作。

1. **安裝依賴**：
   ```bash
   npm install
   ```

2. **執行部署指令**：
   ```bash
   npm run deploy
   ```
   *此指令會執行 `npm run build` 打包專案，然後利用 `gh-pages` 套件將 `dist` 資料夾推送到 GitHub 的 `gh-pages` 分支。*

3. **開啟 GitHub Pages**：
   - 進入 GitHub Repository 的 **Settings** > **Pages**。
   - 在 "Build and deployment" 下的 Branch，選擇 **gh-pages** 分支以及 **/(root)** 資料夾。
   - 儲存後等待幾分鐘，網頁即可瀏覽。

---

## 常見問題 (Q&A)

**Q: 為什麼網頁打開是一片空白？**
A: 通常是因為 `vite.config.ts` 中的 `base` 路徑設定錯誤。請確保它與您的 GitHub Repository 名稱完全一致（包含前後的斜線 `/`）。

**Q: 為什麼我的 API 請求失敗？**
A: 
1. 確保您的網路環境可以存取 `corsproxy.io` 或 `allorigins.win`。
2. 檢查瀏覽器的 Console (F12) 是否有錯誤訊息。本專案已內建 CORS Proxy 處理，理論上在 GitHub Pages 上應能正常運作。
