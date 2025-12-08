import React, { useMemo } from 'react';
import { CalculationResult, WaveInputs } from '../types';

interface WaveChartProps {
  inputs: WaveInputs;
  results: CalculationResult;
}

export const WaveChart: React.FC<WaveChartProps> = ({ inputs, results }) => {
  const { p0, p1, p2, p3, current } = inputs;

  const points = useMemo(() => {
    if (!results.isValid || p0 === '' || p1 === '' || p2 === '') return [];

    // X coordinates are fixed percentages to represent "Time" abstractly
    // 0: Start, 1: W1 Top, 2: W2 Bottom, 3: W3 Top, 4: W4 Bottom, 5: W5 Top
    const xCoords = [10, 30, 45, 70, 80, 95];

    // Determine if W3 is manual or projected
    const w3Val = results.usingManualP3 && p3 !== '' ? Number(p3) : results.w3Gold;
    const w3Type = results.usingManualP3 ? 'solid' : 'dashed';
    const w3Label = results.usingManualP3 ? '3 (Input)' : '3 (Proj)';

    const dataPoints = [
      { x: xCoords[0], y: Number(p0), label: '0', type: 'solid' },
      { x: xCoords[1], y: Number(p1), label: '1', type: 'solid' },
      { x: xCoords[2], y: Number(p2), label: '2', type: 'solid' },
      { x: xCoords[3], y: w3Val, label: w3Label, type: w3Type },
      { x: xCoords[4], y: results.w4Target, label: `4 (${results.selectedRatio})`, type: 'dashed' },
      { x: xCoords[5], y: results.w5Target, label: '5 (Proj)', type: 'dashed' },
    ];

    return dataPoints;
  }, [inputs, results]);

  if (points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-finance-card rounded-xl border border-slate-700 text-finance-muted">
        <p>請輸入有效數據以產生圖表</p>
      </div>
    );
  }

  // Calculate ViewBox
  const allY = points.map(p => p.y);
  if (current !== '') allY.push(Number(current));
  
  const minVal = Math.min(...allY);
  const maxVal = Math.max(...allY);
  const padding = (maxVal - minVal) * 0.1 || 10; // 10% padding
  const yMin = minVal - padding;
  const yMax = maxVal + padding;
  const yRange = yMax - yMin;

  // Helper to scale Y to SVG coordinates (flip Y because SVG 0 is top)
  const scaleY = (val: number) => {
    return 100 - ((val - yMin) / yRange) * 100;
  };

  // Generate Path Strings
  // Segment 1: 0 -> 1 -> 2
  const solidPath1 = `M ${points[0].x} ${scaleY(points[0].y)} L ${points[1].x} ${scaleY(points[1].y)} L ${points[2].x} ${scaleY(points[2].y)}`;
  
  // Segment 2: 2 -> 3
  // If P3 is manually input, this segment is solid. If projected, it is dashed.
  // Note: 'points' array handles the 'type' attribute for W3 point, but we need to check segment type
  const isP3Solid = results.usingManualP3;
  const path2Start = `M ${points[2].x} ${scaleY(points[2].y)}`;
  const path2End = `L ${points[3].x} ${scaleY(points[3].y)}`;
  
  // Segment 3: 3 -> 4 -> 5
  const path3Start = `M ${points[3].x} ${scaleY(points[3].y)}`;
  const path3Rest = `L ${points[4].x} ${scaleY(points[4].y)} L ${points[5].x} ${scaleY(points[5].y)}`;

  const currentY = current !== '' ? scaleY(Number(current)) : null;

  return (
    <div className="w-full h-80 bg-finance-card rounded-xl border border-slate-700 p-4 relative overflow-hidden shadow-lg">
      <h3 className="text-finance-muted text-xs font-mono absolute top-4 left-4">WAVE PROJECTION</h3>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid Lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="#334155" strokeWidth="0.2" strokeDasharray="2" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.2" strokeDasharray="2" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#334155" strokeWidth="0.2" strokeDasharray="2" />

        {/* Current Price Line */}
        {currentY !== null && (
          <g>
            <line x1="0" y1={currentY} x2="100" y2={currentY} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="1 1" opacity="0.6" />
            <text x="2" y={currentY - 2} className="text-[3px] fill-finance-warn font-mono">現價 {current}</text>
          </g>
        )}

        {/* Waves */}
        {/* Solid 0-1-2 */}
        <path d={solidPath1} fill="none" stroke="#3b82f6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Wave 2-3 (Solid if P3 is input, else Dashed) */}
        <path d={path2Start + path2End} fill="none" stroke={isP3Solid ? "#3b82f6" : "#10b981"} strokeWidth="1" strokeDasharray={isP3Solid ? "" : "2 2"} strokeLinecap="round" strokeLinejoin="round" />

        {/* Wave 3-4-5 (Always Dashed for prediction) */}
        <path d={path3Start + path3Rest} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle 
              cx={p.x} 
              cy={scaleY(p.y)} 
              r="1.5" 
              className={(p.type === 'solid' || (i===3 && isP3Solid)) ? 'fill-finance-accent' : 'fill-finance-up'} 
              stroke="#0f172a" 
              strokeWidth="0.5"
            />
            <text 
              x={p.x} 
              y={scaleY(p.y) - 4} 
              textAnchor="middle" 
              className="text-[3px] fill-finance-text font-bold"
            >
              {p.label}
            </text>
            <text 
              x={p.x} 
              y={scaleY(p.y) + 6} 
              textAnchor="middle" 
              className="text-[3px] fill-finance-muted font-mono"
            >
              {p.y.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};