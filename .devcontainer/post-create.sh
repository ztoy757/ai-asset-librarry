#!/usr/bin/env bash
set -euo pipefail

(cd app && npm ci)
(cd e2e && npm ci && npx playwright install --with-deps chromium)

echo "準備完了：app で npm run dev:server と npm run dev:web を実行してください"
