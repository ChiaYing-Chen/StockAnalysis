import React, { useMemo } from 'react';
import { CandleData } from '../types';

interface CandleChartProps {
  data: CandleData[];
  width?: number;
  height?: number;
}

export const CandleChart: React.FC<CandleChartProps> = ({ data, width = 600, height = 300 }) => {
  const { minPrice, maxPrice, candles } = useMemo(() => {
    if (data.length === 0) return { minPrice: 0, maxPrice: 100, candles: [] };

    const minPrice = Math.min(...data.map(d => d.low));
    const maxPrice = Math.max(...data.map(d => d.high));
    const range = maxPrice - minPrice;
    const padding = range * 0.1;

    // Fixed width per candle calculation
    const candleWidth = (100 / data.length) * 0.7;
    const gap = (100 / data.length) * 0.3;

    const scaleY = (price: number) => {
      // SVG coordinate: 0 is top. 
      return 100 - ((price - (minPrice - padding)) / (range + padding * 2)) * 100;
    };

    const candleNodes = data.map((d, i) => {
      const x = i * (100 / data.length) + gap / 2;
      const yOpen = scaleY(d.open);
      const yClose = scaleY(d.close);
      const yHigh = scaleY(d.high);
      const yLow = scaleY(d.low);

      // Taiwan: Up (Close > Open) is RED, Down (Close < Open) is GREEN
      const isUp = d.close >= d.open;
      const color = isUp ? '#ef4444' : '#10b981'; // Tailwind red-500 : emerald-500
      
      return {
        x,
        yBody: Math.min(yOpen, yClose),
        hBody: Math.max(0.5, Math.abs(yClose - yOpen)), // Ensure min height for doji
        yWickTop: yHigh,
        yWickBottom: yLow,
        color,
        candleWidth,
        raw: d
      };
    });

    return { minPrice, maxPrice, candles: candleNodes };
  }, [data]);

  if (data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500">無數據</div>;
  }

  return (
    <div className="w-full h-64 md:h-80 relative overflow-hidden bg-slate-900/30 rounded-lg border border-slate-800">
       <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="#1e293b" strokeWidth="0.1" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.1" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#1e293b" strokeWidth="0.1" />

          {candles.map((c, i) => (
             <g key={i}>
                {/* Wick */}
                <line 
                  x1={c.x + c.candleWidth/2} 
                  y1={c.yWickTop} 
                  x2={c.x + c.candleWidth/2} 
                  y2={c.yWickBottom} 
                  stroke={c.color} 
                  strokeWidth="0.3" 
                />
                {/* Body */}
                <rect 
                  x={c.x} 
                  y={c.yBody} 
                  width={c.candleWidth} 
                  height={c.hBody} 
                  fill={c.color} 
                />
             </g>
          ))}
       </svg>
       {/* Price Labels Overlay */}
       <div className="absolute right-0 top-0 h-full flex flex-col justify-between py-2 px-1 text-[8px] text-slate-500 font-mono pointer-events-none bg-gradient-to-l from-slate-900/80 to-transparent">
          <span>{maxPrice.toFixed(2)}</span>
          <span>{minPrice.toFixed(2)}</span>
       </div>
    </div>
  );
};
