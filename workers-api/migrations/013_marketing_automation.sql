-- Migration 013: Marketing Automation Service
-- Automated social media marketing to drive platform adoption

-- ============================================
-- MARKETING CONTENT LIBRARY
-- ============================================
-- Pre-defined content themes and templates for posts

CREATE TABLE IF NOT EXISTS marketing_content_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'feature', 'pain_point', 'testimonial', 'how_to', 'industry', 'promotion'
  target_audience TEXT, -- 'smb_owner', 'accountant', 'operations_manager', 'cfo'
  keywords TEXT, -- JSON array of keywords
  hashtags TEXT, -- JSON array of hashtags
  cta_type TEXT, -- 'demo', 'trial', 'learn_more', 'contact'
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 5, -- 1-10, higher = more frequent
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MARKETING POSTS
-- ============================================
-- Generated and scheduled posts

CREATE TABLE IF NOT EXISTS marketing_posts (
  id TEXT PRIMARY KEY,
  theme_id TEXT,
  platform TEXT NOT NULL, -- 'linkedin', 'facebook', 'twitter', 'instagram'
  post_type TEXT NOT NULL, -- 'text', 'image', 'video', 'carousel', 'story'
  content TEXT NOT NULL, -- The post text
  image_url TEXT, -- R2 URL for generated image
  image_prompt TEXT, -- AI prompt used to generate image
  hashtags TEXT, -- JSON array
  cta_url TEXT, -- Call-to-action URL with UTM params
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed', 'cancelled'
  scheduled_at TEXT,
  posted_at TEXT,
  external_post_id TEXT, -- ID from the social platform
  error_message TEXT,
  engagement_likes INTEGER DEFAULT 0,
  engagement_comments INTEGER DEFAULT 0,
  engagement_shares INTEGER DEFAULT 0,
  engagement_clicks INTEGER DEFAULT 0,
  engagement_impressions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (theme_id) REFERENCES marketing_content_themes(id)
);

-- ============================================
-- SOCIAL MEDIA ACCOUNTS
-- ============================================
-- Connected social media accounts for posting

CREATE TABLE IF NOT EXISTS social_media_accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL, -- 'linkedin', 'facebook', 'twitter', 'instagram'
  account_type TEXT NOT NULL, -- 'company_page', 'personal', 'group'
  account_name TEXT NOT NULL,
  account_id TEXT, -- Platform-specific account ID
  access_token TEXT, -- Encrypted OAuth token
  refresh_token TEXT,
  token_expires_at TEXT,
  page_id TEXT, -- For Facebook/LinkedIn pages
  is_active INTEGER DEFAULT 1,
  last_post_at TEXT,
  posts_today INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 5,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- INFLUENCER TRACKING
-- ============================================
-- Track influencers and user groups for engagement

