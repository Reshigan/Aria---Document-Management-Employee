#!/bin/bash

# Dev to Main Workflow Script
# This script handles the workflow from dev branch to main branch

set -e

echo "🔄 Starting dev-to-main workflow..."

# Check if we're on dev branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "dev" ]; then
    echo "❌ Error: You must be on the dev branch to run this workflow"
    echo "Current branch: $current_branch"
    exit 1
fi

# Ensure dev branch is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash your changes."
    git status
    exit 1
fi

# Push dev branch changes
echo "📤 Pushing dev branch changes..."
git push origin dev

# Switch to main branch
echo "🔄 Switching to main branch..."
git checkout main

# Pull latest main branch changes
echo "📥 Pulling latest main branch changes..."
git pull origin main

# Merge dev into main
echo "🔀 Merging dev into main..."
git merge dev --no-ff -m "Merge dev branch into main

Co-authored-by: openhands <openhands@all-hands.dev>"

# Push main branch
echo "📤 Pushing main branch..."
git push origin main

# Switch back to dev branch
echo "🔄 Switching back to dev branch..."
git checkout dev

# Merge main back into dev to keep them in sync
echo "🔄 Syncing dev with main..."
git merge main --no-ff -m "Sync dev with main after merge

Co-authored-by: openhands <openhands@all-hands.dev>"

git push origin dev

echo "✅ Dev-to-main workflow completed successfully!"
echo "📋 Summary:"
echo "   - Dev branch changes pushed"
echo "   - Dev merged into main"
echo "   - Main branch pushed"
echo "   - Dev branch synced with main"