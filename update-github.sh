#!/bin/bash
# Script to update GitHub repository description and topics using GitHub CLI

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Or manually update via GitHub web interface:"
    echo "1. Go to: https://github.com/humatic-ai/eldes-monitor/settings"
    echo "2. Update description and topics"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

echo "Updating GitHub repository description and topics..."

# Update description
gh repo edit humatic-ai/eldes-monitor \
  --description "Fork of augustas2/eldes and tanelvakker/eldes-cloud-api - Modern Next.js ELDES monitoring"

# Add topics
gh repo edit humatic-ai/eldes-monitor \
  --add-topic "fork-of:augustas2/eldes" \
  --add-topic "fork-of:tanelvakker/eldes-cloud-api" \
  --add-topic "eldes" \
  --add-topic "esim364" \
  --add-topic "monitoring" \
  --add-topic "nextjs" \
  --add-topic "iot" \
  --add-topic "security" \
  --add-topic "alarm" \
  --add-topic "typescript"

echo "✅ Repository updated successfully!"
echo "Visit: https://github.com/humatic-ai/eldes-monitor"
