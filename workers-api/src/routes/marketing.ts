/**
 * Marketing Automation Routes
 * 
 * API endpoints for automated social media marketing:
 * - Content generation and scheduling
 * - Social media account management
 * - Influencer and group tracking
 * - Analytics and reporting
 */

import { Hono } from 'hono';
import { getSecureCompanyId, getSecureUserId } from '../middleware/auth';
import {
  createPost,
  listPosts,
  generateDailyPosts,
  getContentThemes,
  getSocialMediaAccounts,
  getMarketingAnalytics,
  addInfluencer,
  getInfluencers,
  addMarketingGroup,
  getMarketingGroups,
  processScheduledPosts,
  generatePostContent,
  generateImagePrompt,
  selectThemeForPost,
} from '../services/marketing-service';

interface Env {
  DB: D1Database;
  AI?: any; // Cloudflare Workers AI binding (optional)
}

const marketing = new Hono<{ Bindings: Env }>();

// ============================================
// CONTENT GENERATION
// ============================================

/**
 * Generate a new post (draft or scheduled)
 */
marketing.post('/posts/generate', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      platform: 'linkedin' | 'facebook';
      schedule_at?: string;
    }>();

    const { platform, schedule_at } = body;

    if (!platform || !['linkedin', 'facebook'].includes(platform)) {
      return c.json({ error: 'Platform must be linkedin or facebook' }, 400);
    }

    const post = await createPost(c.env.DB, platform, schedule_at);
    return c.json({ success: true, post }, 201);
  } catch (error) {
    console.error('Error generating post:', error);
    return c.json({ error: 'Failed to generate post' }, 500);
  }
});

/**
 * Generate daily posts for all platforms
 */
marketing.post('/posts/generate-daily', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ posts_per_platform?: number }>().catch(() => ({ posts_per_platform: 3 }));
    const postsPerPlatform = body.posts_per_platform || 3;

    const posts = await generateDailyPosts(c.env.DB, postsPerPlatform);
    return c.json({ 
      success: true, 
      message: `Generated ${posts.length} posts for the day`,
      posts 
    }, 201);
  } catch (error) {
    console.error('Error generating daily posts:', error);
    return c.json({ error: 'Failed to generate daily posts' }, 500);
  }
});

/**
 * Preview content generation (without saving)
 */
marketing.post('/posts/preview', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ platform: 'linkedin' | 'facebook' }>();
    const { platform } = body;

    if (!platform || !['linkedin', 'facebook'].includes(platform)) {
      return c.json({ error: 'Platform must be linkedin or facebook' }, 400);
    }

    const theme = await selectThemeForPost(c.env.DB);
    const content = generatePostContent(platform, theme);
    const imagePrompt = generateImagePrompt(theme, platform);

    return c.json({
      success: true,
      preview: {
        theme: theme?.name || 'Default',
        content: content.content,
        hashtags: content.hashtags,
        cta_url: content.cta_url,
        image_prompt: imagePrompt,
      }
    });
  } catch (error) {
    console.error('Error previewing content:', error);
    return c.json({ error: 'Failed to preview content' }, 500);
  }
});

// ============================================
// POST MANAGEMENT
// ============================================

/**
 * List all posts with filtering and pagination
 */
marketing.get('/posts', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const platform = c.req.query('platform');
    const status = c.req.query('status');
    const page = parseInt(c.req.query('page') || '1');
    const pageSize = parseInt(c.req.query('page_size') || '20');

    const result = await listPosts(c.env.DB, { platform, status, page, pageSize });
    
    return c.json({
      success: true,
      posts: result.posts,
      pagination: {
        page,
        page_size: pageSize,
        total: result.total,
        total_pages: Math.ceil(result.total / pageSize),
      }
    });
  } catch (error) {
    console.error('Error listing posts:', error);
    return c.json({ error: 'Failed to list posts' }, 500);
  }
});

/**
 * Process scheduled posts (manual trigger)
 */
marketing.post('/posts/process', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const result = await processScheduledPosts(c.env.DB);
    return c.json({
      success: true,
      message: `Processed ${result.processed} posts: ${result.succeeded} succeeded, ${result.failed} failed`,
      ...result
    });
  } catch (error) {
    console.error('Error processing posts:', error);
    return c.json({ error: 'Failed to process posts' }, 500);
  }
});

// ============================================
// CONTENT THEMES
// ============================================

/**
 * Get all content themes
 */
marketing.get('/themes', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const themes = await getContentThemes(c.env.DB);
    return c.json({ success: true, themes });
  } catch (error) {
    console.error('Error getting themes:', error);
    return c.json({ error: 'Failed to get themes' }, 500);
  }
});

// ============================================
// SOCIAL MEDIA ACCOUNTS
// ============================================

/**
 * List connected social media accounts
 */
marketing.get('/accounts', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const platform = c.req.query('platform');
    const accounts = await getSocialMediaAccounts(c.env.DB, platform);
    
    // Hide sensitive tokens in response
    const safeAccounts = accounts.map(a => ({
      ...a,
      access_token: a.access_token ? '***configured***' : null,
    }));
    
    return c.json({ success: true, accounts: safeAccounts });
  } catch (error) {
    console.error('Error listing accounts:', error);
    return c.json({ error: 'Failed to list accounts' }, 500);
  }
});

