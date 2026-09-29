#!/usr/bin/env bash
set -euo pipefail

: "${SM_ORIGIN:=https://auth.loopo.cc}"
: "${SM_ADMIN_COOKIE:?请先登录 SM 并设置 SM_ADMIN_COOKIE}"
: "${BLOG_ORIGIN:=https://api.loopo.cc}"

# Accept either a complete Cookie header or the raw value copied from DevTools.
# SM uses Better Auth's secure cookie name behind HTTPS.
if [[ "$SM_ADMIN_COOKIE" != *"="* ]]; then
  SM_ADMIN_COOKIE="__Secure-better-auth.session_token=$SM_ADMIN_COOKIE"
fi

curl --fail-with-body -sS -X POST "$SM_ORIGIN/v1/admin/services" \
  -H "Cookie: $SM_ADMIN_COOKIE" -H "Origin: $SM_ORIGIN" -H "Content-Type: application/json" \
  --data "$(cat <<JSON
{"id":"blog","display_name":"Loopo Blog 评论","origin":"$BLOG_ORIGIN","redirect_uri":"$BLOG_ORIGIN/blog/auth/callback"}
JSON
)"
