#!/bin/bash

# Quick verification script to check if the development environment is properly set up

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

echo "🔍 Full Self Coding Development Environment Verification"
echo "=================================================="

# Track results
PASS=0
FAIL=0
WARN=0

# Check Node.js
print_status "Checking Node.js..."
if check_command "node"; then
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION is installed"

    # Check if version is adequate (>= 16.x)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -ge 16 ]; then
        print_success "Node.js version is adequate ($MAJOR_VERSION >= 16)"
        ((PASS++))
    else
        print_warning "Node.js version $NODE_VERSION is outdated (recommended: >= 16.x)"
        ((WARN++))
    fi
else
    print_error "Node.js is not installed"
    ((FAIL++))
fi

# Check npm
print_status "Checking npm..."
if check_command "npm"; then
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION is installed"
    ((PASS++))
else
    print_error "npm is not installed"
    ((FAIL++))
fi

# Check Bun.js
print_status "Checking Bun.js..."
if check_command "bun"; then
    BUN_VERSION=$(bun --version)
    print_success "Bun.js $BUN_VERSION is installed"
    ((PASS++))
else
    print_error "Bun.js is not installed"
    ((FAIL++))
fi

# Check Docker
print_status "Checking Docker..."
if check_command "docker"; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker $DOCKER_VERSION is installed"

    # Check if Docker daemon is running
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
        ((PASS++))

        # Check if we can run containers
        print_status "Testing Docker container execution..."
        if docker run --rm --quiet node:latest node --version &> /dev/null; then
            print_success "Docker container execution is working"
            ((PASS++))
        else
            print_warning "Docker container execution test failed"
            ((WARN++))
        fi
    else
        print_warning "Docker is installed but daemon is not running"
        print_status "Start Docker with: sudo systemctl start docker"
        ((WARN++))
    fi
else
    print_error "Docker is not installed"
    ((FAIL++))
fi

# Check if Docker image is available
print_status "Checking required Docker images..."
if check_command "docker" && docker info &> /dev/null; then
    if docker images node:latest --format "table {{.Repository}}:{{.Tag}}" | grep -q "node:latest"; then
        print_success "node:latest Docker image is available"
        ((PASS++))
    else
        print_warning "node:latest Docker image is not available"
        print_status "Pull it with: docker pull node:latest"
        ((WARN++))
    fi
fi

# Check project structure
print_status "Checking project structure..."
if [ -d "../src" ] && [ -d "../test" ]; then
    print_success "Project structure is correct"
    ((PASS++))
else
    print_warning "Not in the correct project directory"
    print_status "Make sure you're running this from the script/ directory"
    ((WARN++))
fi

# Summary
echo "=================================================="
print_status "Verification Summary:"
echo "  ✅ Pass: $PASS"
echo "  ⚠️  Warning: $WARN"
echo "  ❌ Fail: $FAIL"

TOTAL=$((PASS + WARN + FAIL))

if [ $FAIL -eq 0 ]; then
    if [ $WARN -eq 0 ]; then
        print_success "🎉 All checks passed! Your development environment is ready."
        echo ""
        print_status "Next steps:"
        echo "  1. cd .."
        echo "  2. bun install"
        echo "  3. bun test"
        echo ""
        echo "Happy coding! 🚀"
    else
        print_warning "⚠️  Environment is mostly ready with $WARN warnings."
        print_status "Consider addressing the warnings for optimal experience."
    fi
    exit 0
else
    print_error "❌ $FAIL critical issues found. Please fix these before continuing."
    echo ""
    print_status "To set up your environment, run:"
    echo "  ./setup-dev-env.sh"
    exit 1
fi