#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building client..."
npm run build

echo "Restarting server..."
pm2 restart timekeep

echo "Done. TimeKeep is live."
