import React, { useState, useEffect } from 'react';
import { AlertCircle, Info, Calculator, RefreshCw, Settings2, Percent, ArrowDown } from 'lucide-react';
import { WaveChart } from './WaveChart';
import { WaveInputs, CalculationResult } from '../types';

const INITIAL_INPUTS: WaveInputs = {
  p0: '',
  p1: '',
  p2: '',
  p3: '',
  current: '',
};

export const CalculatorView: React.FC = () => {
  const [inputs, setInputs] = useState<WaveInputs>(INITIAL_INPUTS);
  const [fibRatio, setFibRatio] = useState<0.382 | 0.5 | 0.618>(0.382);
  const [result, setResult] = useState<CalculationResult>({
    isValid: false,
    w1Height: 0,
    w2RetracementPct: 0,
    w3Min: 0,
    w3Gold: 0,
    w4Target: 0,
    w5Target: 0,
    selectedRatio: 0.382,
    usingManualP3: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value)
    }));
  };

  const reset = () => {
    setInputs(INITIAL_INPUTS);
    setFibRatio(0.382);
  };

  // Logic Core
  useEffect(() => {
    const { p0, p1, p2, p3 } = inputs;
    
    // Check if we have enough data to calculate basic setup
    if (p0 === '' || p1 === '' || p2 === '') {
      setResult(prev => ({ ...prev, isValid: false, error: undefined }));
      return;
    }

    const valP0 = Number(p0);
    const valP1 = Number(p1);
    const valP2 = Number(p2);
    const valP3 = p3 !== '' ? Number(p3) : null;

    // Rule 1 Check: Wave 1 must move (assume Upward for simplicity)
    if (valP1 <= valP0) {
      setResult(prev => ({ ...prev, isValid: false, error: "第 1 波高點必須高於起漲點 (P1 > P0)" }));
      return;
    }

    // Rule 2 Check: Wave 2 cannot retrace more than 100% of Wave 1
    if (valP2 <= valP0) {
      setResult(prev => ({ ...prev, isValid: false, error: "波浪理論鐵律：第 2 波低點不能低於起漲點 (P2 破底)" }));
      return;
    }

    if (valP2 >= valP1) {
      setResult(prev => ({ ...prev, isValid: false, error: "第 2 波必須是回調 (P2 < P1)" }));
      return;
    }

    // Calculations
    const w1Height = valP1 - valP0;
    
    // W2 Retracement Percentage
    // (High - Low) / Height of W1
    const w2RetracementVal = valP1 - valP2;
    const w2RetracementPct = (w2RetracementVal / w1Height) * 100;

    // Wave 3 Targets (Projected)
    const w3Min = valP2 + w1Height; // 1.0 extension
    const w3Gold = valP2 + (w1Height * 1.618); // 1.618 extension (Golden Ratio)

    // Check P3 logic if entered
    if (valP3 !== null) {
      if (valP3 <= valP2) {
        setResult(prev => ({ ...prev, isValid: false, error: "第 3 波高點必須高於 P2" }));
        return;
      }
      // W3 usually higher than W1, but strictly just needs to be > P2 for calculation
    }

    // Wave 4 Targets 
    // Logic: W4 retraces W3 (P2 to P3).
    // If user provided P3, use it. Otherwise use w3Gold as the "Projected Peak".
    const activeW3Peak = valP3 !== null ? valP3 : w3Gold;
    
    // The height of Wave 3
    const w3Height = activeW3Peak - valP2;
    
    // W4 Target = Peak - (Height * Ratio)
    // This ensures we are calculating the retracement based on the magnitude of Wave 3
    const w4Target = activeW3Peak - (w3Height * fibRatio);

    // Wave 5 Target
    // W5 often equals W1 height, projected from W4 end
    const w5Target = w4Target + w1Height;

    setResult({
      isValid: true,
      error: undefined,
      w1Height,
      w2RetracementPct,
      w3Min,
      w3Gold,
      w4Target,
      w5Target,
      selectedRatio: fibRatio,
      usingManualP3: valP3 !== null
    });

  }, [inputs, fibRatio]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-finance-accent" />
          波浪計算器
        </h2>
        <button 
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-finance-muted hover:text-white transition-colors border border-slate-700 hover:border-slate-500 rounded-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重置
        </button>
      </div>

      <div className="space-y-8">
        {/* Settings & Input Section */}
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Input P0 */}
            <div className="bg-finance-card p-4 rounded-xl border border-slate-700 shadow-sm relative group">
              <label className="text-xs text-finance-muted font-bold mb-1.5 block uppercase tracking-wider">0. 起漲點 (Start)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                <input 
                  type="number" 
                  name="p0"
                  value={inputs.p0} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-7 pr-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-finance-accent focus:border-transparent transition-all placeholder-slate-700"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Input P1 */}
            <div className="bg-finance-card p-4 rounded-xl border border-slate-700 shadow-sm relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-0.5 rounded-full border border-slate-600 text-finance-muted">W1 High</div>
              <label className="text-xs text-finance-muted font-bold mb-1.5 block uppercase tracking-wider">1. 第一波高點</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                <input 
                  type="number" 
                  name="p1"
                  value={inputs.p1} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-7 pr-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-finance-accent focus:border-transparent transition-all placeholder-slate-700"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Input P2 */}
            <div className="bg-finance-card p-4 rounded-xl border border-slate-700 shadow-sm relative group">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-800 text-[10px] px-2 py-0.5 rounded-full border border-slate-600 text-finance-muted">W2 Low</div>
              <label className="text-xs text-finance-muted font-bold mb-1.5 block uppercase tracking-wider flex justify-between">
                <span>2. 第二波低點</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                <input 
                  type="number" 
                  name="p2"
                  value={inputs.p2} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-7 pr-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-finance-accent focus:border-transparent transition-all placeholder-slate-700"
                  placeholder="0.00"
                />
              </div>
              {/* W2 Retracement Helper Badge */}
              {result.w2RetracementPct > 0 && result.isValid && (
                <div className={`mt-2 flex items-center justify-end text-xs font-mono ${
                  result.w2RetracementPct > 100 ? 'text-finance-down' : 'text-finance-up'
                }`}>
                  <Percent className="w-3 h-3 mr-1" />
                  回調: {result.w2RetracementPct.toFixed(1)}%
                </div>
              )}
            </div>
            
            {/* Input P3 (Optional) */}
             <div className="bg-finance-card p-4 rounded-xl border border-slate-700 shadow-sm relative group bg-gradient-to-br from-finance-card to-slate-800">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-900/80 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/50 text-indigo-200">W3 High (選填)</div>
              <label className="text-xs text-indigo-300 font-bold mb-1.5 block uppercase tracking-wider">3. 第三波高點</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                <input 
                  type="number" 
                  name="p3"
                  value={inputs.p3} 
                  onChange={handleInputChange}
                  className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg py-2 pl-7 pr-3 font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all placeholder-slate-600"
                  placeholder="預測值 1.618"
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Ratio Selector */}
             <div className="bg-finance-card p-4 rounded-xl border border-slate-700 shadow-sm flex flex-col justify-between gap-2">
                 <div className="flex items-center gap-2 text-finance-muted mb-1">
                   <Settings2 className="w-4 h-4" />
                   <span className="text-sm font-bold">設定：第 4 波回測比例 (W4 Retracement)</span>
                 </div>
                 <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
                   {[0.382, 0.5, 0.618].map((ratio) => (
                     <button
                      key={ratio}
                      onClick={() => setFibRatio(ratio as 0.382 | 0.5 | 0.618)}
                      className={`flex-1 py-2 text-xs font-mono rounded-md transition-all ${
                        fibRatio === ratio 
                          ? 'bg-rose-600 text-white shadow-md' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                     >
                       {ratio === 0.382 ? '強勢整理 (0.382)' : ratio === 0.5 ? '標準回測 (0.500)' : '深幅回測 (0.618)'}
                     </button>
                   ))}
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">
                   計算基準：{result.usingManualP3 ? '真實 P3 - P2' : '預測 P3 (1.618) - P2'} 的 {fibRatio} 倍
                 </p>
              </div>

               {/* Current Price */}
              <div className="bg-finance-card p-4 rounded-xl border border-dashed border-slate-600 bg-opacity-50 relative group">
                 <label className="text-xs text-finance-warn font-bold mb-1.5 block uppercase tracking-wider flex items-center gap-1">
                   參考：目前股價 (Current)
                 </label>
                 <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-mono">$</span>
                  <input 
                    type="number" 
                    name="current"
                    value={inputs.current} 
                    onChange={handleInputChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-7 pr-3 font-mono text-finance-warn focus:outline-none focus:ring-2 focus:ring-finance-warn focus:border-transparent transition-all placeholder-slate-700"
                    placeholder="Optional"
                  />
                </div>
              </div>
          </div>
        </div>

        {/* Error Message */}
        {result.error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 animate-pulse">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-400">邏輯錯誤</h3>
              <p className="text-xs text-red-300 mt-1">{result.error}</p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Results */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-sm font-bold text-finance-muted uppercase tracking-widest flex items-center gap-2">
              <Calculator className="w-4 h-4" /> 預測目標
            </h2>

            {!result.isValid ? (
              <div className="text-center py-10 border border-slate-800 rounded-xl bg-slate-900/50 text-slate-600">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">請輸入有效的 P0, P1, P2 數據</p>
              </div>
            ) : (
              <div className="space-y-3">
                
                {/* Wave 3 Card */}
                <div className={`bg-finance-card rounded-xl border-l-4 ${result.usingManualP3 ? 'border-l-slate-500 opacity-75' : 'border-l-emerald-500'} overflow-hidden shadow-lg transition-colors`}>
                  <div className="p-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className={`text-sm font-bold ${result.usingManualP3 ? 'text-slate-400' : 'text-emerald-400'}`}>
                        {result.usingManualP3 ? '第 3 波高點 (已輸入)' : '第 3 波目標 (主升段)'}
                      </h3>
                      {!result.usingManualP3 && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">1.618x</span>}
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-mono font-bold text-white tracking-tight">
                        {inputs.p3 ? Number(inputs.p3).toFixed(2) : result.w3Gold.toFixed(2)}
                      </p>
                      {!result.usingManualP3 && <p className="text-xs text-slate-500 mb-1">Min: {result.w3Min.toFixed(2)}</p>}
                    </div>
                  </div>
                </div>

                 {/* Wave 4 Card (Dynamic) */}
                 <div className="bg-finance-card rounded-xl border-l-4 border-l-rose-500 overflow-hidden shadow-lg group hover:bg-slate-800 transition-colors relative">
                  <div className="absolute right-0 top-0 p-2 opacity-10">
                    <ArrowDown className="w-12 h-12 text-rose-500" />
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-sm font-bold text-rose-400">第 4 波回測 (買點)</h3>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">{fibRatio} Fib</span>
                    </div>
                    <div className="flex items-end justify-between relative z-10">
                      <p className="text-3xl font-mono font-bold text-white tracking-tight">{result.w4Target.toFixed(2)}</p>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500">
                           W3高點: <span className="font-mono">{inputs.p3 ? inputs.p3 : result.w3Gold.toFixed(1)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Wave 5 Card */}
                <div className="bg-finance-card rounded-xl border-l-4 border-l-purple-500 overflow-hidden shadow-lg group hover:bg-slate-800 transition-colors">
                  <div className="p-4">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="text-sm font-bold text-purple-400">第 5 波末升 (目標)</h3>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">W1 Eq</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <p className="text-2xl font-mono font-bold text-white tracking-tight">{result.w5Target.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Helper Info */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 text-xs text-slate-400 leading-relaxed">
              <p className="mb-2 font-bold text-slate-300">本局計算公式：</p>
              <ul className="space-y-1 list-disc list-inside marker:text-finance-accent">
                <li>
                    W3 採 {result.usingManualP3 ? <span className="text-indigo-300 font-bold">手動輸入值</span> : <span>P2 + (W1 × 1.618)</span>}
                </li>
                <li>
                    W4 = W3高點 - (W3幅度 × <span className="text-rose-400 font-bold">{fibRatio}</span>)
                </li>
                <li>W5 目標 = W4回測 + W1等長高度</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Chart */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-finance-muted uppercase tracking-widest">
                波浪走勢模擬
              </h2>
              {result.isValid && (
                <span className="text-xs text-finance-up flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                  Projection Active
                </span>
              )}
            </div>
            
            <WaveChart inputs={inputs} results={result} />

            <div className="mt-4 grid grid-cols-2 gap-4">
               <div className="p-3 bg-finance-card border border-slate-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-finance-muted">第 1 波幅度</span>
                  <span className="text-xs font-bold text-finance-accent font-mono">{result.w1Height.toFixed(2)}</span>
               </div>
               <div className="p-3 bg-finance-card border border-slate-800 rounded-lg flex items-center justify-between">
                  <span className="text-xs text-finance-muted">目前狀態</span>
                  <span className="text-xs font-bold text-finance-text">
                    {inputs.current && result.isValid 
                      ? (Number(inputs.current) > (inputs.p3 ? Number(inputs.p3) : result.w3Gold) ? '可能處於第 5 波' 
                        : Number(inputs.current) > Number(inputs.p1) ? '第 3 波主升段' 
                        : '觀察中')
                      : '等待數據'}
                  </span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};