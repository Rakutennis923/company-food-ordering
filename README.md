# 公司訂餐系統

提供值班人員選店、隨機抽店、同事點餐、金額統計、結單紀錄、店家搜尋及菜單管理。電腦與手機皆可使用。

## 先在本機預覽

```bash
npm install
npm run dev
```

開啟畫面顯示的本機網址。未設定雲端連線時，系統會使用瀏覽器 localStorage 保存資料，適合先測試功能。

## Google Sheet／Apps Script 設定

1. 建立 Google Sheet，選擇「擴充功能 → Apps Script」。
2. 將 `apps-script/Code.gs` 全部貼入並儲存。
3. 執行一次 `setupSystem()`，授權後從執行記錄保存 `API_TOKEN`。
4. 到「專案設定 → 指令碼屬性」新增 `PLACES_API_KEY`，值為 Google Places API (New) 金鑰。
5. 選擇「部署 → 新增部署作業 → 網頁應用程式」：
   - 執行身分：自己
   - 存取權：任何人
6. 複製部署網址，到訂餐系統的「設定」頁貼入部署網址及 API_TOKEN。

日後修改 Apps Script，請在「管理部署作業」建立新版本再部署；網址可維持不變。

## GitHub

本專案已設定 GitHub Pages 自動部署。推送至 `main` 後，
GitHub Actions 會執行安裝、建置、測試與部署。

網站網址：

`https://rakutennis923.github.io/company-food-ordering/`

Google API 金鑰與 API_TOKEN 不可寫入程式碼或上傳 GitHub。

## 價格提醒

菜單價格僅供參考，實際售價與供應狀況應以店家當日公告及電話確認為準。
