# Full Self Coding Development Environment Setup Script (PowerShell)
# This script installs Node.js, npm, Bun.js, Docker, and fetches required Docker images

param(
    [switch]$SkipDockerDesktop,
    [switch]$Force
)

# Colors for output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )

    Write-Host $Message -ForegroundColor $Color
}

function Write-Status {
    param([string]$Message)
    Write-ColorOutput "[INFO] $Message" "Blue"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" "Green"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" "Yellow"
}

function Write-Error-Output {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" "Red"
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-Admin {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Main script starts here
Write-Status "Starting Full Self Coding development environment setup..."
Write-Host "=================================================="

# Check if running as administrator
if (Test-Admin) {
    Write-Warning "Running as Administrator. Some installations may behave differently."
    $continue = Read-Host "Do you want to continue? (y/N)"
    if ($continue -notmatch '^[Yy]$') {
        exit 1
    }
}

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion.Major
if ($psVersion -lt 5) {
    Write-Error-Output "PowerShell version 5 or higher is required. Current version: $psVersion"
    exit 1
}

# Check if Chocolatey is installed
Write-Status "Checking Chocolatey installation..."
if (Test-Command "choco") {
    $chocoVersion = choco --version
    Write-Success "Chocolatey $chocoVersion is already installed"
    choco upgrade -y chocolatey
} else {
    Write-Status "Installing Chocolatey package manager..."

    if (Test-Admin) {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        Write-Success "Chocolatey installed successfully"
    } else {
        Write-Error-Output "Chocolatey installation requires administrator privileges."
        Write-Status "Please run PowerShell as Administrator and try again."
        exit 1
    }
}

# Refresh environment variables
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Install Node.js and npm
Write-Status "Checking Node.js and npm installation..."
if ((Test-Command "node") -and (Test-Command "npm")) {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Success "Node.js $nodeVersion and npm $npmVersion are already installed"

    # Check if Node.js version is adequate (>= 16.x)
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -lt 16 -or $Force) {
        Write-Warning "Node.js version $nodeVersion is outdated or force reinstall requested. Installing LTS version..."
        choco install -y nodejs-lts --force
    }
} else {
    Write-Status "Node.js and/or npm not found. Installing..."
    choco install -y nodejs-lts
    Write-Success "Node.js and npm installed successfully"
}

# Refresh environment variables again
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Verify Node.js installation
if ((Test-Command "node") -and (Test-Command "npm")) {
    $nodeVersion = node --version
    $npmVersion = npm --version
    Write-Success "Node.js $nodeVersion and npm $npmVersion verified"
} else {
    Write-Error-Output "Node.js installation verification failed"
    Write-Status "You may need to restart PowerShell or refresh your environment variables."
    exit 1
}

# Install Bun.js
Write-Status "Checking Bun.js installation..."
if (Test-Command "bun") {
    $bunVersion = bun --version
    Write-Success "Bun.js $bunVersion is already installed"
} else {
    Write-Status "Installing Bun.js..."

    try {
        # Install Bun using their official PowerShell script
        powershell -c "irm bun.sh/install.ps1 | iex"

        # Add Bun to PATH for current session
        $bunPath = "$env:USERPROFILE\.bun\bin"
        if ($env:Path -notlike "*$bunPath*") {
            $env:Path += ";$bunPath"
        }

        # Verify Bun installation
        if (Test-Command "bun") {
            $bunVersion = bun --version
            Write-Success "Bun.js $bunVersion installed successfully"
        } else {
            throw "Bun installation verification failed"
        }
    }
    catch {
        Write-Error-Output "Failed to install Bun.js: $_"
        Write-Status "Alternative: Download from https://bun.sh/docs/installation"
        exit 1
    }
}

# Install Docker
Write-Status "Checking Docker installation..."
if (Test-Command "docker") {
    $dockerVersion = docker --version
    Write-Success "Docker $dockerVersion is already installed"

    # Check if Docker is running
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker daemon is running"
        } else {
            Write-Warning "Docker is installed but not running. Please start Docker Desktop."
        }
    }
    catch {
        Write-Warning "Docker is installed but may not be running properly."
    }
} else {
    if (-not $SkipDockerDesktop) {
        Write-Status "Docker not found. Installing Docker Desktop..."

        try {
            choco install -y docker-desktop
            Write-Success "Docker Desktop installed successfully"
            Write-Warning "Please start Docker Desktop from your Start Menu or Applications folder."
            Write-Status "After starting Docker Desktop, you may need to run this script again to verify installation."

            $startNow = Read-Host "Do you want to start Docker Desktop now? (y/N)"
            if ($startNow -match '^[Yy]$') {
                Start-Process "docker-desktop" -WindowStyle Normal
                Write-Status "Docker Desktop starting... This may take a moment."
            }
        }
        catch {
            Write-Error-Output "Failed to install Docker Desktop: $_"
            Write-Status "Please install Docker Desktop manually from: https://www.docker.com/products/docker-desktop"
            exit 1
        }
    } else {
        Write-Status "Skipping Docker Desktop installation as requested."
        Write-Warning "You will need to install Docker manually for the Full Self Coding project to work."
    }
}

