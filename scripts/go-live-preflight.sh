#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATUS=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }
blue() { printf "\033[34m%s\033[0m\n" "$1"; }

run_step() {
  local name="$1"
  shift
  blue "==> $name"
  if "$@"; then
    green "PASS: $name"
  else
    red "FAIL: $name"
    STATUS=1
  fi
  echo
}

audit_zero() {
  local dir="$1"
  local tmp
  tmp="$(mktemp)"
  (cd "$dir" && npm audit --json >"$tmp") || true
  local state
  state="$(node -e "const fs=require('fs');let j={};try{j=JSON.parse(fs.readFileSync(process.argv[1],'utf8'))}catch{process.stdout.write('parse_error');process.exit(0)};if(j.metadata&&j.metadata.vulnerabilities){process.stdout.write(String(j.metadata.vulnerabilities.total??0));}else if(j.message){process.stdout.write('audit_error:'+j.message);}else{process.stdout.write('unknown_error');}" "$tmp")"
  rm -f "$tmp"
  if [[ "$state" == "0" ]]; then
    return 0
  fi
  if [[ "$state" == audit_error:* ]] || [[ "$state" == "parse_error" ]] || [[ "$state" == "unknown_error" ]]; then
    red "  Audit could not be completed for $dir: $state"
  else
    red "  Vulnerabilities found in $dir: $state"
  fi
  return 1
}

check_no_bad_domain() {
  ! rg -n "www\\.safe-node\\.vercel\\.app" \
    "$ROOT_DIR/backend" \
    "$ROOT_DIR/frontend" \
    "$ROOT_DIR/.github" \
    "$ROOT_DIR"/*.txt \
    -S >/dev/null
}

check_rls_patch_present() {
  rg -n "password_reset_tokens" "$ROOT_DIR/backend/prisma/enable-rls.sql" -S >/dev/null &&
    [[ -f "$ROOT_DIR/backend/prisma/fix-password-reset-tokens-rls.sql" ]]
}

check_backend_tests() {
  if [[ -z "${DATABASE_URL:-}" ]]; then
    yellow "SKIP: backend tests (DATABASE_URL not set)"
    return 0
  fi
  (cd "$ROOT_DIR/backend" && npm run test -- --runInBand)
}

blue "SafeNode Go-Live Preflight"
echo "Repository: $ROOT_DIR"
echo

run_step "Backend npm audit == 0" audit_zero "$ROOT_DIR/backend"
run_step "Frontend npm audit == 0" audit_zero "$ROOT_DIR/frontend"
run_step "Mobile npm audit == 0" audit_zero "$ROOT_DIR/mobile"

run_step "Backend build" bash -lc "cd \"$ROOT_DIR/backend\" && npm run build"
run_step "Frontend build" bash -lc "cd \"$ROOT_DIR/frontend\" && npm run build"

run_step "Backend lint (non-blocking warnings allowed)" bash -lc "cd \"$ROOT_DIR/backend\" && npm run lint"
run_step "Frontend lint (non-blocking warnings allowed)" bash -lc "cd \"$ROOT_DIR/frontend\" && npm run lint"

run_step "Backend tests (requires DATABASE_URL)" check_backend_tests
run_step "Frontend tests" bash -lc "cd \"$ROOT_DIR/frontend\" && npm run test -- --run"

run_step "No invalid Vercel www subdomain references" check_no_bad_domain
run_step "RLS patch files for password_reset_tokens present" check_rls_patch_present

blue "Manual Gate Reminders"
echo "- Run Supabase SQL patch: backend/prisma/fix-password-reset-tokens-rls.sql"
echo "- Confirm Security Advisor is clean for password_reset_tokens"
echo "- Verify production env vars on Railway and Vercel"
echo "- Run API smoke test against production with BASE_URL"
echo

if [[ "$STATUS" -eq 0 ]]; then
  green "Preflight completed with no blocking failures."
else
  red "Preflight completed with blocking failures."
fi

exit "$STATUS"
