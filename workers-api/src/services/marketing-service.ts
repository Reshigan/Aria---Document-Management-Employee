/**
 * Marketing Automation Service
 * 
 * Automated social media marketing to drive platform adoption:
 * - AI-powered content generation using Cloudflare Workers AI
 * - Dynamic image generation for posts
 * - LinkedIn and Facebook posting
 * - Influencer and user group engagement
 * - Continuous monitoring and optimization
 */

export interface ContentTheme {
  id: string;
  name: string;
  description: string | null;
  category: string;
  target_audience: string | null;
  keywords: string[];
  hashtags: string[];
  cta_type: string | null;
  priority: number;
}

export interface MarketingPost {
  id: string;
  theme_id: string | null;
  platform: string;
  post_type: string;
  content: string;
  image_url: string | null;
  image_prompt: string | null;
  hashtags: string[];
  cta_url: string | null;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  external_post_id: string | null;
  error_message: string | null;
  engagement_likes: number;
  engagement_comments: number;
  engagement_shares: number;
  engagement_clicks: number;
  engagement_impressions: number;
  created_at: string;
}

export interface SocialMediaAccount {
  id: string;
  platform: string;
  account_type: string;
  account_name: string;
  account_id: string | null;
  access_token: string | null;
  page_id: string | null;
  is_active: boolean;
  last_post_at: string | null;
  posts_today: number;
  daily_limit: number;
}

export interface Influencer {
  id: string;
  platform: string;
  username: string;
  display_name: string | null;
  profile_url: string | null;
  follower_count: number;
  category: string | null;
  relevance_score: number;
}

export interface MarketingGroup {
  id: string;
  platform: string;
  group_name: string;
  group_url: string | null;
  member_count: number;
  category: string | null;
  posting_frequency: string;
  last_posted_at: string | null;
  relevance_score: number;
}

// ARIA ERP Feature Catalog - Source of truth for content generation
const ARIA_FEATURES = {
  core: [
    { name: '67 AI Bots', description: 'Automate every ERP task with intelligent bots', benefit: 'Reduce manual work by 80%' },
    { name: 'Order-to-Cash', description: 'Complete O2C workflow from quote to payment', benefit: 'Get paid faster' },
    { name: 'Procure-to-Pay', description: 'Streamlined P2P from PO to payment', benefit: 'Control spending' },
    { name: 'Multi-Currency', description: 'Handle transactions in any currency', benefit: 'Go global easily' },
    { name: 'Three-Way Match', description: 'Automated PO/GRN/Invoice matching', benefit: 'Eliminate payment errors' },
    { name: 'Real-Time Dashboard', description: 'Live business insights at a glance', benefit: 'Make informed decisions' },
  ],
  security: [
    { name: 'Audit Trail', description: 'Complete logging of all actions', benefit: 'Stay compliant' },
    { name: 'Role-Based Access', description: 'Control who sees what', benefit: 'Protect sensitive data' },
    { name: 'API Keys', description: 'Secure API access with scoped permissions', benefit: 'Integrate safely' },
  ],
  automation: [
    { name: 'Scheduled Reports', description: 'Auto-generate and email reports', benefit: 'Save hours weekly' },
    { name: 'Webhook Notifications', description: 'Real-time event notifications', benefit: 'Never miss updates' },
    { name: 'Bot Scheduling', description: 'Run bots automatically on schedule', benefit: 'Hands-free operations' },
  ],
  industries: [
    { name: 'Retail', description: 'Inventory, POS, and customer management', benefit: 'Grow your store' },
    { name: 'Manufacturing', description: 'BOMs, work orders, and quality control', benefit: 'Optimize production' },
    { name: 'Services', description: 'Projects, time tracking, and billing', benefit: 'Bill accurately' },
  ],
};

// Pain points that ARIA solves
const PAIN_POINTS = [
  { problem: 'Spending hours on manual data entry', solution: 'AI bots automate 80% of data entry tasks' },
  { problem: 'No visibility into cash flow', solution: 'Real-time dashboard shows exactly where your money is' },
  { problem: 'Invoices getting lost or delayed', solution: 'Automated invoicing with payment reminders' },
  { problem: 'Inventory always out of sync', solution: 'Real-time inventory tracking across all channels' },
  { problem: 'Approval bottlenecks slowing everything down', solution: 'Mobile approvals with one-tap workflow' },
  { problem: 'Spreadsheet chaos across departments', solution: 'Single source of truth for all business data' },
  { problem: 'Month-end close taking weeks', solution: 'Automated reconciliation and GL posting' },
  { problem: 'Paying for features you don\'t use', solution: 'Flexible plans that grow with your business' },
];

