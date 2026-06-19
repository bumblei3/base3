#!/bin/bash
# E2E Test Runner — starts server, runs tests, cleans up
set -e

cd /home/tobber/base3

# Build
npm run build 2>&1 | tail -5

# Copy index.html
cp dist/trischach/index.trischach.html dist/trischach/index.html

# Start server in background
npx http-server dist/trischach -p 4173 -s -c-1 &
SERVER_PID=$!
sleep 3

# Verify server
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:4173/ | grep -q "200"; then
  echo "Server failed to start"
  kill $SERVER_PID 2>/dev/null
  exit 1
fi

echo "Server started on port 4173 (PID: $SERVER_PID)"

# Run ALL e2e tests
npx playwright test tests-e2e/ --project=trischach-e2e --reporter=list
TEST_EXIT=$?

# Cleanup
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

exit $TEST_EXIT
