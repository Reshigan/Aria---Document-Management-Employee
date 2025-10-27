import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
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
    // Mock data
    setProducts([
      { id: 1, product_code: 'PROD-001', product_name: 'Laptop Dell XPS 15', description: 'High-performance laptop', cost_price: 18000, selling_price: 22000, stock_on_hand: 15, reorder_level: 10, reorder_quantity: 20, is_active: true },
      { id: 2, product_code: 'PROD-002', product_name: 'Office Chair Executive', description: 'Ergonomic office chair', cost_price: 2500, selling_price: 3500, stock_on_hand: 8, reorder_level: 10, reorder_quantity: 15, is_active: true },
      { id: 3, product_code: 'PROD-003', product_name: 'Printer HP LaserJet', description: 'Network laser printer', cost_price: 4500, selling_price: 6000, stock_on_hand: 25, reorder_level: 5, reorder_quantity: 10, is_active: true },
      { id: 4, product_code: 'PROD-004', product_name: 'Monitor 27" 4K', description: '4K display monitor', cost_price: 6000, selling_price: 8000, stock_on_hand: 3, reorder_level: 8, reorder_quantity: 12, is_active: true }
    ]);
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Product Catalog</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory</p>
        </div>
        <Link to="/procurement/products/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Product
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Total Products</div>
              <div className="text-2xl font-bold text-gray-900">{products.length}</div>
            </div>
            <Package className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 mb-1">Low Stock Items</div>
              <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Stock Value</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalValue)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Units</div>
          <div className="text-2xl font-bold text-gray-900">
            {products.reduce((sum, p) => sum + p.stock_on_hand, 0)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <label className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={filterLowStock}
            onChange={(e) => setFilterLowStock(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Low Stock Only</span>
        </label>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/procurement/products/${product.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                    {product.product_code}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium">{product.product_name}</div>
                  {product.description && (
                    <div className="text-sm text-gray-500">{product.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{formatCurrency(product.cost_price)}</td>
                <td className="px-6 py-4 text-sm font-medium">{formatCurrency(product.selling_price)}</td>
                <td className="px-6 py-4">
                  <span className={`text-sm font-medium ${isLowStock(product) ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock_on_hand}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{product.reorder_level}</td>
                <td className="px-6 py-4">
                  {isLowStock(product) ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      In Stock
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <Link to={`/procurement/products/${product.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lowStockCount > 0 && (
        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Low Stock Alert
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
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