/**
 * Add a social media account
 */
marketing.post('/accounts', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      platform: string;
      account_type: string;
      account_name: string;
      account_id?: string;
      access_token?: string;
      page_id?: string;
      daily_limit?: number;
    }>();

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO social_media_accounts (
        id, platform, account_type, account_name, account_id,
        access_token, page_id, daily_limit, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.platform,
      body.account_type,
      body.account_name,
      body.account_id || null,
      body.access_token || null,
      body.page_id || null,
      body.daily_limit || 5,
      timestamp,
      timestamp
    ).run();

    return c.json({
      success: true,
      message: 'Account added successfully',
      account: { id, ...body, access_token: body.access_token ? '***configured***' : null }
    }, 201);
  } catch (error) {
    console.error('Error adding account:', error);
    return c.json({ error: 'Failed to add account' }, 500);
  }
});

// ============================================
// INFLUENCER TRACKING
// ============================================

/**
 * List tracked influencers
 */
marketing.get('/influencers', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const platform = c.req.query('platform');
    const influencers = await getInfluencers(c.env.DB, platform);
    return c.json({ success: true, influencers });
  } catch (error) {
    console.error('Error listing influencers:', error);
    return c.json({ error: 'Failed to list influencers' }, 500);
  }
});

/**
 * Add an influencer to track
 */
marketing.post('/influencers', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      platform: string;
      username: string;
      display_name: string;
      profile_url: string;
      category: string;
      follower_count?: number;
    }>();

    const influencer = await addInfluencer(
      c.env.DB,
      body.platform,
      body.username,
      body.display_name,
      body.profile_url,
      body.category,
      body.follower_count || 0
    );

    return c.json({ success: true, influencer }, 201);
  } catch (error) {
    console.error('Error adding influencer:', error);
    return c.json({ error: 'Failed to add influencer' }, 500);
  }
});

// ============================================
// USER GROUPS
// ============================================

/**
 * List tracked user groups
 */
marketing.get('/groups', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const platform = c.req.query('platform');
    const groups = await getMarketingGroups(c.env.DB, platform);
    return c.json({ success: true, groups });
  } catch (error) {
    console.error('Error listing groups:', error);
    return c.json({ error: 'Failed to list groups' }, 500);
  }
});

/**
 * Add a user group to track
 */
marketing.post('/groups', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{
      platform: string;
      group_name: string;
      group_url: string;
      category: string;
      member_count?: number;
    }>();

    const group = await addMarketingGroup(
      c.env.DB,
      body.platform,
      body.group_name,
      body.group_url,
      body.category,
      body.member_count || 0
    );

    return c.json({ success: true, group }, 201);
  } catch (error) {
    console.error('Error adding group:', error);
    return c.json({ error: 'Failed to add group' }, 500);
  }
});

// ============================================
// ANALYTICS
// ============================================

/**
 * Get marketing analytics summary
 */
marketing.get('/analytics', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const days = parseInt(c.req.query('days') || '30');
    const analytics = await getMarketingAnalytics(c.env.DB, days);
    
    return c.json({
      success: true,
      period_days: days,
      analytics
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

/**
 * Get marketing dashboard summary
 */
marketing.get('/dashboard', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const analytics = await getMarketingAnalytics(c.env.DB, 30);
    const accounts = await getSocialMediaAccounts(c.env.DB);
    const themes = await getContentThemes(c.env.DB);
    const influencers = await getInfluencers(c.env.DB);
    const groups = await getMarketingGroups(c.env.DB);
    const { posts: recentPosts } = await listPosts(c.env.DB, { page: 1, pageSize: 5 });

    return c.json({
      success: true,
      dashboard: {
        analytics,
        connected_accounts: accounts.length,
        active_themes: themes.length,
        tracked_influencers: influencers.length,
        tracked_groups: groups.length,
        recent_posts: recentPosts,
      }
    });
  } catch (error) {
    console.error('Error getting dashboard:', error);
    return c.json({ error: 'Failed to get dashboard' }, 500);
  }
});

// ============================================
// AI IMAGE GENERATION (if Workers AI is available)
// ============================================

/**
 * Generate an image using Cloudflare Workers AI
 */
marketing.post('/images/generate', async (c) => {
  try {
    const companyId = await getSecureCompanyId(c);
    if (!companyId) return c.json({ error: 'Authentication required' }, 401);
    const body = await c.req.json<{ prompt: string }>();
    const { prompt } = body;

    if (!prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    // Check if Workers AI is available
    if (!c.env.AI) {
      return c.json({ 
        error: 'Workers AI not configured',
        message: 'Add AI binding to wrangler.toml to enable image generation'
      }, 501);
    }

    // Generate image using Stable Diffusion
    const response = await c.env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
      prompt: prompt,
    });

    // Return base64 image
    return c.json({
      success: true,
      image: response,
      prompt: prompt
    });
  } catch (error) {
    console.error('Error generating image:', error);
    return c.json({ error: 'Failed to generate image' }, 500);
  }
});

export default marketing;
