#!/bin/bash

# Full Self Coding Development Environment Setup Script
# This script installs Node.js, npm, Bun.js, Docker, and fetches required Docker images

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            echo "debian"
        elif [ -f /etc/redhat-release ]; then
            echo "redhat"
        else
            echo "linux"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Main script starts here
print_status "Starting Full Self Coding development environment setup..."
echo "=================================================="

# Detect operating system
OS=$(detect_os)
print_status "Detected OS: $OS"

# Check if running as root on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]] && [ "$EUID" -eq 0 ]; then
    print_warning "Running as root. Some installations may behave differently."
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install Homebrew on macOS if not present
if [[ "$OS" == "macos" ]]; then
    if ! check_command "brew"; then
        print_status "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to PATH for current session
        if [[ $(uname -m) == "arm64" ]]; then
            echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/opt/homebrew/bin/brew shellenv)"
        else
            echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zshrc
            eval "$(/usr/local/bin/brew shellenv)"
        fi

        print_success "Homebrew installed successfully"
    else
        print_success "Homebrew is already installed"
        brew update
    fi
fi

# Function to install Node.js on Linux
install_nodejs_linux() {
    print_status "Installing Node.js and npm..."

    if [[ "$OS" == "debian" ]]; then
        # Debian/Ubuntu
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "redhat" ]]; then
        # RHEL/CentOS/Fedora
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs npm
    else
        # Generic Linux - use binary
        print_status "Downloading Node.js binary..."
        NODE_VERSION=$(curl -sL https://nodejs.org/dist/index.json | grep -E '"version":"[0-9]+\.[0-9]+\.[0-9]+".*"lts"' | head -1 | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
        ARCH=$(uname -m)
        if [[ "$ARCH" == "x86_64" ]]; then
            ARCH="x64"
        elif [[ "$ARCH" == "aarch64" ]]; then
            ARCH="arm64"
        fi

        cd /tmp
        wget "https://nodejs.org/dist/latest-v18.x/node-v${NODE_VERSION#v}-linux-${ARCH}.tar.xz"
        sudo tar -xf "node-v${NODE_VERSION#v}-linux-${ARCH}.tar.xz" -C /usr/local --strip-components=1
        rm "node-v${NODE_VERSION#v}-linux-${ARCH}.tar.xz"
    fi
}

# Install Node.js and npm
print_status "Checking Node.js and npm installation..."
if check_command "node" && check_command "npm"; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js $NODE_VERSION and npm $NPM_VERSION are already installed"

    # Check if Node.js version is adequate (>= 16.x)
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$MAJOR_VERSION" -lt 16 ]; then
        print_warning "Node.js version $NODE_VERSION is outdated. Installing LTS version..."
        install_nodejs_linux
    fi
else
    print_status "Node.js and/or npm not found. Installing..."

    if [[ "$OS" == "macos" ]]; then
        brew install node
    elif [[ "$OS" == "windows" ]]; then
        print_error "Please install Node.js manually from https://nodejs.org/"
        exit 1
    else
        install_nodejs_linux
    fi

    print_success "Node.js and npm installed successfully"
fi

# Verify Node.js installation
if check_command "node" && check_command "npm"; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js $NODE_VERSION and npm $NPM_VERSION verified"
else
    print_error "Node.js installation verification failed"
    exit 1
fi

# Install Bun.js
print_status "Checking Bun.js installation..."
if check_command "bun"; then
    BUN_VERSION=$(bun --version)
    print_success "Bun.js $BUN_VERSION is already installed"
else
    print_status "Installing Bun.js..."

    if [[ "$OS" == "macos" ]]; then
        brew install oven-sh/bun/bun
    elif [[ "$OS" == "linux-gnu"* ]]; then
        curl -fsSL https://bun.sh/install | bash

        # Add Bun to PATH for current session
        export BUN_INSTALL="$HOME/.bun"
        export PATH="$BUN_INSTALL/bin:$PATH"

        # Add to shell profile
        SHELL_PROFILE=""
        if [ -n "$BASH_VERSION" ]; then
            SHELL_PROFILE="$HOME/.bashrc"
        elif [ -n "$ZSH_VERSION" ]; then
            SHELL_PROFILE="$HOME/.zshrc"
        else
            SHELL_PROFILE="$HOME/.profile"
        fi

        echo '# Bun.js' >> "$SHELL_PROFILE"
        echo 'export BUN_INSTALL="$HOME/.bun"' >> "$SHELL_PROFILE"
        echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> "$SHELL_PROFILE"

    elif [[ "$OS" == "windows" ]]; then
        powershell -c "irm bun.sh/install.ps1 | iex"
    fi

    # Verify Bun installation
    if check_command "bun"; then
        BUN_VERSION=$(bun --version)
        print_success "Bun.js $BUN_VERSION installed successfully"
    else
        print_error "Bun.js installation failed"
        exit 1
    fi
fi

