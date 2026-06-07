#!/bin/bash
# Build script for GAT Backend (Go)

set -e

if [ ! -d "backend" ]; then
    echo "Error: backend directory not found"
    exit 1
fi

cd backend

# Check if go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed"
    exit 1
fi

echo "Building GAT Backend..."

# Download dependencies
go mod tidy

# Build for current platform
CGO_ENABLED=1 go build -o gat-backend .

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo "Build successful! Output: gat-backend"

cd ..
