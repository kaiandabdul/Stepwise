#!/bin/bash

################################################################################
# Stepwise MCP Project - Environment Setup Script
#
# This script sets up the development environment by:
# 1. Creating .env file from .env.example if needed
# 2. Verifying required tools are installed (node, python, docker, e2b)
# 3. Providing guidance for configuration
#
# Usage:
#   bash scripts/setup-env.sh
#   OR
#   scripts/setup-env.sh  (if made executable)
#
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

# Helper functions
print_header() {
    echo -e "\n${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${BLUE}    $1${NC}"
    echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check .env file
check_env_file() {
    print_header "Configuration File Setup"

    if [ -f "$ENV_FILE" ]; then
        print_success ".env file already exists"
        return 0
    fi

    if [ -f "$ENV_EXAMPLE" ]; then
        print_warning ".env file not found, creating from .env.example"
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_success "Created .env file from .env.example"
        print_info "Edit $ENV_FILE and add your API keys"
    else
        print_error ".env.example not found in project root"
        print_info "Create .env manually with these variables:"
        cat << 'EOF'

# Required API Keys
E2B_API_KEY=your_e2b_api_key_here
GLADIA_API_KEY=your_gladia_api_key_here
HONEYHIVE_API_KEY=your_honeyhive_api_key_here
HONEYHIVE_PROJECT=stepwise-agent

# LLM Provider (at least one required)
OPENAI_API_KEY=your_openai_api_key_here
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Optional
HORIZON3_API_KEY=your_horizon3_api_key_here
HORIZON3_USE_MOCK=false
E2B_TEMPLATE_ID=your_template_id_here
USE_E2B=true
LOG_LEVEL=info

EOF
        return 1
    fi

    return 0
}

# Check required tools
check_tools() {
    print_header "Required Tools Check"

    local all_found=true

    # Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_success "Node.js: $node_version"
    else
        print_error "Node.js not installed"
        print_info "Install from: https://nodejs.org/"
        all_found=false
    fi

    # Python
    if command_exists python3; then
        local python_version=$(python3 --version)
        print_success "Python: $python_version"
    else
        print_error "Python 3 not installed"
        print_info "Install from: https://www.python.org/downloads/"
        all_found=false
    fi

    # Docker
    if command_exists docker; then
        local docker_version=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_success "Docker: $docker_version"
    else
        print_error "Docker not installed"
        print_info "Install from: https://www.docker.com/products/docker-desktop"
        all_found=false
    fi

    # Docker Compose
    if command_exists docker-compose; then
        local compose_version=$(docker-compose --version | cut -d' ' -f3)
        print_success "Docker Compose: $compose_version"
    else
        print_warning "Docker Compose not found (may be included with Docker Desktop)"
    fi

    # E2B CLI
    if command_exists e2b; then
        local e2b_version=$(e2b --version 2>/dev/null || echo "unknown")
        print_success "E2B CLI: installed"
    else
        print_warning "E2B CLI not installed"
        print_info "Install with: npm install -g @e2b/cli"
    fi

    # npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_success "npm: $npm_version"
    else
        print_error "npm not installed (should come with Node.js)"
        all_found=false
    fi

    # pip
    if command_exists pip3; then
        local pip_version=$(pip3 --version | cut -d' ' -f2)
        print_success "pip: $pip_version"
    else
        print_warning "pip not installed (may be needed for Python dependencies)"
    fi

    if [ "$all_found" = false ]; then
        return 1
    fi

    return 0
}

# Create project directories
create_directories() {
    print_header "Project Directory Structure"

    local dirs=(
        "agent/src/llm"
        "agent/src/mcp"
        "agent/src/workflow"
        "agent/src/e2b"
        "agent/src/api"
        "agent/tests"
        "mcp-servers/gladia"
        "mcp-servers/honeyhive"
        "mcp-servers/horizon3"
        "mcp-servers/custom-api"
        "frontend"
        "e2b-template"
    )

    for dir in "${dirs[@]}"; do
        if [ ! -d "$PROJECT_ROOT/$dir" ]; then
            mkdir -p "$PROJECT_ROOT/$dir"
            print_success "Created: $dir"
        else
            print_info "Exists: $dir"
        fi
    done
}

# Print next steps
print_next_steps() {
    print_header "Next Steps"

    echo "1. Configure API Keys:"
    echo "   ${BOLD}Edit $ENV_FILE${NC}"
    echo ""
    echo "2. Validate API Keys:"
    echo "   ${BOLD}python scripts/validate-apis.py${NC}"
    echo ""
    echo "3. Check System Health:"
    echo "   ${BOLD}scripts/health-check.sh${NC}"
    echo ""
    echo "4. Begin Phase 2 Implementation:"
    echo "   ${BOLD}See phases/PHASE_2.md${NC}"
    echo ""
    echo "Reference:"
    echo "   ${BOLD}CLAUDE.md${NC} - Project overview and architecture"
    echo "   ${BOLD}phases/PHASE_1.md${NC} - Complete Phase 1 checklist"
    echo ""
}

# Main execution
main() {
    echo -e "${BOLD}${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     Stepwise MCP - Environment Setup                  ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Run checks
    check_env_file || true
    check_tools || true
    create_directories

    # Print next steps
    print_next_steps

    print_success "Setup complete!"
    echo ""
}

# Run main function
main
