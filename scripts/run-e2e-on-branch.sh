#!/usr/bin/env bash
#
# Run the full scheduler verification against a NON PRODUCTION database:
# migrate, create a scheduling account, seed a large season, run the end to end
# suite, then tear the seeded data down again.
#
# The database URL is read from .env.e2e.local, which is covered by the existing
# .gitignore rule for .env*.local, so the credential never reaches git and never
# has to be pasted into a chat window.
#
#   1. Supabase dashboard, the scheduler-e2e project
#      Settings, then Database, then Connection string, URI
#   2. Put it in .env.e2e.local as:
#        DATABASE_URL=postgresql://...
#   3. bash scripts/run-e2e-on-branch.sh
#
# SAFETY: this script refuses to run against the production project ref. That
# check is the whole reason it exists as a script rather than a list of commands
# someone pastes at midnight during a season.

set -euo pipefail

PROD_REF="pdwautioosstdgbbblxl"
ENV_FILE=".env.e2e.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE."
  echo "Put the branch connection string in it as DATABASE_URL=postgresql://..."
  exit 1
fi

# Read DATABASE_URL from the file without echoing it.
BRANCH_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"

if [[ -z "$BRANCH_URL" ]]; then
  echo "No DATABASE_URL line found in $ENV_FILE."
  exit 1
fi

if [[ "$BRANCH_URL" == *"$PROD_REF"* ]]; then
  echo "REFUSING TO RUN."
  echo "The DATABASE_URL in $ENV_FILE points at the PRODUCTION project ($PROD_REF)."
  echo "This script seeds thousands of synthetic games and records forfeits."
  echo "Point it at the branch database instead."
  exit 1
fi

# Show where we are going, without the credentials.
SAFE_HOST="$(printf '%s' "$BRANCH_URL" | sed -E 's#://[^@]*@#://***@#')"
echo "=============================================================="
echo " Scheduler verification run"
echo " target: $SAFE_HOST"
echo "=============================================================="
echo ""

export DATABASE_URL="$BRANCH_URL"

E2E_EMAIL="${E2E_ADMIN_EMAIL:-e2e-scheduler@example.invalid}"
E2E_PASSWORD="${E2E_ADMIN_PASSWORD:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"

echo "--- 1 of 6: applying migrations -------------------------------"
npm run migrate:env

echo ""
echo "--- 2 of 6: creating the scheduling account -------------------"
CREATE_ADMIN_EMAIL="$E2E_EMAIL" \
CREATE_ADMIN_PASSWORD="$E2E_PASSWORD" \
CREATE_ADMIN_NAME="End To End Scheduler" \
  npm run create-admin

echo ""
echo "--- 3 of 6: seeding a large season ----------------------------"
SCALE_SEED_ALLOW=1 npm run seed:scale

echo ""
echo "--- 4 of 6: starting the app ----------------------------------"
npm run build
npm run start &
APP_PID=$!
# Stop the app whatever happens next.
trap 'kill "$APP_PID" 2>/dev/null || true' EXIT

echo "waiting for the app to answer"
for _ in $(seq 1 60); do
  if curl -sf http://localhost:3000/ >/dev/null 2>&1; then break; fi
  sleep 2
done

echo ""
echo "--- 5 of 6: running the end to end suite ----------------------"
set +e
E2E_ADMIN_EMAIL="$E2E_EMAIL" \
E2E_ADMIN_PASSWORD="$E2E_PASSWORD" \
PW_WEBSERVER="true" \
PW_BASE_URL="http://localhost:3000" \
  npx playwright test e2e/scheduler.spec.ts --reporter=list
E2E_STATUS=$?
set -e

echo ""
echo "--- 6 of 6: removing the seeded data --------------------------"
SCALE_SEED_ALLOW=1 npm run seed:scale -- --clean

echo ""
if [[ $E2E_STATUS -eq 0 ]]; then
  echo "PASS. The end to end suite is green against the branch database."
else
  echo "FAIL. The end to end suite reported failures (exit $E2E_STATUS). The seeded data has been removed."
fi
exit $E2E_STATUS
