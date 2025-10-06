#!/bin/bash

# Check for SSLS.pem and deploy to new server
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

print_status "🔍 Checking for SSLS.pem file..."

# Check if SSLS.pem exists in various locations
SSLS_LOCATIONS=(
    "/workspace/project/SSLS.pem"
    "/workspace/SSLS.pem"
    "./SSLS.pem"
    "/workspace/project/Aria---Document-Management-Employee/SSLS.pem"
)

SSLS_FOUND=""
for location in "${SSLS_LOCATIONS[@]}"; do
    if [ -f "$location" ]; then
        SSLS_FOUND="$location"
        print_success "Found SSLS.pem at: $location"
        break
    fi
done

if [ -z "$SSLS_FOUND" ]; then
    print_error "SSLS.pem file not found!"
    print_status "Please ensure the SSLS.pem file is uploaded to one of these locations:"
    for location in "${SSLS_LOCATIONS[@]}"; do
        echo "  - $location"
    done
    print_status "Once the file is available, run this script again or execute:"
    print_status "./deploy-to-new-server.sh"
    exit 1
fi

# Copy SSLS.pem to current directory if not already there
if [ "$SSLS_FOUND" != "./SSLS.pem" ]; then
    print_status "Copying SSLS.pem to current directory..."
    cp "$SSLS_FOUND" ./SSLS.pem
fi

# Set proper permissions
chmod 600 ./SSLS.pem
print_success "Set proper permissions for SSLS.pem"

# Test SSH connection
print_status "Testing SSH connection to 35.177.226.170..."
if ssh -i "SSLS.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@35.177.226.170 "echo 'SSH connection successful'" 2>/dev/null; then
    print_success "SSH connection test passed!"
    
    print_status "🚀 Starting deployment..."
    ./deploy-to-new-server.sh
else
    print_error "SSH connection failed!"
    print_status "Please check:"
    echo "  1. The SSLS.pem file is correct for server 35.177.226.170"
    echo "  2. The server is running and accessible"
    echo "  3. Port 22 (SSH) is open on the server"
    echo "  4. The ubuntu user exists on the server"
    exit 1
fi