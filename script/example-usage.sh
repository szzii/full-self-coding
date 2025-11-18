#!/bin/bash

# Example usage script demonstrating the Full Self Coding setup
# This script shows how to use the development environment after setup

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

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

echo "🚀 Full Self Coding - Example Usage"
echo "======================================"

# 1. Show Node.js usage
print_header "Node.js and npm Usage"
print_status "Node.js version:"
node --version

print_status "npm version:"
npm --version

print_status "Installing a package with npm (example):"
echo "npm install -g typescript@latest"

# 2. Show Bun.js usage
print_header "Bun.js Usage"
print_status "Bun.js version:"
bun --version

print_status "Bun package manager (example):"
echo "bun add lodash"

# 3. Show Docker usage
print_header "Docker Usage"
print_status "Docker version:"
docker --version

print_status "Docker info:"
docker info --format "Server Version: {{.ServerVersion}}, Running: {{.ServerVersion}}"

print_status "Running a quick test container:"
docker run --rm node:latest node --version

# 4. Show project-specific commands
print_header "Full Self Coding Project Commands"
print_status "From the project root, you can run:"
echo "  bun install          # Install dependencies"
echo "  bun run build        # Build the project"
echo "  bun test             # Run tests"
echo "  node dist/main.js --help  # Run the application"

# 5. Show example Docker workflow
print_header "Example Docker Workflow"
print_status "Creating a test container:"
echo "docker run -d --name test-container node:latest sleep infinity"

print_status "Running commands in container:"
echo "docker exec test-container node --version"
echo "docker exec test-container npm --version"

print_status "Cleaning up:"
echo "docker stop test-container && docker rm test-container"

# 6. Show development workflow
print_header "Development Workflow Example"
print_status "1. Make changes to source code"
echo "   # Edit files in src/ directory"

print_status "2. Run tests to verify changes"
echo "   bun test"

print_status "3. Build the application"
echo "   bun run build"

print_status "4. Test the built application"
echo "   node dist/main.js --help"

print_status "5. Run integration tests"
echo "   bun test test/dockerInstance.test.ts"

# 7. Show debugging tips
print_header "Debugging Tips"
print_status "If you encounter issues:"
echo "  1. Check environment: ./script/verify-install.sh"
echo "  2. Check Docker: docker info"
echo "  3. Check Node.js: node --version && npm --version"
echo "  4. Check Bun: bun --version"
echo "  5. Restart Docker daemon: sudo systemctl restart docker"

# 8. Show resources
print_header "Helpful Resources"
print_status "Documentation:"
echo "  - Node.js: https://nodejs.org/docs/"
echo "  - Bun.js: https://bun.sh/docs"
echo "  - Docker: https://docs.docker.com/"
echo "  - Project README: ./README.md"

print_status "Community and Support:"
echo "  - GitHub Issues: https://github.com/your-org/full-self-coding/issues"
echo "  - Discussions: https://github.com/your-org/full-self-coding/discussions"

print_header "Ready to Go! 🎉"
print_success "Your Full Self Coding development environment is ready!"
print_status "Start by running: cd .. && bun install && bun test"

echo ""
print_status "Happy coding! 🚀"