import React, { useState, useEffect } from 'react';
import { Search, AlertCircle, Loader2, Star, X, Database } from 'lucide-react';
import { CandleData } from '../types';
import { SmartChart } from './SmartChart';

const MAX_BARS = 3000; // Limit memory usage (~12 years of daily data)

export const StockAnalyzer: React.FC = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CandleData[]>([]);
  const [displaySymbol, setDisplaySymbol] = useState('');
  
  // Watchlist State
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ew_watchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist Watchlist
  useEffect(() => {
    localStorage.setItem('ew_watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (sym: string) => {
    if (!sym) return;
    setWatchlist(prev => {
      if (prev.includes(sym)) {
        return prev.filter(s => s !== sym);
      }
      return [...prev, sym];
    });
  };

  const removeFromWatchlist = (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    setWatchlist(prev => prev.filter(s => s !== sym));
  };

  // Helper to parse Yahoo JSON structure
  const parseYahooData = (quote: any) => {
      const timestamps = quote.timestamp || [];
      const quotes = quote.indicators.quote[0];
      
      const parsedData: CandleData[] = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i] || 0
      })).filter((d: any) => d.open !== null && d.close !== null);

      return { parsedData, meta: quote.meta };
  };

  // Fetch helper with Fallback Strategy
  const fetchDataRange = async (sym: string, period1: number, period2: number) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&period1=${period1}&period2=${period2}`;
      
      // Strategy 1: corsproxy.io (Preferred - Fast & Reliable)
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const json = await response.json();
            if (json.chart?.result?.[0]) {
                return parseYahooData(json.chart.result[0]);
            }
        }
      } catch (e) {
        console.warn("Strategy 1 (corsproxy.io) failed, attempting fallback...", e);
      }

      // Strategy 2: allorigins.win (Fallback - Returns JSON wrapper)
      try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
             const json = await response.json();
             if (json.contents) {
                 const result = JSON.parse(json.contents);
                 if (result.chart?.result?.[0]) {
                     return parseYahooData(result.chart.result[0]);
                 }
             }
        }
      } catch (e) {
          console.warn("Strategy 2 (allorigins) failed, attempting fallback...", e);
      }

      // Strategy 3: CodeTabs (Last Resort)
      try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const json = await response.json();
            if (json.chart?.result?.[0]) {
                return parseYahooData(json.chart.result[0]);
            }
        }
      } catch (e) {
          console.warn("Strategy 3 (codetabs) failed", e);
      }
      
      throw new Error("無法取得資料，可能是網路問題或資料來源暫時無法存取 (CORS Proxy Error)");
  };

  const fetchStockData = async (e?: React.FormEvent, overrideSymbol?: string) => {
    if (e) e.preventDefault();
    
    const targetSymbol = overrideSymbol || symbol;
    if (!targetSymbol) return;

    if (overrideSymbol) setSymbol(overrideSymbol);

    setLoading(true);
    setError(null);
    setData([]);
    setDisplaySymbol('');

    try {
      const querySymbol = targetSymbol.match(/^\d{4}$/) && !targetSymbol.includes('.') ? `${targetSymbol}.TW` : targetSymbol.toUpperCase();
      
      const end = Math.floor(Date.now() / 1000);
      const start = end - (180 * 24 * 60 * 60); // Start with 6 months

      const { parsedData, meta } = await fetchDataRange(querySymbol, start, end);
      
      if (parsedData.length === 0) throw new Error("查無資料");

      setData(parsedData);
      setDisplaySymbol(meta.symbol);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "讀取失敗，請確認代號正確 (如: 2330) 或稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || data.length === 0) return;
    
    // Check Memory Safety Limit
    if (data.length >= MAX_BARS) {
        return; // Silently stop or show toast
    }

    setLoadingMore(true);

    try {
       const currentStart = new Date(data[0].date).getTime() / 1000;
       const newStart = currentStart - (180 * 24 * 60 * 60); 
       
       const { parsedData } = await fetchDataRange(displaySymbol, Math.floor(newStart), Math.floor(currentStart));
       
       if (parsedData.length > 0) {
          setData(prev => {
             // Safety check against duplicates
             const existingDates = new Set(prev.map(d => d.date));
             const uniqueNewData = parsedData.filter(d => !existingDates.has(d.date));
             
             // Enforce Max Bars (Keep newest)
             const combined = [...uniqueNewData, ...prev];
             if (combined.length > MAX_BARS) {
                 return combined.slice(combined.length - MAX_BARS);
             }
             return combined;
          });
       }
    } catch (err) {
       console.error("Failed to load history", err);
    } finally {
       setLoadingMore(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="bg-finance-card p-6 rounded-xl border border-slate-700 shadow-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-finance-accent" />
              實戰波浪分析 (Yahoo K線)
            </h2>
            {displaySymbol && (
                <div className="flex items-center gap-3">
                    {/* Data Count Indicator */}
                    <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-400">
                        <Database className="w-3 h-3" />
                        <span>{data.length} / {MAX_BARS} Bars</span>
                    </div>

                    <button 
                        onClick={() => toggleWatchlist(displaySymbol)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
                    >
                        <Star className={`w-5 h-5 ${watchlist.includes(displaySymbol) ? "fill-yellow-500 text-yellow-500" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-300">
                            {watchlist.includes(displaySymbol) ? "已關注" : "加入關注"}
                        </span>
                    </button>
                </div>
            )}
          </div>
          
          <form onSubmit={(e) => fetchStockData(e)} className="flex gap-3">
             <div className="relative flex-1">
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="輸入代號 (例: 2330, TSLA)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-4 pr-4 font-mono text-white focus:outline-none focus:ring-2 focus:ring-finance-accent transition-all placeholder-slate-600"
                />
             </div>
             <button 
                type="submit" 
                disabled={loading}
                className="bg-finance-accent hover:bg-blue-600 disabled:bg-slate-700 text-white font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center"
             >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '載入'}
             </button>
          </form>

          {watchlist.length > 0 && (
            <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                    <Star className="w-3 h-3" /> 我的關注 (點擊載入):
                </p>
                <div className="flex flex-wrap gap-2">
                    {watchlist.map(sym => (
                        <div key={sym} className="group relative">
                            <button
                                onClick={() => fetchStockData(undefined, sym)}
                                className={`text-xs px-3 py-1.5 rounded-md border flex items-center gap-1 transition-all ${
                                    displaySymbol === sym 
                                    ? 'bg-finance-accent text-white border-finance-accent shadow-md shadow-blue-900/30' 
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:border-slate-600'
                                }`}
                            >
                                <span className="font-mono">{sym}</span>
                            </button>
                            <button 
                                onClick={(e) => removeFromWatchlist(e, sym)}
                                className="absolute -top-1.5 -right-1.5 bg-slate-700 text-slate-400 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                title="移除"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-sm">
               <AlertCircle className="w-4 h-4" />
               {error}
            </div>
          )}
          
          {data.length >= MAX_BARS && !loading && (
             <div className="mt-2 text-[10px] text-orange-400 flex items-center gap-1">
                <Database className="w-3 h-3" />
                已達到記憶體優化上限 ({MAX_BARS} 根 K 線)，停止載入更早歷史。
             </div>
          )}
       </div>

       {data.length > 0 ? (
          <SmartChart 
            data={data} 
            symbol={displaySymbol} 
            onLoadMore={handleLoadMore} 
            isLoadingMore={loadingMore}
          />
       ) : (
          !loading && (
             <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
                <Search className="w-12 h-12 mb-2 opacity-20" />
                <p>請輸入股票代號開始分析</p>
                <p className="text-xs mt-1 text-slate-600">支援台股 (2330) 與 美股 (AAPL)</p>
                <p className="text-xs mt-1 text-slate-600">滑鼠滾輪可縮放，向右拖曳可讀取更早資料</p>
             </div>
          )
       )}
    </div>
  );
};
