#!/bin/bash
cd "$(dirname "$0")/.."
cp -f dist/schach9x9/index.schach9x9.html dist/schach9x9/index.html 2>/dev/null || true
npx http-server dist/schach9x9 -p 3000 -s -c-1
