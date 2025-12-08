import React, { useState } from 'react';
import { TrendingUp, Calculator, LineChart, BookOpen } from 'lucide-react';
import { CalculatorView } from './components/Calculator';
import { StockAnalyzer } from './components/StockAnalyzer';
import { TheoryGuide } from './components/TheoryGuide';

function App() {
  const [view, setView] = useState<'chart' | 'calculator'>('chart');
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="min-h-screen bg-finance-bg text-finance-text font-sans selection:bg-finance-accent selection:text-white pb-12">
      {/* Header */}
      <header className="bg-finance-bg border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-finance-accent to-purple-600 rounded-lg shadow-lg shadow-blue-900/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight hidden sm:block">
              <span className="text-finance-accent">Elliott</span> Wave Pro
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Nav Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
               <button 
                 onClick={() => setView('chart')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                   view === 'chart' ? 'bg-finance-card text-white shadow-sm border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                 }`}
               >
                 <LineChart className="w-4 h-4" />
                 實戰 K 線
               </button>
               <button 
                 onClick={() => setView('calculator')}
                 className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                   view === 'calculator' ? 'bg-finance-card text-white shadow-sm border border-slate-700' : 'text-slate-400 hover:text-slate-200'
                 }`}
               >
                 <Calculator className="w-4 h-4" />
                 計算機
               </button>
            </div>

            {/* Help Button */}
            <button
               onClick={() => setShowGuide(true)}
               className="p-2 text-slate-400 hover:text-finance-accent hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
               title="理論說明"
            >
               <BookOpen className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {view === 'calculator' ? <CalculatorView /> : <StockAnalyzer />}
      </main>

      {/* Guide Modal */}
      <TheoryGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}

export default App;