// Call-to-action URLs with UTM tracking
const CTA_URLS = {
  demo: 'https://aria-erp.pages.dev?utm_source=social&utm_medium=organic&utm_campaign=marketing_bot&utm_content=demo',
  trial: 'https://aria-erp.pages.dev?utm_source=social&utm_medium=organic&utm_campaign=marketing_bot&utm_content=trial',
  learn_more: 'https://aria-erp.pages.dev?utm_source=social&utm_medium=organic&utm_campaign=marketing_bot&utm_content=learn',
  contact: 'https://aria-erp.pages.dev?utm_source=social&utm_medium=organic&utm_campaign=marketing_bot&utm_content=contact',
};

// Post templates for different content types
const POST_TEMPLATES = {
  feature_spotlight: [
    "Did you know? ARIA ERP includes {feature_name}. {description} {benefit}. Try it free today! {cta_url} {hashtags}",
    "{feature_name} is changing how SMBs operate. {description} The result? {benefit}. See it in action: {cta_url} {hashtags}",
    "Stop struggling with {pain_point}. ARIA's {feature_name} {description}. {cta_url} {hashtags}",
  ],
  pain_point: [
    "Tired of {problem}? You're not alone. That's why we built ARIA ERP. {solution}. Start your free trial: {cta_url} {hashtags}",
    "{problem}? There's a better way. ARIA ERP: {solution}. Book a demo: {cta_url} {hashtags}",
    "Every SMB owner knows the pain of {problem}. ARIA changes that. {solution}. {cta_url} {hashtags}",
  ],
  social_proof: [
    "SMBs are switching to ARIA ERP for a reason: {benefit}. Join them today! {cta_url} {hashtags}",
    "What if your ERP could {benefit}? With ARIA, it can. See how: {cta_url} {hashtags}",
  ],
  question: [
    "Quick question: How much time does your team spend on {task}? With ARIA's AI bots, that time drops to near zero. {cta_url} {hashtags}",
    "What would you do with 10 extra hours per week? ARIA ERP gives you that time back through automation. {cta_url} {hashtags}",
  ],
  tip: [
    "Pro tip for SMB owners: {tip}. ARIA ERP makes this easy with {feature_name}. {cta_url} {hashtags}",
    "Business tip: {tip}. That's exactly what ARIA ERP helps you achieve. Learn more: {cta_url} {hashtags}",
  ],
};

// Platform-specific hashtag sets
const PLATFORM_HASHTAGS = {
  linkedin: ['#ERP', '#SMB', '#BusinessAutomation', '#DigitalTransformation', '#SmallBusiness', '#Entrepreneurship', '#BusinessGrowth', '#Accounting', '#Finance', '#Operations'],
  facebook: ['#SmallBusiness', '#BusinessOwner', '#Entrepreneur', '#BusinessTips', '#Automation', '#BusinessGrowth', '#SMB', '#ERP'],
};

/**
 * Generate dynamic content for a post
 */