CREATE TABLE IF NOT EXISTS marketing_influencers (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT,
  profile_url TEXT,
  follower_count INTEGER DEFAULT 0,
  category TEXT, -- 'erp_expert', 'smb_advisor', 'accountant', 'tech_reviewer'
  relevance_score INTEGER DEFAULT 5, -- 1-10
  engagement_rate REAL DEFAULT 0,
  last_engaged_at TEXT,
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- USER GROUPS
-- ============================================
-- Track relevant user groups for posting

CREATE TABLE IF NOT EXISTS marketing_groups (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_url TEXT,
  group_id TEXT, -- Platform-specific group ID
  member_count INTEGER DEFAULT 0,
  category TEXT, -- 'smb_owners', 'accountants', 'erp_users', 'entrepreneurs'
  posting_allowed INTEGER DEFAULT 1,
  posting_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly'
  last_posted_at TEXT,
  relevance_score INTEGER DEFAULT 5,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MARKETING CAMPAIGNS
-- ============================================
-- Track marketing campaigns and their performance

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT,
  end_date TEXT,
  target_platforms TEXT, -- JSON array
  target_audience TEXT,
  budget REAL DEFAULT 0,
  status TEXT DEFAULT 'draft', -- 'draft', 'active', 'paused', 'completed'
  total_posts INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- MARKETING ANALYTICS
-- ============================================
-- Daily analytics snapshots

CREATE TABLE IF NOT EXISTS marketing_analytics (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  platform TEXT NOT NULL,
  posts_count INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  top_post_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================
-- CONTENT GENERATION QUEUE
-- ============================================
-- Queue for AI content generation tasks

CREATE TABLE IF NOT EXISTS marketing_generation_queue (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL, -- 'text', 'image', 'hashtags', 'variation'
  theme_id TEXT,
  platform TEXT,
  prompt TEXT,
  result TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

-- ============================================
-- SEED CONTENT THEMES
-- ============================================

INSERT INTO marketing_content_themes (id, name, description, category, target_audience, keywords, hashtags, cta_type, priority) VALUES
-- Feature Spotlights
('theme_bots', 'Bot Automation', 'Highlight 67 AI bots that automate ERP tasks', 'feature', 'smb_owner', '["automation","AI","bots","efficiency"]', '["#ERPAutomation","#AIBots","#BusinessAutomation","#SMB"]', 'demo', 9),
('theme_multicurrency', 'Multi-Currency Support', 'Global business with multi-currency transactions', 'feature', 'cfo', '["multi-currency","global","forex","international"]', '["#GlobalBusiness","#MultiCurrency","#InternationalTrade"]', 'trial', 7),
('theme_threeway', 'Three-Way Match', 'Automated PO/GRN/Invoice matching', 'feature', 'accountant', '["three-way match","procurement","AP automation"]', '["#AccountsPayable","#Procurement","#APAutomation"]', 'demo', 8),
('theme_audit', 'Audit Trail', 'Complete audit logging for compliance', 'feature', 'cfo', '["audit","compliance","security","SOC2"]', '["#Compliance","#AuditTrail","#DataSecurity"]', 'learn_more', 6),

-- Pain Points
('theme_cashflow', 'Cash Flow Problems', 'Solve cash flow visibility issues', 'pain_point', 'smb_owner', '["cash flow","payments","invoicing","AR"]', '["#CashFlow","#SMBFinance","#BusinessGrowth"]', 'demo', 10),
('theme_manual', 'Manual Data Entry', 'Eliminate manual data entry errors', 'pain_point', 'operations_manager', '["automation","data entry","errors","efficiency"]', '["#NoMoreSpreadsheets","#Automation","#Efficiency"]', 'trial', 9),
('theme_visibility', 'Lack of Visibility', 'Real-time business insights', 'pain_point', 'smb_owner', '["visibility","dashboard","analytics","insights"]', '["#BusinessIntelligence","#RealTimeData","#Analytics"]', 'demo', 8),

-- How-To Content
('theme_howto_invoice', 'How to Create Invoices', 'Quick invoice creation tutorial', 'how_to', 'smb_owner', '["invoicing","tutorial","how-to"]', '["#InvoicingTips","#SMBTips","#BusinessTips"]', 'trial', 5),
('theme_howto_inventory', 'Inventory Management Tips', 'Best practices for inventory', 'how_to', 'operations_manager', '["inventory","stock","warehouse"]', '["#InventoryManagement","#WarehouseManagement"]', 'learn_more', 5),

-- Industry Specific
('theme_retail', 'Retail ERP', 'ERP for retail businesses', 'industry', 'smb_owner', '["retail","POS","inventory","sales"]', '["#RetailTech","#RetailERP","#SmallRetail"]', 'demo', 6),
('theme_manufacturing', 'Manufacturing ERP', 'ERP for manufacturers', 'industry', 'operations_manager', '["manufacturing","production","BOM","quality"]', '["#ManufacturingERP","#Industry40","#SmartFactory"]', 'demo', 6),
('theme_services', 'Professional Services', 'ERP for service businesses', 'industry', 'smb_owner', '["services","projects","billing","time tracking"]', '["#ProfessionalServices","#ServiceBusiness"]', 'demo', 6),

-- Promotions
('theme_freetrial', 'Free Trial Offer', 'Start your free 14-day trial', 'promotion', 'smb_owner', '["free trial","no credit card","get started"]', '["#FreeTrial","#TryNow","#NoRisk"]', 'trial', 10),
('theme_demo', 'Book a Demo', 'See ARIA in action', 'promotion', 'smb_owner', '["demo","walkthrough","personalized"]', '["#BookADemo","#SeeItInAction"]', 'demo', 8);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_posts_status ON marketing_posts(status);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_platform ON marketing_posts(platform);
CREATE INDEX IF NOT EXISTS idx_marketing_posts_scheduled ON marketing_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_analytics_date ON marketing_analytics(date, platform);
CREATE INDEX IF NOT EXISTS idx_marketing_queue_status ON marketing_generation_queue(status);
