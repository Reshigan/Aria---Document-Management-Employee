import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, DollarSign, Boxes, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface Product {
  id: number;
  product_code: string;
  product_name: string;
  description: string | null;
  cost_price: number;
  selling_price: number;
  stock_on_hand: number;
  reorder_level: number;
  reorder_quantity: number;
  is_active: boolean;
}

const ProductCatalog: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || 'https://aria-api.reshigan-085.workers.dev';
        const response = await fetch(`${API_BASE}/api/products`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          setProducts(Array.isArray(data) ? data : data.data || []);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        setProducts([]);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.product_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterLowStock || p.stock_on_hand <= p.reorder_level;
    return matchesSearch && matchesFilter;
  });

  const isLowStock = (product: Product) => product.stock_on_hand <= product.reorder_level;
  const lowStockCount = products.filter(isLowStock).length;
  const totalValue = products.reduce((sum, p) => sum + (p.cost_price * p.stock_on_hand), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30">
              <Package className="h-7 w-7 text-white" />
            </div>
            Product Catalog
          </h1>
          <p className="text-gray-500 dark:text-gray-400 ml-14">Manage your product inventory</p>
        </div>
        <Link to="/procurement/products/new" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 transition-all duration-200">
          <Plus className="h-5 w-5" />
          New Product
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-violet-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Products</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-rose-500 rounded-xl shadow-lg shadow-red-500/30">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{lowStockCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl shadow-lg shadow-emerald-500/30">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalValue)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Stock Value</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-lg shadow-blue-500/30">
              <Boxes className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.reduce((sum, p) => sum + p.stock_on_hand, 0)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 dark:text-white"
          />
        </div>
        <label className="flex items-center gap-2 bg-white dark:bg-gray-800 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="rounded text-violet-500 focus:ring-violet-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Low Stock Only</span>
        </label>
      </div>

      {/* Product Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Code</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product Name</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost Price</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Selling Price</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reorder Level</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4">
                  <Link to={`/procurement/products/${product.id}`} className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium">
                    {product.product_code}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{product.product_name}</div>
                  {product.description && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">{product.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(product.cost_price)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(product.selling_price)}</td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${isLowStock(product) ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {product.stock_on_hand}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{product.reorder_level}</td>
                <td className="px-6 py-4">
                  {isLowStock(product) ? (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      In Stock
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/procurement/products/${product.id}`} className="text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 text-sm font-medium">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lowStockCount > 0 && (
        <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl">
          <div className="flex items-center">
            <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg mr-3">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Low Stock Alert
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                {lowStockCount} product{lowStockCount !== 1 ? 's' : ''} need reordering. Review and create purchase orders.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