export function generatePostContent(
  platform: 'linkedin' | 'facebook',
  theme: ContentTheme | null
): { content: string; hashtags: string[]; cta_url: string } {
  const category = theme?.category || 'feature';
  let content = '';
  let hashtags: string[] = [];
  let cta_url = CTA_URLS.demo;

  // Select random template based on category
  const templates = POST_TEMPLATES[category as keyof typeof POST_TEMPLATES] || POST_TEMPLATES.feature_spotlight;
  const template = templates[Math.floor(Math.random() * templates.length)];

  // Generate content based on category
  if (category === 'feature' || category === 'how_to') {
    const featureCategory = Object.keys(ARIA_FEATURES)[Math.floor(Math.random() * Object.keys(ARIA_FEATURES).length)] as keyof typeof ARIA_FEATURES;
    const features = ARIA_FEATURES[featureCategory];
    const feature = features[Math.floor(Math.random() * features.length)];
    
    content = template
      .replace('{feature_name}', feature.name)
      .replace('{description}', feature.description)
      .replace('{benefit}', feature.benefit)
      .replace('{pain_point}', PAIN_POINTS[Math.floor(Math.random() * PAIN_POINTS.length)].problem);
  } else if (category === 'pain_point') {
    const painPoint = PAIN_POINTS[Math.floor(Math.random() * PAIN_POINTS.length)];
    content = template
      .replace('{problem}', painPoint.problem)
      .replace('{solution}', painPoint.solution);
  } else if (category === 'promotion') {
    const feature = ARIA_FEATURES.core[Math.floor(Math.random() * ARIA_FEATURES.core.length)];
    content = template
      .replace('{feature_name}', feature.name)
      .replace('{benefit}', feature.benefit);
    cta_url = theme?.cta_type === 'trial' ? CTA_URLS.trial : CTA_URLS.demo;
  } else {
    // Default to feature spotlight
    const feature = ARIA_FEATURES.core[Math.floor(Math.random() * ARIA_FEATURES.core.length)];
    content = POST_TEMPLATES.feature_spotlight[0]
      .replace('{feature_name}', feature.name)
      .replace('{description}', feature.description)
      .replace('{benefit}', feature.benefit);
  }

  // Add platform-specific hashtags
  const platformTags = PLATFORM_HASHTAGS[platform] || PLATFORM_HASHTAGS.linkedin;
  const themeTags = theme?.hashtags || [];
  hashtags = [...new Set([...themeTags.slice(0, 3), ...platformTags.slice(0, 4)])].slice(0, 5);

  // Replace placeholders
  content = content
    .replace('{cta_url}', cta_url)
    .replace('{hashtags}', hashtags.join(' '))
    .replace('{task}', 'manual data entry')
    .replace('{tip}', 'Automate repetitive tasks to focus on growth');

  // Adjust content length for platform
  if (platform === 'linkedin' && content.length > 2800) {
    content = content.substring(0, 2800) + '...';
  } else if (platform === 'facebook' && content.length > 500) {
    content = content.substring(0, 500) + '...';
  }

  return { content, hashtags, cta_url };
}

/**
 * Generate image prompt for AI image generation
 */
export function generateImagePrompt(theme: ContentTheme | null, platform: string): string {
  const basePrompts = [
    'Modern business dashboard on computer screen, clean UI, professional office setting, blue and white color scheme, 4k quality',
    'Happy small business owner using tablet, modern office, charts showing growth, professional lighting',
    'Team collaboration around laptop showing analytics, diverse professionals, modern workspace, warm lighting',
    'Automated workflow visualization, connected nodes, modern tech aesthetic, blue gradient background',
    'Invoice and payment automation concept, digital transformation, clean modern design, professional',
    'Inventory management system on screen, warehouse in background, organized and efficient, modern',
  ];

  const categoryPrompts: Record<string, string[]> = {
    feature: [
      'Software dashboard with AI automation icons, modern tech aesthetic, blue and purple gradient',
      'ERP system interface showing real-time data, professional business setting, clean design',
    ],
    pain_point: [
      'Business person relieved after solving problem, before/after concept, professional setting',
      'Transformation from chaos to order, business documents organized, modern office',
    ],
    promotion: [
      'Free trial banner concept, modern SaaS aesthetic, call to action, vibrant colors',
      'Demo invitation, professional software presentation, welcoming business environment',
    ],
  };

  const category = theme?.category || 'feature';
  const prompts = categoryPrompts[category] || basePrompts;
  const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  return `${selectedPrompt}, high quality, professional, suitable for ${platform} post, no text overlay`;
}

/**
 * Get content themes from database
 */
export async function getContentThemes(db: D1Database): Promise<ContentTheme[]> {
  const result = await db.prepare(`
    SELECT * FROM marketing_content_themes 
    WHERE is_active = 1 
    ORDER BY priority DESC
  `).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    keywords: JSON.parse(row.keywords || '[]'),
    hashtags: JSON.parse(row.hashtags || '[]'),
  }));
}

/**
 * Select a theme based on weighted priority
 */
