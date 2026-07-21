#!/bin/bash
set -e

npm install -D playwright
npx playwright install chromium

# Kill any existing dev server
kill -9 $(lsof -t -i:3000) || true

# Start dev server
npm run dev > dev.log 2>&1 &
DEV_PID=$!

# Wait for server to be ready
echo "Waiting for dev server..."
sleep 8

# Run playwright
node test-screenshot.mjs

# Kill dev server
kill -9 $DEV_PID
