# Development Guide - Cellular Stock Management

## Common Issues & Solutions

### ❌ Cache Errors in Development

**Symptoms:**
```
Error: ENOENT: no such file or directory
Cannot find module '.next/server/middleware-manifest.json'
webpack.cache.PackFileCacheStrategy caching failed
```

**Root Cause:**
- Dev server was running when `.next` folder was deleted
- Webpack trying to use cache files that don't exist
- Next.js build manifests missing

**✅ Solutions:**

#### **Option 1: Proper Cache Clear (Recommended)**
```bash
# Stop the dev server (Ctrl+C)
npm run clear-cache
npm run dev
```

#### **Option 2: Clean Start**
```bash
# Stops server, clears cache, and starts fresh
npm run dev:clean
```

#### **Option 3: Manual Clean**
```bash
# Windows
rd /s /q .next
rd /s /q node_modules\.cache

# Linux/Mac
rm -rf .next
rm -rf node_modules/.cache

# Then start dev server
npm run dev
```

## Development Workflow

### **Starting Development**

```bash
cd frontend
npm run dev
```

**First time?** Install dependencies:
```bash
npm install
npm run dev
```

### **When You Get Cache Errors**

**❌ DON'T:**
- Delete `.next` folder while dev server is running
- Try to manually fix webpack cache files
- Restart server multiple times hoping it fixes itself

**✅ DO:**
```bash
# Step 1: Stop the server (Ctrl+C)
# Step 2: Clear cache
npm run clear-cache
# Step 3: Start fresh
npm run dev
```

## Cache Strategy

### **Development Mode (npm run dev)**
- Uses **memory cache** for webpack
- No filesystem cache issues
- Safe to delete `.next` folder when server is stopped
- Auto-rebuilds on code changes

### **Production Mode (npm run build)**
- Uses **filesystem cache** for optimization
- Generates versioned bundles
- Creates all necessary manifest files
- Optimized for deployment

## Scripts Reference

### **Development**
```bash
npm run dev          # Start development server
npm run dev:clean    # Clear cache and start dev server
npm run clear-cache  # Clear all caches (must stop server first)
```

### **Production**
```bash
npm run build        # Build for production (auto-updates version)
npm run start        # Start production server
npm run update-version  # Update version.json only
```

### **Maintenance**
```bash
npm run lint         # Check code quality
npm install          # Install/update dependencies
```

## Troubleshooting

### **Issue: Dev server won't start**

**Solution:**
```bash
# Check if port is in use
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Then restart
npm run dev
```

### **Issue: Changes not reflecting**

**Solution:**
```bash
# Hard refresh in browser
# Windows: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# Or clear browser cache
# Chrome: Ctrl + Shift + Delete
```

### **Issue: Module not found errors**

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run dev
```

### **Issue: Webpack errors after git pull**

**Solution:**
```bash
# Always clear cache after pulling changes
git pull origin main
npm install
npm run clear-cache
npm run dev
```

## Best Practices

### ✅ DO:
- Stop server before clearing cache
- Use `npm run clear-cache` instead of manual deletion
- Commit `.next` and `node_modules` to `.gitignore`
- Run `npm install` after `git pull`

### ❌ DON'T:
- Delete `.next` while server is running
- Edit files in `.next` directory
- Commit `.next` or `node_modules` to git
- Use `npm run build` for development

## Environment Files

### **Development (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### **Production (.env.production)**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

## Development Tools

### **Browser DevTools**
- **Network Tab**: Monitor API calls
- **Console**: Check for JavaScript errors
- **React DevTools**: Inspect component state

### **VS Code Extensions (Recommended)**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets

## Hot Reload

Next.js automatically reloads when you:
- ✅ Change `.tsx` or `.ts` files
- ✅ Change `.css` files
- ✅ Change components

You need to manually restart when you:
- 🔄 Change `next.config.js`
- 🔄 Change `.env` files
- 🔄 Install new dependencies

## Quick Reference

### **Common Commands**
| Command | When to Use |
|---------|-------------|
| `npm run dev` | Normal development |
| `npm run dev:clean` | After git pull or cache errors |
| `npm run clear-cache` | Fix cache issues (stop server first) |
| `npm run build` | Test production build |
| `Ctrl+C` | Stop dev server |
| `F5` | Refresh browser |
| `Ctrl+Shift+R` | Hard refresh browser |

### **File Locations**
| Path | Purpose |
|------|---------|
| `.next/` | Build output (don't edit) |
| `node_modules/` | Dependencies (don't edit) |
| `src/app/` | Application pages |
| `src/components/` | Reusable components |
| `src/lib/` | Utilities and API client |
| `public/` | Static assets |

## Summary

**Remember:**
1. ⛔ **NEVER** delete `.next` while dev server is running
2. ✅ **ALWAYS** stop server before clearing cache
3. 🔧 Use `npm run clear-cache` for safe cache clearing
4. 🚀 Use `npm run dev:clean` for quick clean start

Happy coding! 🎉
