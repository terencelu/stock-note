const express = require('express');
const axios = require('axios');

const app = express();
// 雲端平台（如 Render）會自動注入 PORT 環境變數
const PORT = process.env.PORT || 3000;

// 首頁測試
app.get('/', (req, res) => {
  res.send('台股即時股價追蹤 API 服務運行中！格式：/api/stock/:symbol');
});

// 查詢特定股票 API (例如 /api/stock/2330)
app.get('/api/stock/:symbol', async (req, res) => {
  const symbol = req.params.symbol;
  
  try {
    // 使用證交所 MIS 即時查詢 API (tse_開頭為上市，otc_開頭為上櫃，此範例優先處理上市 tse)
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw`;
    
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const msgArray = response.data?.msgArray;

    if (!msgArray || msgArray.length === 0) {
      return res.status(404).json({ error: '找不到該股票資料，請確認股票代碼' });
    }

    const info = msgArray[0];
    
    // 整理傳回前端的資料
    const stockData = {
      code: info.c,               // 股票代碼 (2330)
      name: info.n,               // 股票名稱 (台積電)
      currentPrice: info.z || info.y, // 當前成交價 (若未成交取昨收y)
      yesterdayClose: info.y,     // 昨收價
      openPrice: info.o,          // 開盤價
      highPrice: info.h,          // 最高價
      lowPrice: info.l,           // 最低價
      volume: info.v,             // 累積成交量
      time: info.t                // 資料揭示時間
    };

    res.json({
      success: true,
      data: stockData
    });

  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ success: false, message: '抓取股價失敗' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});