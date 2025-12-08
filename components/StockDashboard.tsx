import React, { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, TrendingDown, ArrowRight, BarChart2 } from 'lucide-react';
import { StockInfo, CandleData } from '../types';
import { CandleChart } from './CandleChart';

// Mock Data Generator
const generateMockData = (basePrice: number, days: number = 30): CandleData[] => {
  let currentPrice = basePrice;
  const data: CandleData[] = [];
  const now = new Date();
  
  for (let i = days; i > 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Random volatility between -2% and +2%
    const change = (Math.random() - 0.48) * 0.04; 
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(Math.random() * 10000) * 100 + 100000; // Mock volume
    
    data.push({
      date: date.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    });
    currentPrice = close;
  }
  return data;
};

// Known TW Stocks for Simulation
const STOCK_DB: Record<string, string> = {
  '2330': '台積電 TSMC',
  '2317': '鴻海 Hon Hai',
  '2454': '聯發科 MediaTek',
  '2303': '聯電 UMC',
  '2603': '長榮 Evergreen',
  '0050': '元大台灣50',
};

interface StockDashboardProps {
  onAnalyze: (price: number) => void;
}

export const StockDashboard: React.FC<StockDashboardProps> = ({ onAnalyze }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('ew_watchlist');
    return saved ? JSON.parse(saved) : ['2330'];
  });

  useEffect(() => {
    localStorage.setItem('ew_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    loadStock(searchTerm);
  };

  const loadStock = (code: string) => {
    // Simulate API Fetch
    const name = STOCK_DB[code] || `Stock ${code}`;
    // Generate deterministic random price based on code
    const basePrice = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) / 2;
    const mockCandles = generateMockData(basePrice);
    const lastCandle = mockCandles[mockCandles.length - 1];
    const prevCandle = mockCandles[mockCandles.length - 2];
    
    setSelectedStock({
      code,
      name,
      price: lastCandle.close,
      change: lastCandle.close - prevCandle.close,
      changePct: ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
    });
    setChartData(mockCandles);
  };

  const toggleWatchlist = (code: string) => {
    if (watchlist.includes(code)) {
      setWatchlist(prev => prev.filter(c => c !== code));
    } else {
      setWatchlist(prev => [...prev, code]);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Search Bar */}
      <div className="bg-finance-card p-6 rounded-xl border border-slate-700 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-finance-accent" />
          台股行情查詢
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-3 text-slate-500 w-5 h-5" />
             <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="輸入代號 (例如: 2330)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-finance-accent transition-all"
             />
          </div>
          <button type="submit" className="bg-finance-accent hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            查詢
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Watchlist Sidebar */}
        <div className="lg:col-span-1">
           <div className="bg-finance-card rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <h3 className="font-bold text-slate-300 flex items-center gap-2">
                   <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                   我的關注
                </h3>
              </div>
              <div className="divide-y divide-slate-800">
                {watchlist.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500 text-center">暫無關注股票</p>
                ) : (
                  watchlist.map(code => (
                    <button 
                      key={code}
                      onClick={() => loadStock(code)}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-800 transition-colors text-left group"
                    >
                      <div>
                        <span className="font-mono font-bold text-finance-accent">{code}</span>
                        <div className="text-xs text-slate-400">{STOCK_DB[code] || 'Stock'}</div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-finance-accent opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))
                )}
              </div>
           </div>
        </div>

        {/* Stock Detail & Chart */}
        <div className="lg:col-span-2">
          {selectedStock ? (
            <div className="bg-finance-card rounded-xl border border-slate-700 overflow-hidden shadow-xl">
               {/* Header */}
               <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-finance-card flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                       <h2 className="text-2xl font-bold text-white tracking-tight">{selectedStock.name}</h2>
                       <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded font-mono">{selectedStock.code}</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-3">
                       <span className={`text-3xl font-mono font-bold ${selectedStock.change >= 0 ? 'text-finance-down' : 'text-finance-up'}`}>
                         {selectedStock.price.toFixed(2)}
                       </span>
                       <span className={`flex items-center text-sm font-bold ${selectedStock.change >= 0 ? 'text-finance-down' : 'text-finance-up'}`}>
                         {selectedStock.change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                         {Math.abs(selectedStock.change).toFixed(2)} ({Math.abs(selectedStock.changePct).toFixed(2)}%)
                       </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleWatchlist(selectedStock.code)}
                    className="p-2 rounded-full hover:bg-slate-700 transition-colors"
                  >
                    <Star 
                      className={`w-6 h-6 ${watchlist.includes(selectedStock.code) ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} 
                    />
                  </button>
               </div>

               {/* Chart */}
               <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-slate-400">日 K 線圖 (模擬)</h3>
                     <div className="flex gap-2">
                       <span className="text-[10px] flex items-center gap-1 text-slate-500"><div className="w-2 h-2 bg-finance-down"></div> 漲 (Up)</span>
                       <span className="text-[10px] flex items-center gap-1 text-slate-500"><div className="w-2 h-2 bg-finance-up"></div> 跌 (Down)</span>
                     </div>
                  </div>
                  <CandleChart data={chartData} />
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={() => onAnalyze(selectedStock.price)}
                      className="flex items-center gap-2 bg-finance-accent hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-blue-900/20 transition-all hover:translate-y-[-1px]"
                    >
                      <BarChart2 className="w-4 h-4" />
                      帶入波浪計算
                    </button>
                  </div>
               </div>
            </div>
          ) : (
             <div className="h-full bg-finance-card rounded-xl border border-slate-700 flex flex-col items-center justify-center text-slate-500 p-12 text-center border-dashed">
                <BarChart2 className="w-12 h-12 mb-4 opacity-20" />
                <p>請輸入代號查詢或選擇關注股票</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};