# LaTeX Setup for Render

## Problem
The `/latex_to_pdf` endpoint returns a 500 error because `pdflatex` is not installed on Render's servers by default.

## Solution Options

### Option 1: Use Dockerfile (Recommended)

Render will automatically detect and use the `Dockerfile` in your repository. The Dockerfile installs LaTeX during the Docker image build.

**Steps:**
1. The `Dockerfile` is already in your repository
2. Render should automatically detect it on your next deploy
3. If not, go to Render Dashboard → Your Service → Settings → and ensure Docker is enabled

**Note:** The first build with Docker will take longer (~5-10 minutes) as it installs LaTeX packages. Subsequent builds will be faster due to Docker layer caching.

### Option 2: Manual Build Script (Alternative)

If Docker doesn't work for your setup, you can try using a build script:

1. Go to Render Dashboard → Your Service → Settings → Build & Deploy
2. Update the **Build Command** to:
   ```bash
   yarn && sudo apt-get update && sudo apt-get install -y --no-install-recommends texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-latex-recommended
   ```

**Note:** This may not work if Render's build environment doesn't allow `sudo` access.

### Option 3: Use a LaTeX Service (Alternative Architecture)

Instead of installing LaTeX on the server, you could:
- Use a third-party LaTeX-to-PDF API service
- Use a microservice specifically for LaTeX compilation
- Use a serverless function (AWS Lambda, etc.) for LaTeX compilation

## Verification

After deploying, test the LaTeX endpoint:
```bash
curl -X POST https://www.form-star.com/latex_to_pdf \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Test\\end{document}"}'
```

## Troubleshooting

1. **Docker build fails**: Check Render build logs for errors
2. **LaTeX still not found**: Verify `pdflatex` is in PATH by checking server logs
3. **Build timeout**: LaTeX installation can take 5-10 minutes; ensure Render's build timeout is sufficient
4. **Memory issues**: The Starter plan (512 MB) might be tight; consider upgrading if builds fail

## Current Configuration

- **Dockerfile**: ✅ Created (installs LaTeX)
- **Build Script**: ✅ Created (`install-latex.sh`) - alternative option
- **Render Config**: Use Dockerfile automatically or configure build command manually

