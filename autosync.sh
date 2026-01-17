#!/bin/bash

echo "Starting auto-sync... Press Ctrl+C to stop."

while true; do
  
  if [[ `git status --porcelain` ]]; then
    echo "Changes detected. Pushing to GitHub..."
    git add .
    git commit -m "Auto-update: $(date)"
    git push origin main
    echo "Pushed successfully!"
  fi
done
