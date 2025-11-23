#!/bin/bash
# Setup script to configure local npm environment
# Source this file: source setup-env.sh
# Or add to your shell profile: echo 'source /home/bitnami/eldes/setup-env.sh' >> ~/.bashrc

export PATH="/opt/bitnami/node/bin:$PATH"
echo "✓ Node.js environment configured"
echo "  Node.js: $(node --version)"
echo "  Path: $(which node)"

