# 🌐 ARIA WEBSITE - aria.vantax.co.za

**Status**: Ready to Deploy!  
**Tech Stack**: HTML5, CSS3 (No frameworks - lightweight!)  
**Theme**: Vanta X branding (Navy #1a2332 + Gold #FFB800)

---

## 📁 FILES

- `index.html` - Main landing page (242 lines)
- `styles.css` - Styling with Vanta X theme (534 lines)

---

## 🎨 DESIGN

### Colors (Vanta X Branding):
- Navy: `#1a2332`
- Gold: `#FFB800`  
- Dark BG: `#0f1419`
- Light Gray: `#f5f5f5`

### Sections:
1. **Hero** - "Stop Clicking. Start Asking."
2. **Problem** - Why traditional ERP is broken
3. **Features** - Natural language, SA compliance, 25 bots
4. **SA Compliance** - BBBEE + SARS payroll (unique!)
5. **Pricing** - Starter R15K, Growth R45K, Professional R135K
6. **CTA** - Contact form + beta offer

---

## 🚀 DEPLOYMENT OPTIONS

### Option A: GitHub Pages (Free!)

```bash
# 1. Create gh-pages branch
git checkout -b gh-pages

# 2. Copy website files to root
cp website/* .

# 3. Push to GitHub
git add index.html styles.css
git commit -m "Deploy Aria website"
git push origin gh-pages

# 4. Enable GitHub Pages in repo settings
# Settings → Pages → Source: gh-pages branch

# 5. Set custom domain: aria.vantax.co.za
# Add CNAME file
echo "aria.vantax.co.za" > CNAME
git add CNAME && git commit -m "Add custom domain" && git push

# 6. Configure DNS
# In your DNS provider (e.g., Cloudflare):
# Add CNAME record: aria.vantax.co.za → reshigan.github.io
```

### Option B: Netlify (Recommended!)

```bash
# 1. Sign up at netlify.com
# 2. Connect GitHub repo
# 3. Set build settings:
#    - Build command: (leave empty)
#    - Publish directory: website
# 4. Deploy!
# 5. Set custom domain: aria.vantax.co.za
# 6. SSL automatically enabled
```

### Option C: Vercel

```bash
# 1. Sign up at vercel.com
# 2. Import GitHub repo
# 3. Set root directory: website
# 4. Deploy!
# 5. Set custom domain: aria.vantax.co.za
```

### Option D: Traditional Web Hosting

```bash
# 1. Buy hosting (SiteGround, Bluehost, etc.)
# 2. Upload via FTP:
#    - Upload index.html to /public_html/
#    - Upload styles.css to /public_html/
# 3. Point domain aria.vantax.co.za to hosting
# 4. Done!
```

---

## 🔧 LOCAL TESTING

```bash
# Option 1: Python HTTP server
cd website
python3 -m http.server 8000
# Visit: http://localhost:8000

# Option 2: Node.js http-server
npm install -g http-server
cd website
http-server
# Visit: http://localhost:8080

# Option 3: Just open in browser
# Open index.html in Chrome/Firefox
```

---

## 📊 SEO OPTIMIZATION (Before Launch)

### 1. Meta Tags (Already Added)
- Title: "Aria - The World's First AI-Native ERP | Vanta X"
- Description: "No UI. No training. Just ask Aria..."
- Keywords: AI ERP, South Africa, BBBEE, SARS payroll

### 2. Add Before Launch:

```html
<!-- Add to <head> in index.html -->
<meta property="og:title" content="Aria - AI-Native ERP for South Africa">
<meta property="og:description" content="The world's first AI-native ERP. No UI. No training. Just ask Aria.">
<meta property="og:image" content="https://aria.vantax.co.za/og-image.png">
<meta property="og:url" content="https://aria.vantax.co.za">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Aria - AI-Native ERP">
<meta name="twitter:description" content="Stop clicking. Start asking. Built for South Africa.">
<meta name="twitter:image" content="https://aria.vantax.co.za/og-image.png">

<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- Favicon -->
<link rel="icon" type="image/png" href="favicon.png">
```

### 3. Create Images Needed:
- `og-image.png` (1200x630px) - For social sharing
- `favicon.png` (32x32px) - Browser tab icon
- `logo.png` - Aria logo (transparent PNG)

---

## 📧 CONTACT FORM INTEGRATION

The contact form currently doesn't submit. Add backend:

### Option A: Formspree (Easiest!)

```html
<!-- Replace form tag in index.html -->
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" class="contact-form">
  <!-- Keep existing inputs -->
</form>
```

### Option B: Netlify Forms (If using Netlify)

```html
<!-- Add to form tag -->
<form name="contact" method="POST" data-netlify="true" class="contact-form">
  <!-- Keep existing inputs -->
</form>
```

### Option C: Custom Backend

```javascript
// Add to new file: script.js
document.querySelector('.contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);
  
  // Send to your backend
  await fetch('/api/contact', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data)
  });
  
  alert('Thanks! We\'ll be in touch soon.');
});
```

---

## 🎯 LAUNCH CHECKLIST

Before going live:

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile devices
- [ ] Add Google Analytics
- [ ] Add favicon
- [ ] Add og-image for social sharing
- [ ] Set up contact form backend
- [ ] Configure custom domain (aria.vantax.co.za)
- [ ] Enable SSL (HTTPS)
- [ ] Test contact form submission
- [ ] Add robots.txt
- [ ] Add sitemap.xml
- [ ] Submit to Google Search Console

---

## 📱 RESPONSIVE DESIGN

Already included! Website works on:
- Desktop (1200px+)
- Tablet (768px - 1200px)
- Mobile (< 768px)

---

## 🚀 POST-LAUNCH

1. **Share on LinkedIn** (Use marketing/LINKEDIN_CAMPAIGN.md)
2. **Email existing contacts**
3. **Submit to directories** (Product Hunt, BetaList)
4. **Start Google Ads** (Target: "ERP South Africa")
5. **Track metrics** (Google Analytics)

---

## 📊 SUCCESS METRICS (First 30 Days)

- Website visits: 5,000+
- Demo requests: 100+
- Email signups: 500+
- LinkedIn clicks: 2,000+

---

**LET'S LAUNCH! 🚀**

aria.vantax.co.za

© 2025 Vanta X Holdings
