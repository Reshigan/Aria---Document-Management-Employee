import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Loader2 } from 'lucide-react';
import api from '../lib/api';

interface Product {
  id: string;
  code: string;
  name: string;
  selling_price: number;
  unit_of_measure: string;
  variant_id?: string;
  template_id?: string;
  attribute_values?: string[];
}

interface PricingContext {
  customer_id?: string;
  pricelist_id?: string;
  date?: string;
}

export interface LineItem {
  id?: string;
  line_number: number;
  product_id: string;
  product_code?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  line_total: number;
}

interface LineItemsTableProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  products: Product[];
  onProductSearch?: (search: string) => void;
  readOnly?: boolean;
  showStorageLocation?: boolean;
  pricingContext?: PricingContext;
  onPriceCalculated?: (productId: string, price: number, discount: number) => void;
}

export function LineItemsTable({
  items,
  onChange,
  products,
  onProductSearch,
  readOnly = false,
  showStorageLocation = false,
  pricingContext,
  onPriceCalculated
}: LineItemsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState<number | null>(null);

  const calculateLineTotal = (item: LineItem): number => {
    const subtotal = item.quantity * item.unit_price;
    const afterDiscount = subtotal * (1 - item.discount_percent / 100);
    const withTax = afterDiscount * (1 + item.tax_rate / 100);
    return withTax;
  };

  const updateItem = (index: number, updates: Partial<LineItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    
    if ('quantity' in updates || 'unit_price' in updates || 'discount_percent' in updates || 'tax_rate' in updates) {
      newItems[index].line_total = calculateLineTotal(newItems[index]);
    }
    
    onChange(newItems);
  };

  const addItem = () => {
    const newItem: LineItem = {
      line_number: items.length + 1,
      product_id: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percent: 0,
      tax_rate: 15,
      line_total: 0
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    newItems.forEach((item, i) => {
      item.line_number = i + 1;
    });
    onChange(newItems);
  };

    const selectProduct = async (index: number, product: Product) => {
      setLoadingPrice(index);
      let finalPrice = product.selling_price;
      let discountPercent = 0;
    
      if (pricingContext?.customer_id || pricingContext?.pricelist_id) {
        try {
          const response = await api.post('/odoo/pricing/calculate', {
            product_id: product.variant_id || product.id,
            pricelist_id: pricingContext.pricelist_id || null,
            customer_id: pricingContext.customer_id || null,
            quantity: items[index]?.quantity || 1,
            date: pricingContext.date || new Date().toISOString().split('T')[0]
          });
          const priceResult = response.data.data || response.data;
          if (priceResult && priceResult.final_price !== undefined) {
            finalPrice = priceResult.final_price;
            discountPercent = priceResult.discount_percentage || 0;
            onPriceCalculated?.(product.id, finalPrice, discountPercent);
          }
        } catch (error) {
          console.error('Error calculating price:', error);
        }
      }
    
      updateItem(index, {
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        description: product.name,
        unit_price: finalPrice,
        discount_percent: discountPercent
      });
      setShowProductSearch(null);
      setSearchTerm('');
      setLoadingPrice(null);
    };

  const subtotal = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
    return sum + itemSubtotal;
  }, 0);

  const taxAmount = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unit_price * (1 - item.discount_percent / 100);
    const itemTax = itemSubtotal * (item.tax_rate / 100);
    return sum + itemTax;
  }, 0);

  const total = subtotal + taxAmount;

  const filteredProducts = searchTerm
    ? products.filter(p => {
        const code = (p.code ?? '').toString().toLowerCase();
        const name = (p.name ?? '').toString().toLowerCase();
        const q = searchTerm.toLowerCase();
        return code.includes(q) || name.includes(q);
      })
    : products;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Line Items</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={addItem}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Add Line
          </button>
        )}
      </div>

      <div style={{ 
        overflowX: 'auto',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <tr>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '50px' }}>#</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', minWidth: '200px' }}>Product</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', minWidth: '150px' }}>Description</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '100px' }}>Quantity</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '120px' }}>Unit Price</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '100px' }}>Discount %</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '100px' }}>Tax %</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', width: '120px' }}>Line Total</th>
              {!readOnly && <th style={{ padding: '0.75rem', width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 8 : 9} style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                  No line items. Click "Add Line" to get started.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{item.line_number}</td>
                  <td style={{ padding: '0.75rem', position: 'relative' }}>
                    {readOnly ? (
                      <div style={{ fontSize: '0.875rem' }}>
                        <div style={{ fontWeight: '500' }}>{item.product_code}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.product_name}</div>
                      </div>
                    ) : (
                      <>
                        <div
                          onClick={() => setShowProductSearch(index)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            background: 'white'
                          }}
                        >
                          {item.product_code ? (
                            <>
                              <div style={{ fontWeight: '500' }}>{item.product_code}</div>
                              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{item.product_name}</div>
                            </>
                          ) : (
                            <div style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Search size={14} />
                              Select product...
                            </div>
                          )}
                        </div>
                        {showProductSearch === index && (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            zIndex: 50,
                            marginTop: '0.25rem',
                            width: '300px',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            maxHeight: '300px',
                            overflow: 'auto'
                          }}>
                            <div style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                              <input
                                type="text"
                                placeholder="Search products..."
                                value={searchTerm}
                                onChange={(e) => {
                                  setSearchTerm(e.target.value);
                                  onProductSearch?.(e.target.value);
                                }}
                                autoFocus
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #d1d5db',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                            </div>
                            <div>
                              {filteredProducts.map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => selectProduct(index, product)}
                                  style={{
                                    padding: '0.75rem',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f3f4f6',
                                    fontSize: '0.875rem'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                  <div style={{ fontWeight: '500' }}>{product.code || ''}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{product.name || ''}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#2563eb' }}>
                                    R {Number(product.selling_price ?? 0).toFixed(2)} / {product.unit_of_measure || ''}
                                  </div>
                                </div>
                              ))}
                              {filteredProducts.length === 0 && (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                                  No products found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {readOnly ? (
                      <div style={{ fontSize: '0.875rem' }}>{item.description}</div>
                    ) : (
                      <input
                        type="text"
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, { description: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {readOnly ? (
                      <div style={{ fontSize: '0.875rem', textAlign: 'right' }}>{item.quantity}</div>
                    ) : (
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          textAlign: 'right'
                        }}
                      />
                    )}
                  </td>
                                    <td style={{ padding: '0.75rem' }}>
                                      {loadingPrice === index ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Calculating...</span>
                                        </div>
                                      ) : readOnly ? (
                                        <div style={{ fontSize: '0.875rem', textAlign: 'right' }}>R {Number(item.unit_price ?? 0).toFixed(2)}</div>
                                      ) : (
                                        <input
                                          type="number"
                                          value={item.unit_price}
                                          onChange={(e) => updateItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                                          min="0"
                                          step="0.01"
                                          style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            textAlign: 'right'
                                          }}
                                        />
                                      )}
                                    </td>
                  <td style={{ padding: '0.75rem' }}>
                    {readOnly ? (
                      <div style={{ fontSize: '0.875rem', textAlign: 'right' }}>{item.discount_percent}%</div>
                    ) : (
                      <input
                        type="number"
                        value={item.discount_percent}
                        onChange={(e) => updateItem(index, { discount_percent: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          textAlign: 'right'
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    {readOnly ? (
                      <div style={{ fontSize: '0.875rem', textAlign: 'right' }}>{item.tax_rate}%</div>
                    ) : (
                      <input
                        type="number"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, { tax_rate: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.375rem',
                          fontSize: '0.875rem',
                          textAlign: 'right'
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                    R {Number(item.line_total ?? 0).toFixed(2)}
                  </td>
                  {!readOnly && (
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        style={{
                          padding: '0.25rem',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Subtotal:</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>R {subtotal.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '300px' }}>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tax:</span>
          <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>R {taxAmount.toFixed(2)}</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          width: '300px',
          paddingTop: '0.5rem',
          borderTop: '2px solid #d1d5db'
        }}>
          <span style={{ fontSize: '1rem', fontWeight: '600' }}>Total:</span>
          <span style={{ fontSize: '1rem', fontWeight: '600', color: '#2563eb' }}>R {total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