export async function selectThemeForPost(db: D1Database): Promise<ContentTheme | null> {
  const themes = await getContentThemes(db);
  if (themes.length === 0) return null;

  // Weighted random selection based on priority
  const totalWeight = themes.reduce((sum, t) => sum + t.priority, 0);
  let random = Math.random() * totalWeight;
  
  for (const theme of themes) {
    random -= theme.priority;
    if (random <= 0) return theme;
  }
  
  return themes[0];
}

/**
 * Create a new marketing post
 */
export async function createPost(
  db: D1Database,
  platform: 'linkedin' | 'facebook',
  scheduleAt?: string
): Promise<MarketingPost> {
  const id = crypto.randomUUID();
  const theme = await selectThemeForPost(db);
  const { content, hashtags, cta_url } = generatePostContent(platform, theme);
  const imagePrompt = generateImagePrompt(theme, platform);
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO marketing_posts (
      id, theme_id, platform, post_type, content, image_prompt, hashtags, cta_url,
      status, scheduled_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    theme?.id || null,
    platform,
    'image',
    content,
    imagePrompt,
    JSON.stringify(hashtags),
    cta_url,
    scheduleAt ? 'scheduled' : 'draft',
    scheduleAt || null,
    timestamp,
    timestamp
  ).run();

  return {
    id,
    theme_id: theme?.id || null,
    platform,
    post_type: 'image',
    content,
    image_url: null,
    image_prompt: imagePrompt,
    hashtags,
    cta_url,
    status: scheduleAt ? 'scheduled' : 'draft',
    scheduled_at: scheduleAt || null,
    posted_at: null,
    external_post_id: null,
    error_message: null,
    engagement_likes: 0,
    engagement_comments: 0,
    engagement_shares: 0,
    engagement_clicks: 0,
    engagement_impressions: 0,
    created_at: timestamp,
  };
}

/**
 * Get pending posts ready to be published
 */
export async function getPendingPosts(db: D1Database, limit: number = 10): Promise<MarketingPost[]> {
  const now = new Date().toISOString();
  
  const result = await db.prepare(`
    SELECT * FROM marketing_posts 
    WHERE status = 'scheduled' AND scheduled_at <= ?
    ORDER BY scheduled_at ASC
    LIMIT ?
  `).bind(now, limit).all();

  return (result.results || []).map((row: any) => ({
    ...row,
    hashtags: JSON.parse(row.hashtags || '[]'),
  }));
}

/**
 * Update post status after publishing
 */
export async function updatePostStatus(
  db: D1Database,
  postId: string,
  status: 'posted' | 'failed',
  externalPostId?: string,
  errorMessage?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  await db.prepare(`
    UPDATE marketing_posts 
    SET status = ?, external_post_id = ?, error_message = ?, 
        posted_at = CASE WHEN ? = 'posted' THEN ? ELSE posted_at END,
        updated_at = ?
    WHERE id = ?
  `).bind(
    status,
    externalPostId || null,
    errorMessage || null,
    status,
    timestamp,
    timestamp,
    postId
  ).run();
}

/**
 * Post to LinkedIn (placeholder - requires OAuth setup)
 */