# Install Docker
print_status "Checking Docker installation..."
if check_command "docker"; then
    DOCKER_VERSION=$(docker --version)
    print_success "Docker $DOCKER_VERSION is already installed"

    # Check if Docker is running
    if docker info &> /dev/null; then
        print_success "Docker daemon is running"
    else
        print_warning "Docker is installed but not running. Please start Docker."
        if [[ "$OS" == "macos" ]]; then
            print_status "To start Docker on macOS: open Docker Desktop application"
        elif [[ "$OS" == "linux-gnu"* ]]; then
            print_status "To start Docker on Linux: sudo systemctl start docker"
        fi
    fi
else
    print_status "Docker not found. Installing..."

    if [[ "$OS" == "macos" ]]; then
        print_status "Installing Docker Desktop for Mac..."
        print_warning "Please download and install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
        print_status "After installation, start Docker Desktop and run this script again."
        exit 1
    elif [[ "$OS" == "debian" ]]; then
        # Ubuntu/Debian
        print_status "Installing Docker on Debian/Ubuntu..."
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg lsb-release

        # Add Docker's official GPG key
        sudo mkdir -p /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

        # Set up the repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Add user to docker group
        sudo usermod -aG docker $USER

        # Start and enable Docker
        sudo systemctl start docker
        sudo systemctl enable docker

    elif [[ "$OS" == "redhat" ]]; then
        # RHEL/CentOS/Fedora
        print_status "Installing Docker on RHEL/CentOS/Fedora..."
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

        # Add user to docker group
        sudo usermod -aG docker $USER

        # Start and enable Docker
        sudo systemctl start docker
        sudo systemctl enable docker

    else
        print_error "Automatic Docker installation not supported for this OS."
        print_status "Please install Docker manually from: https://docs.docker.com/get-docker/"
        exit 1
    fi

    print_success "Docker installed successfully"
fi

# Verify Docker installation and functionality
print_status "Verifying Docker installation..."
if check_command "docker"; then
    if docker info &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker $DOCKER_VERSION is running and accessible"
    else
        print_error "Docker is installed but not accessible. Please:"
        print_error "1. Start Docker daemon"
        print_error "2. Ensure your user has proper permissions"
        if [[ "$OS" == "linux-gnu"* ]]; then
            print_error "3. Try: sudo usermod -aG docker \$USER && newgrp docker"
            print_error "   Or run: sudo systemctl start docker"
        fi
        exit 1
    fi
else
    print_error "Docker installation verification failed"
    exit 1
fi

# Pull required Docker images
print_status "Pulling required Docker images..."

# Pull node:latest image
print_status "Pulling node:latest Docker image..."
if docker pull node:latest; then
    print_success "node:latest image pulled successfully"
else
    print_error "Failed to pull node:latest image"
    exit 1
fi

# Optional: Pull additional useful images
read -p "Do you want to pull additional useful Docker images? (ubuntu:latest, alpine:latest) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Pulling additional images..."

    for image in "ubuntu:latest" "alpine:latest"; do
        print_status "Pulling $image..."
        if docker pull "$image"; then
            print_success "$image pulled successfully"
        else
            print_warning "Failed to pull $image (continuing...)"
        fi
    done
fi

# Final verification
echo "=================================================="
print_status "Performing final verification..."

FINAL_RESULTS=()

# Check all required tools
for tool in "node" "npm" "bun" "docker"; do
    if check_command "$tool"; then
        VERSION=$($tool --version 2>/dev/null || echo "version available")
        FINAL_RESULTS+=("✅ $tool: $VERSION")
        print_success "$tool is available: $VERSION"
    else
        FINAL_RESULTS+=("❌ $tool: NOT FOUND")
        print_error "$tool is not available"
    fi
done

# Check Docker functionality
if docker run --rm node:latest node --version &> /dev/null; then
    FINAL_RESULTS+=("✅ Docker containers: Working")
    print_success "Docker container execution is working"
else
    FINAL_RESULTS+=("❌ Docker containers: Not working")
    print_error "Docker container execution is not working"
fi

echo "=================================================="
print_status "Installation Summary:"
for result in "${FINAL_RESULTS[@]}"; do
    echo "  $result"
done

echo "=================================================="

# Next steps
print_status "Setup completed! Next steps:"
echo ""
echo "1. If you haven't already, clone the Full Self Coding repository:"
echo "   git clone https://github.com/your-org/full-self-coding.git"
echo "   cd full-self-coding"
echo ""
echo "2. Install project dependencies:"
echo "   bun install"
echo ""
echo "3. Build the project:"
echo "   bun run build"
echo ""
echo "4. Run the tests:"
echo "   bun test"
echo ""
echo "5. If Docker permissions were updated, you may need to:"
echo "   - Log out and log back in, OR"
echo "   - Run: newgrp docker (on Linux)"
echo ""

if [[ "$OS" == "linux-gnu"* ]]; then
    print_warning "If you added yourself to the docker group, please log out and log back in"
    print_warning "or run 'newgrp docker' to apply the group changes."
fi

print_success "Full Self Coding development environment setup complete! 🚀"