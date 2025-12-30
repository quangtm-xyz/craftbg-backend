# 🚀 Deployment Guide - Backend (Render)

This guide will help you deploy the CraftBg.click backend API to Render.

## 📋 Prerequisites

- GitHub account with the backend repository
- Render account (sign up at [render.com](https://render.com))
- API keys ready:
  - Remove.bg API key
  - RapidAPI key (for Image Enhancer)

---

## 🎯 Method 1: Deploy via Render Dashboard (Recommended)

### Step 1: Create New Web Service

1. Go to [dashboard.render.com](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"**
4. Authorize Render to access your GitHub account
5. Select your `craftbg-backend` repository

### Step 2: Configure Web Service

Fill in the following settings:

**Name:** `craftbg-backend` (or your preferred name)

**Region:** Choose closest to your users (e.g., Singapore, Oregon)

**Branch:** `main`

**Root Directory:** `./` (leave blank)

**Runtime:** `Node`

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Instance Type:** 
- **Free** (for testing) - ⚠️ Spins down after 15 min of inactivity
- **Starter** ($7/month) - Recommended for production

### Step 3: Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add the following variables:

| Key | Value | Notes |
|-----|-------|-------|
| `PORT` | `5000` | Server port |
| `NODE_ENV` | `production` | Environment |
| `REMOVEBG_API_KEY` | `your-removebg-api-key` | From remove.bg |
| `RAPIDAPI_KEY` | `your-rapidapi-key` | From RapidAPI |
| `RAPIDAPI_HOST` | `ai-image-upscaler6.p.rapidapi.com` | Image enhancer host |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` | Your Vercel frontend URL |

> ⚠️ **Important:** Replace the values with your actual API keys and frontend URL

**Example:**
```env
PORT=5000
NODE_ENV=production
REMOVEBG_API_KEY=abc123xyz456
RAPIDAPI_KEY=xyz789abc123
RAPIDAPI_HOST=ai-image-upscaler6.p.rapidapi.com
CORS_ORIGIN=https://craftbg-frontend.vercel.app
```

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait 3-5 minutes for the first deployment
4. Once deployed, you'll get a URL like: `https://craftbg-backend.onrender.com`

### Step 5: Verify Deployment

Test the health endpoint:
```bash
curl https://craftbg-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-30T03:22:53.000Z"
}
```

---

## 🖥️ Method 2: Deploy via render.yaml (Infrastructure as Code)

### Step 1: Create render.yaml

Create `render.yaml` in your backend root:

```yaml
services:
  - type: web
    name: craftbg-backend
    runtime: node
    region: singapore
    plan: starter
    branch: main
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: PORT
        value: 5000
      - key: NODE_ENV
        value: production
      - key: REMOVEBG_API_KEY
        sync: false
      - key: RAPIDAPI_KEY
        sync: false
      - key: RAPIDAPI_HOST
        value: ai-image-upscaler6.p.rapidapi.com
      - key: CORS_ORIGIN
        sync: false
    healthCheckPath: /health
```

### Step 2: Push to GitHub

```bash
git add render.yaml
git commit -m "Add Render deployment config"
git push origin main
```

### Step 3: Deploy on Render

1. Go to Render Dashboard
2. Click **"New +"** → **"Blueprint"**
3. Select your repository
4. Render will detect `render.yaml`
5. Add the secret environment variables manually
6. Click **"Apply"**

---

## ⚙️ Backend Configuration

### package.json Scripts

Ensure these scripts exist:

```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

### TypeScript Configuration

Your `tsconfig.json` should have:

```json
{
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "module": "commonjs",
    "target": "ES2020",
    "esModuleInterop": true,
    "strict": true
  }
}
```

---

## 🔄 Automatic Deployments

Render automatically deploys when you push to GitHub:

- **Push to `main`** → Automatic deployment
- **Other branches** → No deployment (unless configured)

### Disable Auto-Deploy

1. Go to your service settings
2. Click **"Settings"** → **"Build & Deploy"**
3. Toggle **"Auto-Deploy"** off

---

## 🌍 Multiple Environments

### Production
```env
NODE_ENV=production
CORS_ORIGIN=https://craftbg.click
```

### Staging
Create a separate Render service:
- Branch: `staging`
- Name: `craftbg-backend-staging`
- CORS_ORIGIN: `https://craftbg-staging.vercel.app`

---

## 🐛 Troubleshooting

### Build Fails

**Error:** `Cannot find module 'typescript'`
```bash
# Solution: Add to package.json devDependencies
npm install --save-dev typescript @types/node
```

**Error:** `tsc: command not found`
```bash
# Solution: Update build command
npx tsc
```

### Service Won't Start

**Error:** `Error: listen EADDRINUSE`
- **Solution:** Render assigns PORT automatically, use `process.env.PORT`

**Error:** `Module not found`
- **Solution:** Check `dist/` folder is created during build
- Verify `start` command points to `dist/server.js`

### API Endpoints Return 404

- **Solution:** Check routes are properly registered
- Verify `app.listen()` is called
- Check logs in Render dashboard

### CORS Errors

**Error:** `Access-Control-Allow-Origin`
- **Solution:** Update `CORS_ORIGIN` env var with correct frontend URL
- Ensure CORS middleware is configured:

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
```

### Free Tier Spin Down

**Issue:** Service sleeps after 15 min inactivity

**Solutions:**
1. **Upgrade to Starter plan** ($7/month) - Recommended
2. **Use a ping service** - [cron-job.org](https://cron-job.org)
   - Ping `https://your-backend.onrender.com/health` every 10 minutes
3. **Accept the delay** - First request after sleep takes ~30 seconds

---

## 📊 Monitoring & Logs

### View Logs

1. Go to Render Dashboard
2. Select your service
3. Click **"Logs"** tab
4. View real-time logs

### Set Up Alerts

1. Go to **"Settings"** → **"Notifications"**
2. Add email or Slack webhook
3. Configure alerts for:
   - Deploy failures
   - Service crashes
   - High memory usage

### Health Checks

Render automatically monitors `/health` endpoint:

```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});
```

---

## 🔒 Security Best Practices

1. **Never commit `.env`** - Already in `.gitignore`
2. **Use environment variables** - For all API keys
3. **Enable HTTPS only** - Render does this by default
4. **Rate limiting** - Add express-rate-limit:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

5. **Helmet.js** - Add security headers:

```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

---

## 📈 Performance Optimization

### 1. Enable Compression

```bash
npm install compression
```

```typescript
import compression from 'compression';
app.use(compression());
```

### 2. Optimize File Uploads

```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### 3. Add Response Caching

For static responses:

```typescript
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
  next();
});
```

---

## 💰 Cost Optimization

### Free Tier Limits
- ✅ 750 hours/month (enough for 1 service)
- ✅ Automatic HTTPS
- ⚠️ Spins down after 15 min inactivity
- ⚠️ 512 MB RAM

### Starter Plan ($7/month)
- ✅ Always on
- ✅ 512 MB RAM
- ✅ No spin down
- ✅ Better for production

### Pro Plan ($25/month)
- ✅ 2 GB RAM
- ✅ Priority support
- ✅ Faster builds

---

## 🔄 Update Deployment

### Via Git Push
```bash
git add .
git commit -m "Update backend API"
git push origin main
```
Render auto-deploys in ~3-5 minutes.

### Manual Deploy

1. Go to Render Dashboard
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Rollback

1. Go to **"Events"** tab
2. Find previous successful deployment
3. Click **"Rollback to this version"**

---

## 🎯 Post-Deployment Checklist

- [ ] Backend deployed successfully
- [ ] All environment variables set
- [ ] Health check endpoint working
- [ ] Test `/api/remove-bg` endpoint
- [ ] Test `/api/enhance-image` endpoint
- [ ] CORS configured for frontend domain
- [ ] Logs showing no errors
- [ ] API keys working (remove.bg, RapidAPI)
- [ ] Frontend can connect to backend
- [ ] SSL/HTTPS working
- [ ] Set up monitoring/alerts (optional)

---

## 🧪 Testing Endpoints

### Health Check
```bash
curl https://craftbg-backend.onrender.com/health
```

### Remove Background (with test image)
```bash
curl -X POST https://craftbg-backend.onrender.com/api/remove-bg \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/test.jpg"}'
```

### Image Enhancer
```bash
curl -X POST https://craftbg-backend.onrender.com/api/enhance-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/test.jpg"}'
```

---

## 📞 Support

- **Render Docs:** [render.com/docs](https://render.com/docs)
- **Render Community:** [community.render.com](https://community.render.com)
- **GitHub Issues:** Report issues in your repository

---

## 🔗 Useful Links

- **Render Dashboard:** [dashboard.render.com](https://dashboard.render.com)
- **Remove.bg API:** [remove.bg/api](https://www.remove.bg/api)
- **RapidAPI:** [rapidapi.com](https://rapidapi.com)

---

## 🔗 Connect Frontend to Backend

After deployment, update your Vercel frontend environment variable:

```env
NEXT_PUBLIC_API_URL=https://craftbg-backend.onrender.com
```

Then redeploy frontend or it will auto-deploy on next git push.

---

**🎉 Your backend is now live on Render!**

API Base URL: `https://your-service.onrender.com`
