#!/bin/bash
cd "$(dirname "$0")/.."
npx http-server dist -p 3000 -s -c-1
