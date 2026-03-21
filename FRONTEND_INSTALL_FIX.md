# 🔧 Frontend Installation Fix

## Problem
npm install is failing due to **OneDrive file locking** and permission issues.

## ✅ Solutions (Try in Order)

### Solution 1: Clean Install (RECOMMENDED)

**Step 1: Close everything that might lock files**
- Close VS Code
- Close any file explorer windows in the project folder
- Right-click OneDrive icon in system tray → Pause syncing (temporarily)

**Step 2: Clean and reinstall**
```powershell
cd frontend

# Clear npm cache
npm cache clean --force

# Remove old files (may take a minute if OneDrive is unlocking files)
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue

# Wait a moment for OneDrive to release locks
Start-Sleep -Seconds 5

# Install with --legacy-peer-deps to avoid conflicts
npm install --legacy-peer-deps
```

### Solution 2: Use Different Package Manager

Try using **pnpm** or **yarn** instead of npm (they handle OneDrive better):

```powershell
# Using pnpm (faster and better with OneDrive)
npm install -g pnpm
cd frontend
pnpm install
```

OR

```powershell
# Using yarn
npm install -g yarn
cd frontend
yarn install
```

### Solution 3: Exclude folder from OneDrive

**Option A: Move node_modules out of OneDrive scope**

Create a junction (symbolic link) to store node_modules outside OneDrive:

```powershell
cd frontend

# Create folder outside OneDrive
New-Item -ItemType Directory -Path "C:\dev\aria-node-modules" -Force

# Remove existing node_modules
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue

# Create junction
New-Item -ItemType Junction -Path "node_modules" -Target "C:\dev\aria-node-modules"

# Now install
npm install
```

**Option B: Exclude node_modules from OneDrive**

1. Right-click the OneDrive icon in system tray
2. Click "Settings"
3. Go to "Sync and backup" tab
4. Click "Advanced settings"
5. Add `node_modules` to excluded folders
6. Click "OK"
7. Wait for OneDrive to stop syncing
8. Try npm install again

### Solution 4: Install as Administrator

Run PowerShell as Administrator and try:

```powershell
cd "C:\Users\secha\OneDrive\Documents\AriaManagement\Aria---Document-Management-Employee\frontend"

npm cache clean --force
npm install --legacy-peer-deps
```

### Solution 5: Move Project Out of OneDrive (BEST LONG-TERM)

OneDrive and node_modules don't mix well. Consider moving the project:

```powershell
# Create local dev folder
New-Item -ItemType Directory -Path "C:\dev" -Force

# Copy project (this may take a while)
Copy-Item -Path "C:\Users\secha\OneDrive\Documents\AriaManagement\Aria---Document-Management-Employee" -Destination "C:\dev\Aria-ERP" -Recurse

# Work from new location
cd "C:\dev\Aria-ERP\frontend"
npm install
```

---

## 🚀 Quick Workaround (If stuck)

If nothing works, you can start the frontend without full installation:

```powershell
cd frontend

# Install only critical dependencies
npm install --no-optional --legacy-peer-deps

# Or install production dependencies only
npm install --omit=dev
```

---

## ⚡ After Installation Succeeds

Once you get npm install to complete:

```powershell
# Start the frontend
npm run dev
```

Then access: http://localhost:12001

---

## 📝 Prevention for Future

Add this to `.gitignore` (already should be there):
```
node_modules/
.vscode/
*.log
```

And in OneDrive settings, always exclude:
- `node_modules`
- `.git`
- `dist`
- `build`

---

## 🆘 Still Having Issues?

If OneDrive keeps locking files, **temporarily pause OneDrive sync**:

1. Right-click OneDrive icon in system tray
2. Click "Pause syncing"
3. Choose "24 hours"
4. Run npm install
5. Resume OneDrive after installation completes

---

## ✅ Recommended Approach

**For immediate development:**
```powershell
cd frontend
npm cache clean --force
npm install --legacy-peer-deps
```

**For long-term:**
Move the project to `C:\dev\` or another folder outside OneDrive.
