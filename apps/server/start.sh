#!/bin/sh
echo "--- STARTING DEPLOYMENT SCRIPT ---"

# 1. Run migrations
echo "Running Prisma migrations..."
npx prisma migrate deploy --schema apps/server/prisma/schema.prisma
if [ $? -ne 0 ]; then
  echo "ERROR: Prisma migration failed!"
  # Don't exit yet, let the server try to start to see its error
fi

# 2. Start the server
echo "Starting Node server..."
exec node apps/server/dist/index.js
