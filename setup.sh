#!/bin/bash

echo "Installing Please Wait...."

# To Ignore Error
export DEBIAN_FRONTEND=noninteractive

# It's Check For This Is Termux or Linux
if [ -n "$TERMUX_VERSION" ] || [[ "$PREFIX" == *com.termux* ]]; then
    
    # Setup For Termux
    apt update -y || true
    apt install nodejs -y || true
    npm init -y || true
    npm install express socket.io multer cors || true
    apt install cloudflared -y || true

else
    
    # Setup For Debian Linux
    sudo apt update -y || true
    sudo -E apt install nodejs wget -y || true
    npm init -y || true
    npm install express socket.io multer cors || true
    wget -q https://github.com/cloudflare/cloudflared/releases/download/2026.3.0/cloudflared-fips-linux-amd64.deb || true
    sudo dpkg -i cloudflared-fips-linux-amd64.deb || true

fi

echo "Installation done."
