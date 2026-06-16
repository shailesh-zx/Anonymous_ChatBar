#!/bin/bash

# Color codes
GREEN='\033[0;32m'
NC='\033[0m' # No Color (Reset to default)

# Clear the terminal for a clean output
clear
echo "Starting Cloudflared Tunnel..."

# 1. Run Cloudflared in the background and redirect output to a log file
cloudflared tunnel --url http://localhost:4747 2> cloudflared.log &
CLOUDFLARED_PID=$!

# Clean up background process and log file on script exit (Ctrl+C)
trap "kill $CLOUDFLARED_PID 2>/dev/null; rm -f cloudflared.log" EXIT

# 2. Wait for the link to be generated (Cloudflared takes a few seconds)
LINK=""
while [ -z "$LINK" ]; do
    sleep 1
    # Extract only the trycloudflare link from the log file
    LINK=$(grep -o 'https://[-0-9a-zA-Z]*\.trycloudflare\.com' cloudflared.log | head -n 1)
done

# Clear terminal to remove the "Starting..." message
clear

# 3. Print the success message in green followed by the link
echo -e "${GREEN}This is Your Link${NC}"
echo "$LINK"
echo "------------------------------------------------"

# 4. Run the Node.js server (its output will appear directly on the terminal)
node server.js
