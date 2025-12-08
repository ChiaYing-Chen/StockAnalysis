import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, BookOpen, Activity, Clock, TrendingUp } from 'lucide-react';

interface TheoryGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccordionItem: React.FC<{
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, icon, isOpen, onClick, children }) => {
  return (
    <div className="border border-slate-700 rounded-lg bg-finance-card overflow-hidden mb-3">
      <button
        onClick={onClick}
        className={`w-full flex items-center justify-between p-4 transition-colors ${
          isOpen ? 'bg-slate-800' : 'hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOpen ? 'bg-finance-accent text-white' : 'bg-slate-700 text-slate-400'}`}>
            {icon}
          </div>
          <span className={`font-bold ${isOpen ? 'text-white' : 'text-slate-300'}`}>{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      
      {isOpen && (
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 text-sm text-slate-300 leading-relaxed animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export const TheoryGuide: React.FC<TheoryGuideProps> = ({ isOpen, onClose }) => {
  const [openSection, setOpenSection] = useState<string | null>('elliott');

  if (!isOpen) return null;

  const toggle = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-finance-bg border border-slate-700 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 bg-finance-card rounded-t-2xl">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-finance-accent" />
            <h2 className="text-lg font-bold text-white">技術分析理論指南</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          
          {/* 1. Elliott Wave */}
          <AccordionItem
            title="波浪理論 (Elliott Wave)"
            icon={<TrendingUp className="w-5 h-5" />}
            isOpen={openSection === 'elliott'}
            onClick={() => toggle('elliott')}
          >
            <div className="space-y-4">
              <div className="p-3 bg-slate-800 rounded border border-slate-600">
                <h4 className="font-bold text-finance-accent mb-2">基本結構</h4>
                <p>一個完整的週期包含 8 個波段：<span className="text-white">5 波推動 (1-2-3-4-5)</span> + <span className="text-white">3 波修正 (A-B-C)</span>。</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">三大鐵律 (Rules)</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><span className="text-finance-down font-bold">浪 2 不破底</span>：第 2 波的回調幅度不能超過第 1 波的起點 (100%)。</li>
                  <li><span className="text-finance-up font-bold">浪 3 不最短</span>：在 1、3、5 三個推動波中，第 3 波通常是最長，且絕不是最短的。</li>
                  <li><span className="text-finance-warn font-bold">浪 4 不重疊</span>：第 4 波的低點不能低於第 1 波的高點 (除非是傾斜三角形)。</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">常用黃金比率 (Fibonacci Ratios)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800 p-2 rounded">
                    <span className="block text-finance-muted mb-1">第 2 波回調</span>
                    <span className="text-white font-mono">0.5, 0.618</span> (深幅修正)
                  </div>
                  <div className="bg-slate-800 p-2 rounded">
                    <span className="block text-finance-muted mb-1">第 3 波目標</span>
                    <span className="text-white font-mono">1.618, 2.618</span> (W1 的倍數)
                  </div>
                  <div className="bg-slate-800 p-2 rounded">
                    <span className="block text-finance-muted mb-1">第 4 波回調</span>
                    <span className="text-white font-mono">0.382, 0.5</span> (強勢整理)
                  </div>
                  <div className="bg-slate-800 p-2 rounded">
                    <span className="block text-finance-muted mb-1">第 5 波目標</span>
                    <span className="text-white font-mono">W1 等長</span> 或 0.618 倍
                  </div>
                </div>
              </div>
            </div>
          </AccordionItem>

          {/* 2. Fibonacci Time */}
          <AccordionItem
            title="費波南西時間轉折 (Time Zones)"
            icon={<Clock className="w-5 h-5" />}
            isOpen={openSection === 'fibTime'}
            onClick={() => toggle('fibTime')}
          >
             <div className="space-y-4">
               <p>費波南西數列不僅用於價格目標，也常用於預測趨勢發生轉折的<span className="text-finance-accent">時間點</span>。</p>
               
               <div className="p-3 bg-slate-800 rounded border border-slate-600">
                <h4 className="font-bold text-finance-accent mb-2">費氏數列</h4>
                <p className="font-mono text-lg text-white tracking-wider">
                  1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144...
                </p>
                <p className="mt-2 text-xs text-slate-400">每一項數字皆為前兩項數字之和。</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-2">實戰應用</h4>
                <ul className="list-disc list-inside space-y-2 text-slate-400">
                  <li>
                    <span className="text-white">變盤日：</span>從一個顯著的高點或低點 (T=0) 開始計算，第 5, 8, 13, 21... 根 K 線的位置，極高機率發生趨勢反轉或加速。
                  </li>
                  <li>
                    <span className="text-white">週期共振：</span>若不同起點推算的時間窗重疊，變盤力道更強。
                  </li>
                </ul>
              </div>
             </div>
          </AccordionItem>

          {/* 3. Granville's Rules */}
          <AccordionItem
            title="葛蘭碧八大法則 (Granville Rules)"
            icon={<Activity className="w-5 h-5" />}
            isOpen={openSection === 'granville'}
            onClick={() => toggle('granville')}
          >
            <div className="space-y-4">
              <p>利用股價與移動平均線 (MA) 的乖離與交叉關係，判斷買賣訊號。</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {/* Buying */}
                 <div className="border-l-4 border-finance-up pl-3 py-1">
                    <h4 className="font-bold text-finance-up mb-2">四大買點 (Buy)</h4>
                    <ol className="space-y-2 text-xs text-slate-300">
                       <li><strong className="text-white">① 突破：</strong>MA 走平或翻揚，股價由下往上突破 MA。</li>
                       <li><strong className="text-white">② 假跌破：</strong>股價跌破 MA 但 MA 持續上揚，隨後股價很快站回。</li>
                       <li><strong className="text-white">③ 支撐：</strong>股價回測 MA 不破並向上彈升 (多頭支撐)。</li>
                       <li><strong className="text-white">④ 乖離過大：</strong>股價急跌遠離 MA (負乖離過大)，易有反彈。</li>
                    </ol>
                 </div>

                 {/* Selling */}
                 <div className="border-l-4 border-finance-down pl-3 py-1">
                    <h4 className="font-bold text-finance-down mb-2">四大賣點 (Sell)</h4>
                    <ol className="space-y-2 text-xs text-slate-300">
                       <li><strong className="text-white">⑤ 跌破：</strong>MA 走平或下彎，股價由上往下跌破 MA。</li>
                       <li><strong className="text-white">⑥ 假突破：</strong>股價突破 MA 但 MA 持續下彎，隨後股價很快跌回。</li>
                       <li><strong className="text-white">⑦ 壓力：</strong>股價反彈至 MA 附近不過並下跌 (空頭壓力)。</li>
                       <li><strong className="text-white">⑧ 乖離過大：</strong>股價急漲遠離 MA (正乖離過大)，易有拉回。</li>
                    </ol>
                 </div>
              </div>

              <div className="p-3 bg-slate-800 rounded border border-slate-600">
                <h4 className="font-bold text-finance-accent mb-2">常用 MA 參數建議</h4>
                <div className="flex gap-4 text-sm">
                   <div>
                     <span className="block text-finance-muted text-xs">短線 (月線)</span>
                     <span className="text-white font-mono">20 MA</span>
                   </div>
                   <div>
                     <span className="block text-finance-muted text-xs">中線 (季線)</span>
                     <span className="text-white font-mono">60 MA</span> <span className="text-xs text-finance-warn">(葛蘭碧經典)</span>
                   </div>
                   <div>
                     <span className="block text-finance-muted text-xs">長線 (年線)</span>
                     <span className="text-white font-mono">200 MA</span>
                   </div>
                </div>
              </div>

            </div>
          </AccordionItem>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-finance-card rounded-b-2xl text-center">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-bold"
            >
                關閉說明
            </button>
        </div>

      </div>
    </div>
  );
};
