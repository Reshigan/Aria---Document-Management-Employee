import React from 'react';
import { Activity } from 'lucide-react';

export default function CashFlowStatementPage() {
  const data = {
    operating: { receipts: 450000, payments: -320000, net: 130000 },
    investing: { assetPurchase: -50000, assetSale: 20000, net: -30000 },
    financing: { loanReceipts: 100000, loanRepayments: -45000, dividends: -20000, net: 35000 }
  };

  const netChange = data.operating.net + data.investing.net + data.financing.net;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Activity className="h-8 w-8" />
        Cash Flow Statement
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Operating Activities</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Cash receipts from customers</span>
              <span className="text-green-600 dark:text-green-400">R {data.operating.receipts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash paid to suppliers and employees</span>
              <span className="text-red-600 dark:text-red-400">R {data.operating.payments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold">
              <span>Net Operating Cash Flow</span>
              <span className="text-green-600 dark:text-green-400">R {data.operating.net.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Investing Activities</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Purchase of fixed assets</span>
              <span className="text-red-600 dark:text-red-400">R {data.investing.assetPurchase.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Proceeds from asset sales</span>
              <span className="text-green-600 dark:text-green-400">R {data.investing.assetSale.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold">
              <span>Net Investing Cash Flow</span>
              <span className="text-red-600 dark:text-red-400">R {data.investing.net.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Financing Activities</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Loan receipts</span>
              <span className="text-green-600 dark:text-green-400">R {data.financing.loanReceipts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Loan repayments</span>
              <span className="text-red-600 dark:text-red-400">R {data.financing.loanRepayments.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Dividends paid</span>
              <span className="text-red-600 dark:text-red-400">R {data.financing.dividends.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t font-bold">
              <span>Net Financing Cash Flow</span>
              <span className="text-green-600 dark:text-green-400">R {data.financing.net.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2">
          <div className="flex justify-between text-xl font-bold">
            <span>Net Increase in Cash</span>
            <span className="text-green-600 dark:text-green-400">R {netChange.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
