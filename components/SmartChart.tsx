import React, { useMemo, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { CandleData, ChartPoint } from '../types';
import { MousePointer2, Trash2, Loader2, Undo2, X, CheckCircle2, Settings2, History, Zap, Activity, RefreshCw } from 'lucide-react';

interface SmartChartProps {
  data: CandleData[];
  symbol: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const SmartChartComponent: React.FC<SmartChartProps> = ({ data, symbol, onLoadMore, isLoadingMore }) => {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [selection, setSelection] = useState<number | null>(null);
  const [fibRatio, setFibRatio] = useState<0.382 | 0.5 | 0.618>(0.382);

  // Volume Alert State
  const [volAlertEnabled, setVolAlertEnabled] = useState(false);
  const [volMALength, setVolMALength] = useState(5); // Active value for calculation
  const [inputVolMALength, setInputVolMALength] = useState(5); // Input value
  const [showVolSettings, setShowVolSettings] = useState(false);

  // Granville State
  const [granvilleEnabled, setGranvilleEnabled] = useState(false);
  const [maLength, setMaLength] = useState(60); // Active value for calculation
  const [inputMaLength, setInputMaLength] = useState(60); // Input value
  const [showGranvilleSettings, setShowGranvilleSettings] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport State
  const [offset, setOffset] = useState(0);
  const [zoom, setZoom] = useState(60);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartOffset, setDragStartOffset] = useState(0);

  // Pinch Zoom State
  const [isPinching, setIsPinching] = useState(false);
  const [pinchStartDist, setPinchStartDist] = useState(0);
  const [pinchStartZoom, setPinchStartZoom] = useState(60);

  // Constants
  const FUTURE_BARS = points.length === 3 ? 30 : 5;
  const PADDING_TOP = 0.15;
  const VOLUME_HEIGHT_RATIO = 0.2;
  const RIGHT_AXIS_WIDTH = 50;

  const prevDataLen = useRef(data.length);

  // --- Synchronous Offset Adjustment ---
  let effectiveOffset = offset;
  let dataDiff = 0;

  if (data.length > prevDataLen.current) {
    dataDiff = data.length - prevDataLen.current;
    effectiveOffset = offset + dataDiff;
  }

  useEffect(() => {
    if (data.length > 0 && prevDataLen.current === 0) {
      setOffset(Math.max(0, data.length - 60));
    }
  }, [data.length]);

  useLayoutEffect(() => {
    if (data.length > prevDataLen.current) {
      const diff = data.length - prevDataLen.current;
      setOffset(prev => prev + diff);
      setSelection(prev => (prev !== null ? prev + diff : null));
      setPoints(prevPoints => prevPoints.map(p => ({ ...p, index: p.index + diff })));
      prevDataLen.current = data.length;
    } else if (data.length < prevDataLen.current) {
      prevDataLen.current = data.length;
      setOffset(Math.max(0, data.length - 60));
    } else {
      prevDataLen.current = data.length;
    }
  }, [data.length]);

  const visibleStartIndex = Math.floor(Math.max(0, effectiveOffset));
  const visibleEndIndex = Math.min(data.length - 1, Math.ceil(effectiveOffset + zoom));

  const {
    minPrice, maxPrice, maxVol,
    xScale, yScale, candleWidth,
    viewHighPoint, viewLowPoint,
    yAxisTicks,
    visibleData,
    maPoints,
    volMaPoints
  } = useMemo(() => {
    if (data.length === 0) return {
      minPrice: 0, maxPrice: 100, maxVol: 0,
      xScale: (i: number) => i, yScale: (p: number) => p,
      candleWidth: 10, viewHighPoint: null, viewLowPoint: null,
      yAxisTicks: [], visibleData: [], maPoints: "", volMaPoints: ""
    };

    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;

    let vHighVal = -Infinity;
    let vLowVal = Infinity;
    let vHighIdx = -1;
    let vLowIdx = -1;

    const start = Math.max(0, visibleStartIndex);
    const end = Math.min(data.length - 1, visibleEndIndex);
    const visData = [];

    // Pre-calculate Moving Average for Granville
    const maData = new Array(data.length).fill(null);
    if (granvilleEnabled) {
      for (let i = 0; i < data.length; i++) {
        if (i >= maLength - 1) {
          let sum = 0;
          for (let k = 0; k < maLength; k++) {
            sum += data[i - k].close;
          }
          maData[i] = sum / maLength;
        }
      }
    }

    const vLen = Math.max(1, Math.round(volMALength)); // Safe vol MA length

    for (let i = start; i <= end; i++) {
      const d = data[i];
      if (d.low < min) min = d.low;
      if (d.high > max) max = d.high;
      if (d.volume > maxV) maxV = d.volume;

      // Also consider MA in min/max if enabled and visible
      if (granvilleEnabled && maData[i] !== null) {
        if (maData[i] < min) min = maData[i];
        if (maData[i] > max) max = maData[i];
      }

      if (d.high > vHighVal) { vHighVal = d.high; vHighIdx = i; }
      if (d.low < vLowVal) { vLowVal = d.low; vLowIdx = i; }

      // Logic for Volume Anomaly
      let volMA: number | null = null;
      let isVolAnomaly = false;

      // Compare with average of PREVIOUS N days (Exclusive MA)
      // This detects breakouts relative to recent history
      if (i >= vLen) {
        let sumVol = 0;
        for (let k = 1; k <= vLen; k++) {
          sumVol += data[i - k].volume;
        }
        volMA = sumVol / vLen;
        if (d.volume >= volMA) { // Greater or Equal
          isVolAnomaly = true;
        }
      }

      // Logic for Granville Signals
      let granvilleSignal: { type: 'B' | 'S', code: number, label: string } | null = null;
      if (granvilleEnabled && i > maLength && maData[i] !== null && maData[i - 1] !== null) {
        const currentMa = maData[i];
        const prevMa = maData[i - 1];
        const prevPrice = data[i - 1].close;
        const currPrice = d.close;
        const bias = (currPrice - currentMa) / currentMa;

        // Slope (simplified trend)
        const isMaRising = currentMa > prevMa;
        const isMaFalling = currentMa < prevMa;

        // B1: Breakout - MA rising/flat, Price crosses Up
        if (!isMaFalling && prevPrice < prevMa && currPrice > currentMa) {
          granvilleSignal = { type: 'B', code: 1, label: '突破' };
        }
        // S5: Breakdown - MA falling/flat, Price crosses Down
        else if (!isMaRising && prevPrice > prevMa && currPrice < currentMa) {
          granvilleSignal = { type: 'S', code: 5, label: '跌破' };
        }
        // B4: Oversold - Bias < -20% (Adjustable)
        else if (bias < -0.20) {
          granvilleSignal = { type: 'B', code: 4, label: '超賣' };
        }
        // S8: Overbought - Bias > +20%
        else if (bias > 0.20) {
          granvilleSignal = { type: 'S', code: 8, label: '超買' };
        }
      }

      visData.push({ ...d, index: i, isVolAnomaly, volMA, maValue: maData[i], granvilleSignal });
    }

    if (min === Infinity) { min = 0; max = 100; }

    const priceRange = max - min;
    const paddedMin = min - (priceRange * PADDING_TOP);
    const paddedMax = max + (priceRange * PADDING_TOP);
    const viewHeight = paddedMax - paddedMin || 1;

    const WIDTH = 1000;
    const CHART_WIDTH = WIDTH - RIGHT_AXIS_WIDTH;
    const HEIGHT = 500;
    const CHART_H = HEIGHT * (1 - VOLUME_HEIGHT_RATIO);

    const effectiveZoom = zoom + (FUTURE_BARS * (zoom / 60));

    const getX = (index: number) => {
      return ((index - effectiveOffset) / effectiveZoom) * CHART_WIDTH;
    };

    const getY = (price: number) => {
      return CHART_H - ((price - paddedMin) / viewHeight) * CHART_H;
    };

    const cWidth = (CHART_WIDTH / effectiveZoom) * 0.7;

    const ticks = [];
    const step = priceRange / 5;
    for (let i = 0; i <= 5; i++) {
      ticks.push(min + (step * i));
    }

    const highPoint = vHighIdx !== -1 ? {
      x: getX(vHighIdx) + cWidth / 2,
      y: getY(vHighVal),
      price: vHighVal,
      isAnomaly: visData.find(d => d.index === vHighIdx)?.isVolAnomaly
    } : null;

    const lowPoint = vLowIdx !== -1 ? {
      x: getX(vLowIdx) + cWidth / 2,
      y: getY(vLowVal),
      price: vLowVal,
      isAnomaly: visData.find(d => d.index === vLowIdx)?.isVolAnomaly
    } : null;

    // Generate MA Path
    const maPointsString = visData
      .filter(d => d.maValue !== null)
      .map(d => `${getX(d.index) + cWidth / 2},${getY(d.maValue!)}`)
      .join(" ");

    // Generate Volume MA Path
    const volMaPointsString = visData
      .filter(d => d.volMA !== null)
      .map(d => {
        // Calculate height relative to Volume Chart Area (100px)
        // Clamp to avoid drawing over candles if MA > Max visible volume
        const maH = (d.volMA! / maxV) * (500 * VOLUME_HEIGHT_RATIO);
        const clampedH = Math.min(500 * VOLUME_HEIGHT_RATIO, maH);
        return `${getX(d.index) + cWidth / 2},${500 - clampedH}`;
      })
      .join(" ");

    return {
      minPrice: min,
      maxPrice: max,
      maxVol: maxV,
      xScale: getX,
      yScale: getY,
      candleWidth: cWidth,
      viewHighPoint: highPoint,
      viewLowPoint: lowPoint,
      yAxisTicks: ticks,
      visibleData: visData,
      maPoints: maPointsString,
      volMaPoints: volMaPointsString
    };
  }, [data, effectiveOffset, zoom, visibleStartIndex, visibleEndIndex, FUTURE_BARS, volMALength, granvilleEnabled, maLength]);

  // --- Handlers ---
  const applyGranvilleSettings = () => {
    setMaLength(inputMaLength);
    setShowGranvilleSettings(false);
  };

  const applyVolSettings = () => {
    setVolMALength(inputVolMALength);
    setShowVolSettings(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSensitivity = 0.05;
    const delta = e.deltaY * zoomSensitivity;
    setZoom(prev => Math.min(Math.max(15, prev + delta), 300));
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      setIsDragging(false);
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchStartDist(dist);
      setPinchStartZoom(zoom);
      return;
    }

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setDragStartOffset(offset);
  };

  const onDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (isPinching && 'touches' in e && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      if (pinchStartDist > 0) {
        const scale = pinchStartDist / dist;
        const newZoom = pinchStartZoom * scale;
        setZoom(Math.min(Math.max(15, newZoom), 300));
      }
      return;
    }

    if (!isDragging) return;

    if ('touches' in e && e.touches.length > 1) return;

    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = dragStartX - clientX;

    const svgWidth = svgRef.current?.getBoundingClientRect().width || 1000;
    const barsPerPixel = zoom / svgWidth;
    const deltaBars = deltaX * barsPerPixel;

    let newOffset = dragStartOffset + deltaBars;

    if (newOffset < -5 && onLoadMore && !isLoadingMore) {
      onLoadMore();
    }

    if (newOffset > data.length - 5) {
      newOffset = data.length - 5;
    }

    setOffset(newOffset);
  }, [isDragging, isPinching, dragStartX, dragStartOffset, zoom, data.length, onLoadMore, isLoadingMore, pinchStartDist, pinchStartZoom]);

  const stopDrag = () => {
    setIsDragging(false);
    setIsPinching(false);
  };

  useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('touchmove', onDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('touchmove', onDrag);
      window.removeEventListener('touchend', stopDrag);
    };
  }, [onDrag]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging || isPinching) return;
    if (!svgRef.current || data.length === 0) return;

    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const svgWidth = rect.width;

    if (x > svgWidth * (1 - RIGHT_AXIS_WIDTH / 1000)) return;

    const effectiveZoom = zoom + (FUTURE_BARS * (zoom / 60));
    const chartWidthRatio = (1000 - RIGHT_AXIS_WIDTH) / 1000;

    const clickIndexFloat = (x / (svgWidth * chartWidthRatio)) * effectiveZoom + effectiveOffset;
    const index = Math.round(clickIndexFloat);

    if (index >= 0 && index < data.length) {
      setSelection(index);
    } else {
      setSelection(null);
    }
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
    setSelection(null);
  };

  const handleClear = () => {
    setPoints([]);
    setSelection(null);
  };

  const handleResetView = () => {
    const targetZoom = 60;
    setZoom(targetZoom);
    setOffset(Math.max(0, data.length - targetZoom));
  };

  const getNextPointType = () => {
    if (points.length === 0) return { type: 'p0', label: 'P0', fullLabel: '設定為 P0 (起漲點)', priceType: 'low' };
    if (points.length === 1) return { type: 'p1', label: 'P1', fullLabel: '設定為 P1 (第一波高)', priceType: 'high' };
    if (points.length === 2) return { type: 'p2', label: 'P2', fullLabel: '設定為 P2 (第二波低)', priceType: 'low' };
    return null;
  };

  const confirmSetPoint = () => {
    if (selection === null) return;
    const nextInfo = getNextPointType();
    if (!nextInfo) return;

    const candle = data[selection];
    const price = nextInfo.priceType === 'high' ? candle.high : candle.low;

    setPoints(prev => [...prev, {
      index: selection,
      price,
      date: candle.date,
      type: nextInfo.type as any
    }]);

    setSelection(null);
  };

  const mappedPoints = useMemo(() => {
    return points.map(p => {
      const newIndex = data.findIndex(d => d.date === p.date);
      if (newIndex !== -1) return { ...p, index: newIndex };
      return { ...p, index: p.index + dataDiff };
    });
  }, [points, data, dataDiff]);

  const fibTimeLines = useMemo(() => {
    if (mappedPoints.length === 0) return [];

    const p0 = mappedPoints.find(p => p.type === 'p0');
    if (!p0) return [];

    const anchorIndex = p0.index;
    const fibs = [5, 8, 13, 21, 34, 55, 89, 144, 233, 377];

    return fibs.map(f => {
      const idx = anchorIndex + f;
      return {
        index: idx,
        num: f,
        x: xScale(idx)
      };
    });
  }, [mappedPoints, xScale]);

  const waveStats = useMemo(() => {
    if (mappedPoints.length < 2) return { w1Change: null, w2Retrace: null };

    const p0 = mappedPoints[0];
    const p1 = mappedPoints[1];
    const w1Change = ((p1.price - p0.price) / p0.price) * 100;

    let w2Retrace = null;
    if (mappedPoints.length >= 3) {
      const p2 = mappedPoints[2];
      const w1Height = Math.abs(p1.price - p0.price);
      const w2Drop = Math.abs(p1.price - p2.price);
      if (w1Height !== 0) {
        w2Retrace = (w2Drop / w1Height) * 100;
      }
    }

    return { w1Change, w2Retrace };
  }, [mappedPoints]);

  const projections = useMemo(() => {
    if (mappedPoints.length < 3) return null;

    const [p0, p1, p2] = mappedPoints;

    const w1Height = p1.price - p0.price;
    const w3Target = p2.price + (w1Height * 1.618);
    const w4Target = w3Target - ((w3Target - p2.price) * fibRatio);
    const w5Target = w4Target + w1Height;

    const t1 = Math.abs(p1.index - p0.index);
    const t3 = Math.max(5, Math.floor(t1 * 1.618));
    const t4 = Math.max(3, Math.floor(t1));
    const t5 = Math.max(5, t1);

    const p3Index = p2.index + t3;
    const p4Index = p3Index + t4;
    const p5Index = p4Index + t5;

    return {
      p3: { x: xScale(p3Index), y: yScale(w3Target), price: w3Target },
      p4: { x: xScale(p4Index), y: yScale(w4Target), price: w4Target },
      p5: { x: xScale(p5Index), y: yScale(w5Target), price: w5Target },
      lines: [
        { x1: xScale(p2.index), y1: yScale(p2.price), x2: xScale(p3Index), y2: yScale(w3Target) },
        { x1: xScale(p3Index), y1: yScale(w3Target), x2: xScale(p4Index), y2: yScale(w4Target) },
        { x1: xScale(p4Index), y1: yScale(w4Target), x2: xScale(p5Index), y2: yScale(w5Target) },
      ]
    };
  }, [mappedPoints, xScale, yScale, fibRatio]);

  const visibleCandlesRender = useMemo(() => {
    return visibleData.map((d) => {
      const x = xScale(d.index);
      const yOpen = yScale(d.open);
      const yClose = yScale(d.close);
      const yHigh = yScale(d.high);
      const yLow = yScale(d.low);
      const isUp = d.close >= d.open;
      const color = isUp ? '#ef4444' : '#10b981';
      const volHeight = (d.volume / maxVol) * (500 * VOLUME_HEIGHT_RATIO);

      return {
        ...d,
        x, yOpen, yClose, yHigh, yLow, isUp, color, volHeight
      };
    });
  }, [visibleData, xScale, yScale, maxVol, candleWidth]);


  if (data.length === 0) return <div className="text-center p-10 text-slate-500">無數據</div>;

  const selectionData = selection !== null && selection >= 0 && selection < data.length
    ? visibleData.find(d => d.index === selection) || { ...data[selection], volMA: null }
    : null;

  return (
    <div className="space-y-4 relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <MousePointer2 className="w-4 h-4 text-finance-accent" />
            <span className="hidden sm:inline">縮放: 滾輪/捏合 | 移動: 拖曳 | 選取: 點擊</span>
          </div>
          <div className="flex gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${mappedPoints.length > 0 ? 'bg-slate-800 border-finance-accent text-white' : 'bg-finance-accent text-white border-transparent'}`}>
              {mappedPoints.length > 0 ? '✓ P0' : '1. P0'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${mappedPoints.length > 1 ? 'bg-slate-800 border-finance-accent text-white' : 'border-slate-700 text-slate-600'}`}>
              {mappedPoints.length > 1 ? '✓ P1' : '2. P1'}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${mappedPoints.length > 2 ? 'bg-slate-800 border-finance-accent text-white' : 'border-slate-700 text-slate-600'}`}>
              {mappedPoints.length > 2 ? '✓ P2' : '3. P2'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          {/* Granville Settings */}
          <div className="relative">
            <button
              onClick={() => setShowGranvilleSettings(!showGranvilleSettings)}
              className={`flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors border ${granvilleEnabled ? 'border-yellow-500 text-yellow-500' : 'border-slate-700 text-slate-400'}`}
              title="葛蘭碧八大法則"
            >
              <Activity className={`w-3 h-3 ${granvilleEnabled ? 'stroke-yellow-500' : ''}`} />
              <span className="hidden sm:inline">G-8 法則</span>
            </button>

            {showGranvilleSettings && (
              <div className="absolute top-8 right-0 z-30 w-56 bg-slate-800 border border-slate-600 shadow-xl rounded-lg p-3 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">葛蘭碧法則設定</span>
                  <button onClick={() => setShowGranvilleSettings(false)}><X className="w-3 h-3 text-slate-400" /></button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">啟用分析</span>
                  <div
                    onClick={() => setGranvilleEnabled(!granvilleEnabled)}
                    className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${granvilleEnabled ? 'bg-yellow-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${granvilleEnabled ? 'left-4.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mb-1">均線週期 (MA):</div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    value={inputMaLength}
                    onChange={(e) => setInputMaLength(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                    min="5" max="240"
                  />
                  <span className="text-xs text-slate-500">日</span>
                </div>
                <button
                  onClick={applyGranvilleSettings}
                  className="w-full mt-2 bg-finance-accent hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  更新繪圖
                </button>
                <p className="text-[9px] text-slate-500 leading-tight mt-2">
                  紅B = 突破/超賣<br />
                  綠S = 跌破/超買
                </p>
              </div>
            )}
          </div>

          {/* Volume Alert Settings */}
          <div className="relative">
            <button
              onClick={() => setShowVolSettings(!showVolSettings)}
              className={`flex items-center gap-1 text-xs px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors border ${volAlertEnabled ? 'border-amber-500 text-amber-500' : 'border-slate-700 text-slate-400'}`}
              title="成交量異常提醒"
            >
              <Zap className={`w-3 h-3 ${volAlertEnabled ? 'fill-amber-500' : ''}`} />
              <span className="hidden sm:inline">量能高亮</span>
            </button>

            {showVolSettings && (
              <div className="absolute top-8 right-0 z-30 w-56 bg-slate-800 border border-slate-600 shadow-xl rounded-lg p-3 animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-white">量能異常設定</span>
                  <button onClick={() => setShowVolSettings(false)}><X className="w-3 h-3 text-slate-400" /></button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">啟用提醒</span>
                  <div
                    onClick={() => setVolAlertEnabled(!volAlertEnabled)}
                    className={`w-8 h-4 rounded-full cursor-pointer relative transition-colors ${volAlertEnabled ? 'bg-amber-500' : 'bg-slate-600'}`}
                  >
                    <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${volAlertEnabled ? 'left-4.5' : 'left-0.5'}`}></div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 mb-1">大於 N 日均量:</div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="number"
                    value={inputVolMALength}
                    onChange={(e) => setInputVolMALength(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
                    min="2" max="60"
                  />
                  <span className="text-xs text-slate-500">日</span>
                </div>
                <button
                  onClick={applyVolSettings}
                  className="w-full mt-2 bg-finance-accent hover:bg-blue-600 text-white text-xs py-1.5 rounded transition-colors flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  更新參數
                </button>
                <p className="text-[9px] text-slate-500 mt-2">
                  高亮顯示條件：<br />
                  成交量 &gt;= 前 N 日平均量
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleResetView}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors border border-slate-700"
            title="重置視圖 (近3個月)"
          >
            <History className="w-3 h-3" /> <span className="hidden sm:inline">近3月</span>
          </button>

          {mappedPoints.length >= 2 && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
              <Settings2 className="w-3 h-3 text-slate-500 ml-1" />
              {[0.382, 0.5, 0.618].map((r) => (
                <button
                  key={r}
                  onClick={() => setFibRatio(r as any)}
                  className={`text-[10px] px-2 py-0.5 rounded ${fibRatio === r ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {mappedPoints.length > 0 && (
              <button
                onClick={handleUndo}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
                title="上一步"
              >
                <Undo2 className="w-3 h-3" />
              </button>
            )}
            {mappedPoints.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 bg-slate-800 rounded hover:bg-slate-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`relative w-full h-[500px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden select-none shadow-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
        onWheel={handleWheel}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {isLoadingMore && (
          <div className="absolute left-4 top-4 z-10 flex items-center gap-2 bg-slate-800 text-white text-xs px-3 py-1 rounded shadow-lg animate-pulse border border-slate-700">
            <Loader2 className="w-3 h-3 animate-spin" /> 讀取歷史資料...
          </div>
        )}

        {/* Selection Overlay */}
        {selectionData && (
          <div className="absolute top-16 left-4 z-20 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-600 shadow-2xl rounded-xl p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-3 border-b border-slate-700 pb-2">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider">選取日期</div>
                <div className="text-sm font-bold text-white font-mono">{selectionData.date}</div>
              </div>
              <button onClick={() => setSelection(null)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-xs mb-4 font-mono">
              <div className="flex justify-between"><span className="text-slate-500">開盤</span> <span className="text-slate-300">{selectionData.open.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">最高</span> <span className="text-finance-up">{selectionData.high.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">最低</span> <span className="text-finance-down">{selectionData.low.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">收盤</span> <span className="text-slate-300">{selectionData.close.toFixed(1)}</span></div>
              <div className="col-span-2 border-t border-slate-700 my-1"></div>
              <div className="flex justify-between"><span className="text-slate-500">成交量</span> <span className="text-slate-300">{Math.round(selectionData.volume).toLocaleString()}</span></div>
              {volAlertEnabled && selectionData.volMA !== null && selectionData.volMA !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500">均量({volMALength})</span>
                  <span className="text-amber-500">{Math.round(selectionData.volMA).toLocaleString()}</span>
                </div>
              )}
            </div>

            {getNextPointType() ? (
              <button
                onClick={confirmSetPoint}
                className="w-full bg-finance-accent hover:bg-blue-600 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                {getNextPointType()!.fullLabel}
              </button>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center py-2 rounded-lg">
                設定完成
              </div>
            )}
          </div>
        )}

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 1000 500"
          preserveAspectRatio="none"
          onClick={handleSvgClick}
        >
          {/* Horizontal Grid */}
          {yAxisTicks.map((tick, i) => (
            <line key={`grid-${i}`} x1="0" y1={yScale(tick)} x2="1000" y2={yScale(tick)} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
          ))}

          {/* Fibonacci Time Zones */}
          {fibTimeLines.map((line, i) => (
            <g key={`fib-time-${i}`}>
              <line
                x1={line.x + candleWidth / 2}
                y1="0"
                x2={line.x + candleWidth / 2}
                y2="500"
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <text
                x={line.x + candleWidth / 2 + 2}
                y="12"
                className="fill-yellow-500 font-mono text-[9px] select-none"
                style={{ fontSize: '9px' }}
              >
                T+{line.num}
              </text>
            </g>
          ))}

          {/* Volume */}
          {visibleCandlesRender.map((c) => (
            <rect
              key={`vol-${c.date}`}
              x={c.x}
              y={500 - c.volHeight}
              width={Math.max(1, candleWidth - 1)}
              height={c.volHeight}
              fill={volAlertEnabled && c.isVolAnomaly ? '#fbbf24' : c.color}
              fillOpacity={volAlertEnabled && c.isVolAnomaly ? 1 : 0.8}
            />
          ))}

          {/* Volume MA Line */}
          {volAlertEnabled && volMaPoints.length > 0 && (
            <polyline
              points={volMaPoints}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.7"
            />
          )}

          {/* MA Line for Granville */}
          {granvilleEnabled && maPoints.length > 0 && (
            <polyline
              points={maPoints}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeOpacity="0.8"
            />
          )}

          {/* Candles */}
          {visibleCandlesRender.map((c) => (
            <g key={`candle-${c.date}`}>
              <line x1={c.x + candleWidth / 2} y1={c.yHigh} x2={c.x + candleWidth / 2} y2={c.yLow} stroke={c.color} strokeWidth="1" />
              <rect
                x={c.x}
                y={Math.min(c.yOpen, c.yClose)}
                width={Math.max(1, candleWidth)}
                height={Math.max(1, Math.abs(c.yClose - c.yOpen))}
                fill={c.color}
              />
            </g>
          ))}

          {/* Granville Signals Markers */}
          {granvilleEnabled && visibleCandlesRender.map((c) => {
            if (!c.granvilleSignal) return null;
            const isBuy = c.granvilleSignal.type === 'B';
            const yPos = isBuy ? c.yLow + 15 : c.yHigh - 15;
            const bgColor = isBuy ? '#ef4444' : '#10b981'; // TW Colors: Buy=Red, Sell=Green

            return (
              <g key={`g-signal-${c.date}`}>
                <circle cx={c.x + candleWidth / 2} cy={yPos} r="5" fill={bgColor} />
                <text
                  x={c.x + candleWidth / 2}
                  y={yPos + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8px"
                  fontWeight="bold"
                >
                  {c.granvilleSignal.type}
                </text>
              </g>
            );
          })}

          {/* Selection Crosshair */}
          {selectionData && (
            <g>
              <line
                x1={xScale(selectionData.index) + candleWidth / 2}
                y1="0"
                x2={xScale(selectionData.index) + candleWidth / 2}
                y2="500"
                stroke="white"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <line
                x1="0"
                y1={yScale(selectionData.close)}
                x2="1000"
                y2={yScale(selectionData.close)}
                stroke="white"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.3"
              />
              <rect
                x={xScale(selectionData.index) - 2}
                y={0}
                width={candleWidth + 4}
                height={500}
                fill="white"
                fillOpacity="0.05"
              />
            </g>
          )}

          {/* Visible High Marker */}
          {viewHighPoint && (
            <g>
              <text
                x={viewHighPoint.x}
                y={viewHighPoint.y - 12}
                textAnchor="middle"
                className="font-mono text-xs font-bold fill-finance-text"
                style={{ fontSize: '10px' }}
              >
                {viewHighPoint.price.toFixed(2)}
              </text>
              <line
                x1={viewHighPoint.x}
                y1={viewHighPoint.y - 8}
                x2={viewHighPoint.x}
                y2={viewHighPoint.y - 2}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Visible Low Marker */}
          {viewLowPoint && (
            <g>
              <text
                x={viewLowPoint.x}
                y={viewLowPoint.y + 20}
                textAnchor="middle"
                className="font-mono text-xs font-bold fill-finance-text"
                style={{ fontSize: '10px' }}
              >
                {viewLowPoint.price.toFixed(2)}
              </text>
              <line
                x1={viewLowPoint.x}
                y1={viewLowPoint.y + 2}
                x2={viewLowPoint.x}
                y2={viewLowPoint.y + 8}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </g>
          )}

          {/* Wave Lines & Labels */}
          {mappedPoints.map((p, i) => {
            if (i === 0) return null;
            const prev = mappedPoints[i - 1];
            const x1 = xScale(prev.index) + candleWidth / 2;
            const y1 = yScale(prev.price);
            const x2 = xScale(p.index) + candleWidth / 2;
            const y2 = yScale(p.price);

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;

            return (
              <g key={`wave-group-${i}`}>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#3b82f6" strokeWidth="2"
                />
                {/* Wave 1 Label */}
                {i === 1 && waveStats.w1Change !== null && (
                  <g>
                    <rect x={midX - 25} y={midY - 9} width="50" height="18" rx="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="0.5" fillOpacity="0.9" />
                    <text x={midX} y={midY + 3} textAnchor="middle" className="fill-white font-bold text-[10px]" style={{ fontSize: '10px' }}>
                      {waveStats.w1Change > 0 ? '+' : ''}{waveStats.w1Change.toFixed(1)}%
                    </text>
                  </g>
                )}
                {/* Wave 2 Label */}
                {i === 2 && waveStats.w2Retrace !== null && (
                  <g>
                    <rect x={midX - 30} y={midY - 9} width="60" height="18" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="0.5" fillOpacity="0.9" />
                    <text x={midX} y={midY + 3} textAnchor="middle" className="fill-white font-bold text-[10px]" style={{ fontSize: '10px' }}>
                      回調 {waveStats.w2Retrace.toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Points Markers */}
          {mappedPoints.map((p, i) => (
            <g key={`pt-${i}`}>
              <circle cx={xScale(p.index) + candleWidth / 2} cy={yScale(p.price)} r="4" fill="#0f172a" stroke="#3b82f6" strokeWidth="2" />
              <text x={xScale(p.index)} y={yScale(p.price) - 10} textAnchor="middle" fill="white" className="text-xs font-bold" style={{ fontSize: '12px' }}>
                {p.type.toUpperCase()}
              </text>
            </g>
          ))}

          {/* Projections */}
          {projections && (
            <g>
              {projections.lines.map((line, i) => (
                <line key={`proj-line-${i}`} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#10b981" strokeWidth="2" strokeDasharray="5 5" />
              ))}
              {[projections.p3, projections.p4, projections.p5].map((p, i) => (
                <g key={`proj-pt-${i}`}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                  <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-emerald-400 font-bold" style={{ fontSize: '12px' }}>P{3 + i}</text>
                  <text x={p.x} y={p.y + 15} textAnchor="middle" className="fill-emerald-600" style={{ fontSize: '10px' }}>{p.price.toFixed(1)}</text>
                </g>
              ))}
            </g>
          )}

          {/* Right Axis Labels */}
          <rect x={1000 - RIGHT_AXIS_WIDTH} y="0" width={RIGHT_AXIS_WIDTH} height="500" fill="#0f172a" fillOpacity="0.8" />
          <line x1={1000 - RIGHT_AXIS_WIDTH} y1="0" x2={1000 - RIGHT_AXIS_WIDTH} y2="500" stroke="#334155" strokeWidth="1" />
          {yAxisTicks.map((tick, i) => (
            <text
              key={`tick-${i}`}
              x={995}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="fill-slate-400 font-mono"
              style={{ fontSize: '10px' }}
            >
              {tick.toFixed(1)}
            </text>
          ))}

          {/* Info */}
          <text x="10" y="20" className="fill-slate-500" style={{ fontSize: '10px' }}>{symbol} (Zoom: {Math.round(zoom)})</text>

          {granvilleEnabled && (
            <text x="10" y="35" className="fill-yellow-500" style={{ fontSize: '10px' }}>
              MA{maLength}: {visibleData[visibleData.length - 1]?.maValue?.toFixed(2) || 'N/A'} (Granville Enabled)
            </text>
          )}

        </svg>
      </div>
    </div>
  );
};

export const SmartChart = React.memo(SmartChartComponent);