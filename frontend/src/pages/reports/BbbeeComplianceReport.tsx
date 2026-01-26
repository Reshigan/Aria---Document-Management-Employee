import React from 'react';
import { Award, TrendingUp } from 'lucide-react';

export default function BbbeeComplianceReportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 flex items-center gap-3">
        <Award className="h-8 w-8" />
        BBBEE Compliance Report
      </h1>
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Level</div>
          <div className="text-4xl font-bold text-green-600 dark:text-green-400 mt-2">Level 4</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Score</div>
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-2">85.2</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Procurement Recognition</div>
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">100%</div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4">Scorecard Elements</h3>
        {['Ownership', 'Management Control', 'Skills Development', 'Enterprise Development', 'Socio-Economic Development'].map((element) => (
          <div key={element} className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{element}</span>
              <span>85%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
