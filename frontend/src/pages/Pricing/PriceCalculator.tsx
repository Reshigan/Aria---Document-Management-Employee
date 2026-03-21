import { useState, useEffect } from 'react';
import { Calculator, Search, DollarSign, Info, TrendingDown, Package } from 'lucide-react';
import api from '../../lib/api';

interface PriceResult {
  product_id: string;
  product_name: string;
  base_price: number;
  final_price: number;
  discount_amount: number;
  discount_percentage: number;
  applied_rules: AppliedRule[];
  pricelist_name: string;
}

interface AppliedRule {
  rule_id: string;
  rule_name: string;
  rule_type: string;
  discount_value: number;
  sequence: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  list_price: number;
}

interface Pricelist {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
  customer_group_id?: string;
}

export default function PriceCalculator() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PriceResult | null>(null);
  const [bulkResults, setBulkResults] = useState<PriceResult[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [formData, setFormData] = useState({
    product_id: '',
    pricelist_id: '',
    customer_id: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0]
  });
  const [bulkProductIds, setBulkProductIds] = useState<string[]>([]);

  useEffect(() => {
    loadProducts();
    loadPricelists();
    loadCustomers();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/odoo/products/variants');
      const data = response.data.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadPricelists = async () => {
    try {
      const response = await api.get('/odoo/pricing/pricelists');
      const data = response.data.data || response.data || [];
      setPricelists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading pricelists:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get('/erp/master-data/customers');
      const data = response.data.customers || response.data.data || response.data || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const calculatePrice = async () => {
    if (!formData.product_id) {
      alert('Please select a product');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/odoo/pricing/calculate', {
        product_id: formData.product_id,
        pricelist_id: formData.pricelist_id || null,
        customer_id: formData.customer_id || null,
        quantity: formData.quantity,
        date: formData.date
      });
      setResult(response.data.data || response.data);
    } catch (error) {
      console.error('Error calculating price:', error);
      alert('Error calculating price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateBulkPrices = async () => {
    if (bulkProductIds.length === 0) {
      alert('Please select at least one product');
      return;
    }
    try {
      setLoading(true);
      const response = await api.post('/odoo/pricing/calculate-bulk', {
        product_ids: bulkProductIds,
        pricelist_id: formData.pricelist_id || null,
        customer_id: formData.customer_id || null,
        quantity: formData.quantity,
        date: formData.date
      });
      setBulkResults(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error calculating bulk prices:', error);
      alert('Error calculating prices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleBulkProduct = (productId: string) => {
    if (bulkProductIds.includes(productId)) {
      setBulkProductIds(bulkProductIds.filter(id => id !== productId));
    } else {
      setBulkProductIds([...bulkProductIds, productId]);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
          <Calculator size={28} className="text-green-500" />
          Price Calculator
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Calculate prices with pricelist rules and see price breakdown</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-lg ${
            mode === 'single' 
              ? 'bg-green-600 text-white' 
              : 'bg-white border text-gray-700 hover:bg-gray-50'
          }`}
        >
          Single Product
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`px-4 py-2 rounded-lg ${
            mode === 'bulk' 
              ? 'bg-green-600 text-white' 
              : 'bg-white border text-gray-700 hover:bg-gray-50'
          }`}
        >
          Bulk Calculate
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold mb-4">Calculation Parameters</h2>
          <div className="space-y-4">
            {mode === 'single' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pricelist</label>
              <select
                value={formData.pricelist_id}
                onChange={(e) => setFormData({ ...formData, pricelist_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Default Pricelist</option>
                {pricelists.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
              <select
                value={formData.customer_id}
                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">No Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={mode === 'single' ? calculatePrice : calculateBulkPrices}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Calculating...' : 'Calculate Price'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-2">
          {mode === 'single' ? (
            result ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <h2 className="text-lg font-semibold mb-4">Price Breakdown</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Product</div>
                    <div className="text-lg font-medium">{result.product_name}</div>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-300">Pricelist</div>
                    <div className="text-lg font-medium">{result.pricelist_name || 'Default'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-center">
                    <div className="text-sm text-blue-600 dark:text-blue-400">Base Price</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      R {Number(result.base_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center">
                    <div className="text-sm text-orange-600">Discount</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {Number(result.discount_percentage ?? 0).toFixed(1)}%
                    </div>
                    <div className="text-sm text-orange-600">
                      -R {Number(result.discount_amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
                    <div className="text-sm text-green-600 dark:text-green-400">Final Price</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      R {Number(result.final_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                {result.applied_rules && result.applied_rules.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Info size={16} />
                      Applied Rules
                    </h3>
                    <div className="space-y-2">
                      {result.applied_rules.map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-2">
                            <TrendingDown size={16} className="text-orange-500" />
                            <span className="text-sm font-medium">{rule.rule_name}</span>
                          </div>
                          <span className="text-sm text-orange-600">
                            {rule.rule_type === 'percentage' 
                              ? `${rule.discount_value}% off`
                              : `R ${Number(rule.discount_value ?? 0).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 text-center text-gray-500 dark:text-gray-300">
                <Calculator size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Select a product and click Calculate to see the price breakdown</p>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                <h3 className="font-medium mb-3">Select Products ({bulkProductIds.length} selected)</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {products.map(p => (
                    <label key={p.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkProductIds.includes(p.id)}
                        onChange={() => toggleBulkProduct(p.id)}
                        className="h-4 w-4 text-green-600 dark:text-green-400 focus:ring-green-500 border-gray-300 dark:border-gray-600 rounded"
                      />
                      <Package size={16} className="text-gray-300" />
                      <span className="text-sm">{p.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-300 ml-auto">
                        R {p.list_price?.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              {bulkResults.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Base</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bulkResults.map((r, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900">
                          <td className="px-4 py-3 text-sm font-medium">{r.product_name}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                            R {Number(r.base_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600">
                            {Number(r.discount_percentage ?? 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-green-600 dark:text-green-400">
                            R {Number(r.final_price ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
