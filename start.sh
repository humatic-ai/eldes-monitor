#!/bin/bash
# Start script that ensures correct Node.js version is used
export PATH="/opt/bitnami/node/bin:$PATH"
cd "$(dirname "$0")"
exec npm start
