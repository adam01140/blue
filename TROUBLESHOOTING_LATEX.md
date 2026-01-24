# Troubleshooting LaTeX on Render

## Current Issue
After redeploying, you're still getting a 500 error. The logs show LaTeX processing works but stops before executing `pdflatex`.

## Diagnosis Steps

### 1. Check if Dockerfile is Being Used

**In Render Dashboard:**
1. Go to your service → **Logs** tab
2. Look for build logs that say "Building Docker image..." or "Step 1/7 : FROM node:18-slim"
3. If you see "Installing dependencies" or "yarn" but NO Docker build steps, Render is NOT using the Dockerfile

**Solution if Dockerfile is NOT being used:**
- Render might be using the build command instead of Docker
- Go to **Settings** → **Build & Deploy**
- Check if there's a **Docker** option or if it's set to use build commands
- You may need to explicitly enable Docker or remove the build command

### 2. Check Health Endpoint

After deploying, visit:
```
https://www.form-star.com/healthz
```

This will tell you:
- If `pdflatex` is installed
- What version is installed
- If there are any errors

**Expected response if working:**
```json
{
  "status": "healthy",
  "latex": "installed",
  "version": "pdfTeX 3.141592653..."
}
```

**If not working:**
```json
{
  "status": "unhealthy",
  "latex": "not_installed",
  "error": "...",
  "message": "pdflatex is not available. Dockerfile may not be in use."
}
```

### 3. Check Server Startup Logs

Look for these log messages when the server starts:
```
[STARTUP] Checking LaTeX installation...
[STARTUP] pdflatex found at: /usr/bin/pdflatex
[STARTUP] pdflatex version (first 200 chars): ...
```

If you see:
```
[STARTUP] ========== CRITICAL ERROR ==========
[STARTUP] pdflatex is NOT installed or not in PATH!
```

Then LaTeX is NOT installed.

### 4. Verify Dockerfile is in Repository

Make sure `Dockerfile` is committed and pushed:
```bash
git ls-files | grep Dockerfile
# Should show: Dockerfile
```

### 5. Force Render to Use Docker

**Option A: Remove Build Command**
1. Go to **Settings** → **Build & Deploy**
2. Clear the **Build Command** field (leave it empty)
3. Render should automatically detect and use Dockerfile

**Option B: Explicitly Set Docker**
1. Some Render configurations have a "Docker" toggle
2. Enable it if available

**Option C: Use render.yaml**
Create/update `render.yaml`:
```yaml
services:
  - type: web
    name: Form-Star
    dockerfilePath: ./Dockerfile
    dockerContext: .
```

## Quick Fix: Manual Build Script (If Docker Doesn't Work)

If Docker doesn't work, you can try installing LaTeX via build script:

1. Go to **Settings** → **Build & Deploy**
2. Update **Build Command** to:
```bash
yarn && apt-get update && apt-get install -y --no-install-recommends texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-latex-recommended
```

**Note:** This may not work if Render's build environment doesn't allow `apt-get`.

## What We Added

1. ✅ **Startup check** - Verifies LaTeX on server start
2. ✅ **Health endpoint** - `/healthz` to check LaTeX status
3. ✅ **Better error messages** - More detailed error logging
4. ✅ **Pre-execution check** - Verifies `pdflatex` exists before trying to use it

## Next Steps

1. **Check the health endpoint** - Visit `https://www.form-star.com/healthz`
2. **Check startup logs** - Look for LaTeX installation messages
3. **Verify Dockerfile is being used** - Check build logs for Docker steps
4. **If Dockerfile isn't being used** - Follow the "Force Render to Use Docker" steps above

## Expected Behavior After Fix

When working correctly:
- Server starts and logs: `[STARTUP] pdflatex found at: /usr/bin/pdflatex`
- Health endpoint returns: `{"status": "healthy", "latex": "installed"}`
- LaTeX-to-PDF requests succeed with 200 status
- PDFs are generated successfully

