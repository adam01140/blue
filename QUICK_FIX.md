# Quick Fix: LaTeX on Render

## What Was Done

1. ✅ Created `Dockerfile` - Installs LaTeX during Docker build
2. ✅ Created `.dockerignore` - Optimizes Docker build
3. ✅ Created `install-latex.sh` - Alternative build script (if Docker doesn't work)

## How to Deploy

### Automatic (Recommended)
1. **Commit and push** the new files to your repository:
   ```bash
   git add Dockerfile .dockerignore install-latex.sh
   git commit -m "Add LaTeX support for Render deployment"
   git push
   ```

2. **Render will automatically detect the Dockerfile** and use it for builds

3. **Wait for the build to complete** (~5-10 minutes first time due to LaTeX installation)

### Manual Configuration (If Docker doesn't auto-detect)

1. Go to **Render Dashboard** → **Form-Star** service → **Settings**
2. Under **Build & Deploy**, ensure Docker is enabled
3. The Dockerfile should be automatically detected

## What Happens

- **First build**: Takes 5-10 minutes (installs LaTeX packages)
- **Subsequent builds**: Faster (~2-3 minutes) due to Docker caching
- **Result**: `pdflatex` will be available in your container

## Testing

After deployment, test the endpoint:
```bash
curl -X POST https://www.form-star.com/latex_to_pdf \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Hello World\\end{document}"}'
```

## If It Still Doesn't Work

1. Check Render build logs for errors
2. Verify Dockerfile is being used (check build logs for "Building Docker image...")
3. Check server logs for `pdflatex` command errors
4. Ensure your Render plan has enough memory (512MB should work, but 1GB+ is better)

## Files Added

- `Dockerfile` - Docker configuration with LaTeX
- `.dockerignore` - Excludes unnecessary files from Docker build
- `install-latex.sh` - Alternative installation script
- `RENDER_LATEX_SETUP.md` - Detailed documentation

