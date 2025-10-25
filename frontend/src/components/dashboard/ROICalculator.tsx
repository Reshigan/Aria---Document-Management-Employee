import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '../../utils/api';

const ROICalculator: React.FC = () => {
  const [roiData, setRoiData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCalculator, setShowCalculator] = useState(false);

  // Custom inputs for calculation
  const [inputs, setInputs] = useState({
    documents_per_month: 1000,
    tickets_per_month: 5000,
    orders_per_month: 500,
    manual_doc_time_min: 10,
    manual_ticket_time_min: 15,
    manual_order_time_min: 20,
    hourly_rate: 25
  });

  useEffect(() => {
    fetchROI();
  }, []);

  const fetchROI = async () => {
    try {
      const response = await apiClient.get('/api/v1/reporting/roi/calculate');
      setRoiData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching ROI:', error);
      // Use mock data
      setRoiData({
        roi_percentage: 1942,
        net_benefit: 47551,
        payback_period_days: 1.5,
        total_cost: 2449,
        total_savings: 50000
      });
      setLoading(false);
    }
  };

  const calculateCustomROI = () => {
    const { documents_per_month, tickets_per_month, orders_per_month, manual_doc_time_min, manual_ticket_time_min, manual_order_time_min, hourly_rate } = inputs;

    // Calculate manual costs
    const doc_hours = (documents_per_month * manual_doc_time_min) / 60;
    const ticket_hours = (tickets_per_month * manual_ticket_time_min) / 60;
    const order_hours = (orders_per_month * manual_order_time_min) / 60;
    const total_manual_cost = (doc_hours + ticket_hours + order_hours) * hourly_rate;

    // Calculate Aria costs (from pricing model)
    const doc_cost = documents_per_month * 0.10;
    const ticket_cost = tickets_per_month * 0.02;
    const order_cost = orders_per_month * 0.50;
    const subscription_cost = 1999; // Growth plan
    const total_aria_cost = subscription_cost + doc_cost + ticket_cost + order_cost;

    // Calculate ROI
    const net_benefit = total_manual_cost - total_aria_cost;
    const roi_percentage = (net_benefit / total_aria_cost) * 100;
    const payback_days = (total_aria_cost / (net_benefit / 30));

    return {
      total_manual_cost: total_manual_cost.toFixed(0),
      total_aria_cost: total_aria_cost.toFixed(0),
      net_benefit: net_benefit.toFixed(0),
      roi_percentage: roi_percentage.toFixed(0),
      payback_days: payback_days.toFixed(1)
    };
  };

  const customROI = showCalculator ? calculateCustomROI() : null;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6"
      >
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded mb-4"></div>
          <div className="h-12 bg-white/20 rounded mb-2"></div>
          <div className="h-8 bg-white/20 rounded"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">💰 ROI Calculator</h3>
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className="text-sm text-green-400 hover:text-green-300 transition"
        >
          {showCalculator ? 'Hide' : 'Customize'}
        </button>
      </div>

      {!showCalculator ? (
        <>
          {/* Current ROI Display */}
          <div className="text-center mb-6">
            <p className="text-gray-300 text-sm mb-2">Your Current ROI</p>
            <p className="text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              {roiData?.roi_percentage || 1942}%
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300 text-sm">Monthly Savings</span>
              <span className="text-green-400 font-bold">
                ${(roiData?.net_benefit || 47551).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300 text-sm">Payback Period</span>
              <span className="text-green-400 font-bold">
                {roiData?.payback_period_days || 1.5} days
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
              <span className="text-gray-300 text-sm">Annual Benefit</span>
              <span className="text-green-400 font-bold">
                ${((roiData?.net_benefit || 47551) * 12).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border border-green-500/30">
            <p className="text-green-300 text-sm text-center">
              ✨ You're saving <span className="font-bold">{((roiData?.net_benefit / (roiData?.total_cost || 2449)) * 100).toFixed(0)}x</span> your investment every month!
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Custom Calculator */}
          <div className="space-y-4 mb-4">
            <div>
              <label className="text-gray-300 text-xs block mb-1">Documents/month</label>
              <input
                type="number"
                value={inputs.documents_per_month}
                onChange={(e) => setInputs({...inputs, documents_per_month: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs block mb-1">Support tickets/month</label>
              <input
                type="number"
                value={inputs.tickets_per_month}
                onChange={(e) => setInputs({...inputs, tickets_per_month: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs block mb-1">Orders/month</label>
              <input
                type="number"
                value={inputs.orders_per_month}
                onChange={(e) => setInputs({...inputs, orders_per_month: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="text-gray-300 text-xs block mb-1">Hourly labor rate ($)</label>
              <input
                type="number"
                value={inputs.hourly_rate}
                onChange={(e) => setInputs({...inputs, hourly_rate: parseInt(e.target.value)})}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {customROI && (
            <div className="bg-white/10 rounded-lg p-4 space-y-2">
              <div className="text-center mb-3">
                <p className="text-5xl font-bold text-green-400">{customROI.roi_percentage}%</p>
                <p className="text-gray-300 text-sm">ROI</p>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Manual Cost:</span>
                <span className="text-white font-bold">${parseInt(customROI.total_manual_cost).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Aria Cost:</span>
                <span className="text-white font-bold">${parseInt(customROI.total_aria_cost).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm border-t border-white/20 pt-2">
                <span className="text-green-300 font-bold">Savings:</span>
                <span className="text-green-400 font-bold">${parseInt(customROI.net_benefit).toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Payback:</span>
                <span className="text-white font-bold">{customROI.payback_days} days</span>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default ROICalculator;
