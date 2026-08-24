const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 允許任何用戶端（如 Line Bot 伺服器、手機 App 或網頁）跨網域呼叫 API
app.use(cors());
app.use(express.json());

// 通用抓取台股資訊函式
async function getStockData(symbol) {
  // 自動判斷上市 (tse) 或上櫃 (otc) 查詢，這裡範例預設上市 tse
  const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw`;
  const response = await axios.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 5000 // 5 秒逾時保護
  });

  const msgArray = response.data?.msgArray;
  if (!msgArray || msgArray.length === 0) return null;

  const info = msgArray[0];
  return {
    code: info.c,
    name: info.n,
    price: parseFloat(info.z || info.y || 0), // 當前成交價
    yesterdayClose: parseFloat(info.y || 0),  // 昨收
    change: parseFloat((parseFloat(info.z || info.y) - parseFloat(info.y)).toFixed(2)), // 漲跌金額
    open: parseFloat(info.o || 0),
    high: parseFloat(info.h || 0),
    low: parseFloat(info.l || 0),
    volume: parseInt(info.v || 0, 10),
    time: info.t
  };
}

// 端點 1：單一股票查詢 -> GET /api/stock/2330
app.get('/api/stock/:symbol', async (req, res) => {
  try {
    const data = await getStockData(req.params.symbol);
    if (!data) return res.status(404).json({ success: false, message: '查無此股票代碼' });
    
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: '伺服器抓取資料失敗', error: error.message });
  }
});

// 端點 2：多檔股票批次查詢 -> POST /api/stocks  Body: { "symbols": ["2330", "2308", "2603"] }
app.post('/api/stocks', async (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols)) {
    return res.status(400).json({ success: false, message: '請傳入代碼陣列' });
  }

  try {
    const results = await Promise.all(symbols.map(sym => getStockData(sym)));
    const validData = results.filter(item => item !== null);
    res.json({ success: true, count: validData.length, data: validData });
  } catch (error) {
    res.status(500).json({ success: false, message: '批次抓取失敗' });
  }
});

app.listen(PORT, () => console.log(`Stock Server is running on port ${PORT}`));