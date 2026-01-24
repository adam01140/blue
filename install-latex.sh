#!/bin/bash
# Script to install LaTeX on Render servers
# This can be used as a Pre-Deploy Command in Render settings

set -e

echo "Installing LaTeX packages..."

# Update package list
apt-get update

# Install LaTeX with minimal packages (to reduce build time)
apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-latex-recommended

# Clean up to reduce image size
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "LaTeX installation complete!"
pdflatex --version

