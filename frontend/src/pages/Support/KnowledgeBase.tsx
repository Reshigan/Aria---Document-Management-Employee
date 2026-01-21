import React, { useState } from 'react';
import { Plus, Search, Book, FileText, Eye, ThumbsUp, Clock, Folder } from 'lucide-react';

interface Article {
  id: number;
  title: string;
  category: string;
  content_preview: string;
  author: string;
  created_date: string;
  updated_date: string;
  views: number;
  helpful_votes: number;
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
}

const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([
    { id: 1, title: 'How to Create an Invoice', category: 'Billing', content_preview: 'Learn how to create and send invoices to your customers...', author: 'John Smith', created_date: '2026-01-10', updated_date: '2026-01-15', views: 245, helpful_votes: 42, status: 'PUBLISHED' },
    { id: 2, title: 'Setting Up User Permissions', category: 'Administration', content_preview: 'Configure user roles and permissions for your team...', author: 'Sarah Johnson', created_date: '2026-01-08', updated_date: '2026-01-12', views: 189, helpful_votes: 35, status: 'PUBLISHED' },
    { id: 3, title: 'Inventory Management Best Practices', category: 'Operations', content_preview: 'Tips and tricks for managing your inventory efficiently...', author: 'Mike Brown', created_date: '2026-01-05', updated_date: '2026-01-10', views: 156, helpful_votes: 28, status: 'PUBLISHED' },
    { id: 4, title: 'Troubleshooting Login Issues', category: 'Technical', content_preview: 'Common login problems and how to resolve them...', author: 'Tom Wilson', created_date: '2026-01-12', updated_date: '2026-01-12', views: 312, helpful_votes: 56, status: 'PUBLISHED' },
    { id: 5, title: 'New Feature: Automated Reports', category: 'Features', content_preview: 'Introducing our new automated reporting feature...', author: 'John Smith', created_date: '2026-01-18', updated_date: '2026-01-18', views: 45, helpful_votes: 8, status: 'DRAFT' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Billing', 'Administration', 'Operations', 'Technical', 'Features'];

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content_preview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    return matchesSearch && matchesCategory && a.status === 'PUBLISHED';
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      PUBLISHED: { bg: '#dcfce7', text: '#166534' },
      DRAFT: { bg: '#fef3c7', text: '#92400e' },
      ARCHIVED: { bg: '#f3f4f6', text: '#374151' }
    };
    const c = config[status] || config.PUBLISHED;
    return <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 600, borderRadius: '9999px', backgroundColor: c.bg, color: c.text }}>{status}</span>;
  };

  const totalViews = articles.reduce((acc, a) => acc + a.views, 0);
  const totalVotes = articles.reduce((acc, a) => acc + a.helpful_votes, 0);
  const publishedCount = articles.filter(a => a.status === 'PUBLISHED').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Knowledge Base</h1>
        <p style={{ color: '#6b7280' }}>Self-service help articles and documentation</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#eff6ff', borderRadius: '10px' }}><Book size={24} style={{ color: '#2563eb' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Articles</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{articles.length}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', borderRadius: '10px' }}><FileText size={24} style={{ color: '#10b981' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Published</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{publishedCount}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#e0e7ff', borderRadius: '10px' }}><Eye size={24} style={{ color: '#6366f1' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Views</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366f1' }}>{totalViews}</div>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: '#fef3c7', borderRadius: '10px' }}><ThumbsUp size={24} style={{ color: '#f59e0b' }} /></div>
            <div>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Helpful Votes</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{totalVotes}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 44px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                border: selectedCategory === cat ? '2px solid #2563eb' : '1px solid #d1d5db',
                borderRadius: '6px',
                backgroundColor: selectedCategory === cat ? '#eff6ff' : 'white',
                color: selectedCategory === cat ? '#2563eb' : '#374151',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {filteredArticles.map((article) => (
          <div key={article.id} style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 500, borderRadius: '6px', backgroundColor: '#f3f4f6', color: '#374151' }}>{article.category}</span>
              {getStatusBadge(article.status)}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>{article.title}</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', lineHeight: '1.5' }}>{article.content_preview}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#9ca3af' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {article.views}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsUp size={14} /> {article.helpful_votes}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {article.updated_date}</span>
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>By {article.author}</span>
            </div>
          </div>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
          <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No articles found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
