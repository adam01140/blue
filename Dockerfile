# Use Node.js LTS as base image
FROM node:18-slim

# Install LaTeX and required packages
# Using texlive-latex-base for basic LaTeX support
# texlive-latex-extra for additional packages
# texlive-fonts-recommended for fonts
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-latex-recommended \
    && rm -rf /var/lib/apt/lists/*

# Verify pdflatex installation
RUN pdflatex --version || (echo "ERROR: pdflatex installation failed!" && exit 1)

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install --production

# Copy application files
COPY . .

# Expose port (Render will set PORT env var, default to 10000)
EXPOSE ${PORT:-10000}

# Start the application
CMD ["node", "server.js"]