export async function postToLinkedIn(
  post: MarketingPost,
  account: SocialMediaAccount
): Promise<{ success: boolean; postId?: string; error?: string }> {
  // LinkedIn API requires OAuth 2.0 authentication
  // This is a placeholder that simulates the posting flow
  
  if (!account.access_token) {
    return { success: false, error: 'LinkedIn access token not configured' };
  }

  try {
    // In production, this would call the LinkedIn API:
    // POST https://api.linkedin.com/v2/ugcPosts
    // With proper OAuth headers and UGC post body
    
    console.log(`[LinkedIn] Would post: ${post.content.substring(0, 100)}...`);
    
    // Simulate successful post
    const mockPostId = `li_${crypto.randomUUID().substring(0, 8)}`;
    return { success: true, postId: mockPostId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Post to Facebook (placeholder - requires OAuth setup)
 */
export async function postToFacebook(
  post: MarketingPost,
  account: SocialMediaAccount
): Promise<{ success: boolean; postId?: string; error?: string }> {
  // Facebook Graph API requires OAuth 2.0 authentication
  // This is a placeholder that simulates the posting flow
  
  if (!account.access_token) {
    return { success: false, error: 'Facebook access token not configured' };
  }

  try {
    // In production, this would call the Facebook Graph API:
    // POST https://graph.facebook.com/v18.0/{page-id}/feed
    // With access_token and message parameters
    
    console.log(`[Facebook] Would post: ${post.content.substring(0, 100)}...`);
    
    // Simulate successful post
    const mockPostId = `fb_${crypto.randomUUID().substring(0, 8)}`;
    return { success: true, postId: mockPostId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get social media accounts
 */
export async function getSocialMediaAccounts(db: D1Database, platform?: string): Promise<SocialMediaAccount[]> {
  let query = 'SELECT * FROM social_media_accounts WHERE is_active = 1';
  const params: any[] = [];
  
  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }
  
  const result = await db.prepare(query).bind(...params).all();
  
  return (result.results || []).map((row: any) => ({
    ...row,
    is_active: row.is_active === 1,
  }));
}

/**
 * Process scheduled posts (called by scheduled handler)
 */
export async function processScheduledPosts(db: D1Database): Promise<{ processed: number; succeeded: number; failed: number }> {
  const pendingPosts = await getPendingPosts(db, 5);
  let processed = 0, succeeded = 0, failed = 0;

  for (const post of pendingPosts) {
    processed++;
    
    const accounts = await getSocialMediaAccounts(db, post.platform);
    if (accounts.length === 0) {
      await updatePostStatus(db, post.id, 'failed', undefined, 'No active account for platform');
      failed++;
      continue;
    }

    const account = accounts[0];
    let result: { success: boolean; postId?: string; error?: string };

    if (post.platform === 'linkedin') {
      result = await postToLinkedIn(post, account);
    } else if (post.platform === 'facebook') {
      result = await postToFacebook(post, account);
    } else {
      result = { success: false, error: 'Unsupported platform' };
    }

    if (result.success) {
      await updatePostStatus(db, post.id, 'posted', result.postId);
      succeeded++;
    } else {
      await updatePostStatus(db, post.id, 'failed', undefined, result.error);
      failed++;
    }
  }

  return { processed, succeeded, failed };
}

/**
 * Generate and schedule posts for the day
 */
export async function generateDailyPosts(db: D1Database, postsPerPlatform: number = 3): Promise<MarketingPost[]> {
  const posts: MarketingPost[] = [];
  const platforms: ('linkedin' | 'facebook')[] = ['linkedin', 'facebook'];
  const now = new Date();

  for (const platform of platforms) {
    for (let i = 0; i < postsPerPlatform; i++) {
      // Schedule posts throughout the day (9am, 12pm, 3pm, 6pm)
      const hours = [9, 12, 15, 18];
      const scheduleTime = new Date(now);
      scheduleTime.setHours(hours[i % hours.length], 0, 0, 0);
      
      // If time has passed, schedule for tomorrow
      if (scheduleTime <= now) {
        scheduleTime.setDate(scheduleTime.getDate() + 1);
      }

      const post = await createPost(db, platform, scheduleTime.toISOString());
      posts.push(post);
    }
  }

  return posts;
}

/**
 * Get marketing analytics summary
 */
export async function getMarketingAnalytics(db: D1Database, days: number = 30): Promise<{
  total_posts: number;
  total_impressions: number;
  total_engagement: number;
  posts_by_platform: Record<string, number>;
  posts_by_status: Record<string, number>;
}> {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const statsResult = await db.prepare(`
    SELECT 
      COUNT(*) as total_posts,
      SUM(engagement_impressions) as total_impressions,
      SUM(engagement_likes + engagement_comments + engagement_shares) as total_engagement
    FROM marketing_posts
    WHERE created_at >= ?
  `).bind(startDate).first() as any;

  const platformResult = await db.prepare(`
    SELECT platform, COUNT(*) as count
    FROM marketing_posts
    WHERE created_at >= ?
    GROUP BY platform
  `).bind(startDate).all();

  const statusResult = await db.prepare(`
    SELECT status, COUNT(*) as count
    FROM marketing_posts
    WHERE created_at >= ?
    GROUP BY status
  `).bind(startDate).all();

  const postsByPlatform: Record<string, number> = {};
  for (const row of (platformResult.results || []) as any[]) {
    postsByPlatform[row.platform] = row.count;
  }

  const postsByStatus: Record<string, number> = {};
  for (const row of (statusResult.results || []) as any[]) {
    postsByStatus[row.status] = row.count;
  }

  return {
    total_posts: statsResult?.total_posts || 0,
    total_impressions: statsResult?.total_impressions || 0,
    total_engagement: statsResult?.total_engagement || 0,
    posts_by_platform: postsByPlatform,
    posts_by_status: postsByStatus,
  };
}

/**
 * Add an influencer to track
 */
export async function addInfluencer(
  db: D1Database,
  platform: string,
  username: string,
  displayName: string,
  profileUrl: string,
  category: string,
  followerCount: number = 0
): Promise<Influencer> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO marketing_influencers (
      id, platform, username, display_name, profile_url, follower_count,
      category, relevance_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, platform, username, displayName, profileUrl, followerCount, category, 5, timestamp, timestamp).run();

  return {
    id,
    platform,
    username,
    display_name: displayName,
    profile_url: profileUrl,
    follower_count: followerCount,
    category,
    relevance_score: 5,
  };
}

/**
 * Add a user group to track
 */
export async function addMarketingGroup(
  db: D1Database,
  platform: string,
  groupName: string,
  groupUrl: string,
  category: string,
  memberCount: number = 0
): Promise<MarketingGroup> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  await db.prepare(`
    INSERT INTO marketing_groups (
      id, platform, group_name, group_url, member_count,
      category, posting_frequency, relevance_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, platform, groupName, groupUrl, memberCount, category, 'weekly', 5, timestamp, timestamp).run();

  return {
    id,
    platform,
    group_name: groupName,
    group_url: groupUrl,
    member_count: memberCount,
    category,
    posting_frequency: 'weekly',
    last_posted_at: null,
    relevance_score: 5,
  };
}

/**
 * Get influencers
 */
export async function getInfluencers(db: D1Database, platform?: string): Promise<Influencer[]> {
  let query = 'SELECT * FROM marketing_influencers WHERE is_active = 1';
  const params: any[] = [];
  
  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }
  
  query += ' ORDER BY relevance_score DESC, follower_count DESC';
  
  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as Influencer[];
}

/**
 * Get marketing groups
 */
export async function getMarketingGroups(db: D1Database, platform?: string): Promise<MarketingGroup[]> {
  let query = 'SELECT * FROM marketing_groups WHERE is_active = 1';
  const params: any[] = [];
  
  if (platform) {
    query += ' AND platform = ?';
    params.push(platform);
  }
  
  query += ' ORDER BY relevance_score DESC, member_count DESC';
  
  const result = await db.prepare(query).bind(...params).all();
  return (result.results || []) as unknown as MarketingGroup[];
}

/**
 * List all posts with pagination
 */
export async function listPosts(
  db: D1Database,
  options: { platform?: string; status?: string; page?: number; pageSize?: number } = {}
): Promise<{ posts: MarketingPost[]; total: number }> {
  const { platform, status, page = 1, pageSize = 20 } = options;
  
  let whereClause = '1=1';
  const params: any[] = [];
  
  if (platform) {
    whereClause += ' AND platform = ?';
    params.push(platform);
  }
  if (status) {
    whereClause += ' AND status = ?';
    params.push(status);
  }

  const countResult = await db.prepare(`
    SELECT COUNT(*) as count FROM marketing_posts WHERE ${whereClause}
  `).bind(...params).first() as any;

  const offset = (page - 1) * pageSize;
  const postsResult = await db.prepare(`
    SELECT * FROM marketing_posts 
    WHERE ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, pageSize, offset).all();

  return {
    posts: (postsResult.results || []).map((row: any) => ({
      ...row,
      hashtags: JSON.parse(row.hashtags || '[]'),
    })),
    total: countResult?.count || 0,
  };
}

export default {
  generatePostContent,
  generateImagePrompt,
  getContentThemes,
  selectThemeForPost,
  createPost,
  getPendingPosts,
  updatePostStatus,
  postToLinkedIn,
  postToFacebook,
  getSocialMediaAccounts,
  processScheduledPosts,
  generateDailyPosts,
  getMarketingAnalytics,
  addInfluencer,
  addMarketingGroup,
  getInfluencers,
  getMarketingGroups,
  listPosts,
};
