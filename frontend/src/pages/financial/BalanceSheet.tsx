import React from 'react';
import { Scale } from 'lucide-react';

export default function BalanceSheetPage() {
  const assets = {
    current: { cash: 250000, debtors: 180000, inventory: 95000 },
    fixed: { property: 800000, equipment: 150000, vehicles: 200000 }
  };

  const liabilities = {
    current: { creditors: 120000, shortTerm: 50000 },
    longTerm: { loans: 400000, mortgage: 500000 }
  };

  const totalAssets = Object.values(assets.current).reduce((a, b) => a + b, 0) + Object.values(assets.fixed).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(liabilities.current).reduce((a, b) => a + b, 0) + Object.values(liabilities.longTerm).reduce((a, b) => a + b, 0);
  const equity = totalAssets - totalLiabilities;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6 max-w-5xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Scale className="h-8 w-8" />
        Balance Sheet
      </h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6" data-testid="section-assets">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Assets</h3>
          <div className="space-y-4">
            <div data-testid="current-assets">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Assets</h4>
              {Object.entries(assets.current).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="capitalize text-sm">{key}</span>
                  <span className="text-sm">R {value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div data-testid="fixed-assets">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Fixed Assets</h4>
              {Object.entries(assets.fixed).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="capitalize text-sm">{key}</span>
                  <span className="text-sm">R {value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t font-bold flex justify-between" data-testid="total-assets">
              <span>Total Assets</span>
              <span className="text-blue-600 dark:text-blue-400">R {totalAssets.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
          <div className="space-y-4">
            <div data-testid="section-liabilities">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Current Liabilities</h4>
              {Object.entries(liabilities.current).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="capitalize text-sm">{key}</span>
                  <span className="text-sm">R {value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Long-term Liabilities</h4>
              {Object.entries(liabilities.longTerm).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1">
                  <span className="capitalize text-sm">{key}</span>
                  <span className="text-sm">R {value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t">
              <div className="flex justify-between py-1 font-medium" data-testid="total-liabilities">
                <span>Total Liabilities</span>
                <span>R {totalLiabilities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 font-bold text-lg" data-testid="section-equity">
                <span>Equity</span>
                <span className="text-green-600 dark:text-green-400" data-testid="total-equity">R {equity.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
