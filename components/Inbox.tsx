import React from 'react';

const Inbox: React.FC = () => {
  return (
    <div className="view-section active flex-1 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-zinc-100 mb-6">نامەدان</h1>
        <div className="space-y-2">
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0 hidden sm:block"></div>
            <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                  <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 sm:hidden"></div>
                  <h4 className="text-sm text-zinc-200 font-medium">سەرنجی هاوکار</h4>
              </div>
              <p className="text-xs text-zinc-400 mt-1">جۆن د. سەرنجی دا لەسەر دیمەنی ٠٠٢: "ئەم دیالۆگەم بەدڵە."</p>
              <div className="text-xxs text-zinc-600 mt-2">١٠ خولەک لەمەوبەر</div>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-lg flex flex-col sm:flex-row gap-4">
            <div className="w-2 h-2 bg-zinc-700 rounded-full mt-2 flex-shrink-0 hidden sm:block"></div>
             <div>
              <div className="flex items-center gap-2 mb-1 sm:mb-0">
                  <div className="w-2 h-2 bg-zinc-700 rounded-full flex-shrink-0 sm:hidden"></div>
                  <h4 className="text-sm text-zinc-200 font-medium">ڕاپۆرتی هەفتانە</h4>
              </div>
              <p className="text-xs text-zinc-400 mt-1">تۆ ٤،٠٠٠ وشەت نووسیوە لەم هەفتەیەدا. بەردەوام بە!</p>
              <div className="text-xxs text-zinc-600 mt-2">٢ ڕۆژ لەمەوبەر</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;