# Verify Docker installation and functionality
Write-Status "Verifying Docker installation..."
if (Test-Command "docker") {
    try {
        $dockerInfo = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerVersion = docker --version
            Write-Success "Docker $dockerVersion is running and accessible"
        } else {
            Write-Warning "Docker is installed but not accessible. Please:"
            Write-Warning "1. Start Docker Desktop"
            Write-Warning "2. Wait for it to fully initialize"
            Write-Warning "3. Run this script again to verify"
        }
    }
    catch {
        Write-Warning "Docker verification failed. You may need to start Docker Desktop manually."
    }
} else {
    Write-Warning "Docker installation verification failed. Docker may still be installing."
}

# Pull required Docker images (only if Docker is working)
$dockerWorking = $false
if (Test-Command "docker") {
    try {
        $testResult = docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerWorking = $true
        }
    }
    catch {
        $dockerWorking = $false
    }
}

if ($dockerWorking) {
    Write-Status "Pulling required Docker images..."

    # Pull node:latest image
    Write-Status "Pulling node:latest Docker image..."
    try {
        $pullResult = docker pull node:latest
        if ($LASTEXITCODE -eq 0) {
            Write-Success "node:latest image pulled successfully"
        } else {
            throw "Docker pull failed"
        }
    }
    catch {
        Write-Error-Output "Failed to pull node:latest image: $_"
        exit 1
    }

    # Optional: Pull additional useful images
    $pullMore = Read-Host "Do you want to pull additional useful Docker images? (ubuntu:latest, alpine:latest) [y/N]"
    if ($pullMore -match '^[Yy]$') {
        Write-Status "Pulling additional images..."

        $images = @("ubuntu:latest", "alpine:latest")
        foreach ($image in $images) {
            Write-Status "Pulling $image..."
            try {
                $pullResult = docker pull $image
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "$image pulled successfully"
                } else {
                    throw "Docker pull failed for $image"
                }
            }
            catch {
                Write-Warning "Failed to pull $image (continuing...)"
            }
        }
    }
} else {
    Write-Warning "Skipping Docker image pull as Docker is not yet accessible."
    Write-Status "You can pull required images later with: docker pull node:latest"
}

# Final verification
Write-Host "=================================================="
Write-Status "Performing final verification..."

$finalResults = @()

# Check all required tools
$tools = @("node", "npm", "bun", "docker")
foreach ($tool in $tools) {
    if (Test-Command $tool) {
        try {
            $version = & $tool --version 2>$null
            if (-not $version) { $version = "version available" }
            $finalResults += "✅ $tool`: $version"
            Write-Success "$tool is available: $version"
        }
        catch {
            $finalResults += "✅ $tool`: available"
            Write-Success "$tool is available"
        }
    } else {
        $finalResults += "❌ $tool`: NOT FOUND"
        Write-Error-Output "$tool is not available"
    }
}

# Check Docker functionality
if ($dockerWorking) {
    try {
        $testContainer = docker run --rm node:latest node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $finalResults += "✅ Docker containers: Working"
            Write-Success "Docker container execution is working"
        } else {
            throw "Container test failed"
        }
    }
    catch {
        $finalResults += "❌ Docker containers: Not working"
        Write-Error-Output "Docker container execution is not working"
    }
} else {
    $finalResults += "❌ Docker containers: Not accessible"
    Write-Error-Output "Docker container execution is not accessible"
}

Write-Host "=================================================="
Write-Status "Installation Summary:"
foreach ($result in $finalResults) {
    Write-Host "  $result"
}

Write-Host "=================================================="

# Next steps
Write-Status "Setup completed! Next steps:"
Write-Host ""
Write-Host "1. If you haven't already, clone the Full Self Coding repository:"
Write-Host "   git clone https://github.com/your-org/full-self-coding.git"
Write-Host "   cd full-self-coding"
Write-Host ""
Write-Host "2. Install project dependencies:"
Write-Host "   bun install"
Write-Host ""
Write-Host "3. Build the project:"
Write-Host "   bun run build"
Write-Host ""
Write-Host "4. Run the tests:"
Write-Host "   bun test"
Write-Host ""
Write-Host "5. Make sure Docker Desktop is running before using the application"
Write-Host ""

if (-not $dockerWorking) {
    Write-Warning "Please start Docker Desktop and verify it's working before using the Full Self Coding project."
}

Write-Success "Full Self Coding development environment setup complete! 🚀"

# Ask if user wants to open Docker Desktop
if (-not $dockerWorking -and -not $SkipDockerDesktop) {
    $openDocker = Read-Host "Would you like to open Docker Desktop now? (y/N)"
    if ($openDocker -match '^[Yy]$') {
        try {
            Start-Process "docker-desktop" -WindowStyle Normal
            Write-Status "Docker Desktop started. Please wait for it to fully initialize."
        }
        catch {
            Write-Warning "Could not automatically start Docker Desktop. Please start it manually."
        }
    }
}