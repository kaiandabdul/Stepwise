#!/bin/bash

################################################################################
# Stepwise MCP Project - System Health Check Script
#
# This script verifies that the development environment is properly configured:
# 1. Docker is running
# 2. E2B CLI is authenticated
# 3. MCP server ports (8000-8003) are available
# 4. Required commands are available
#
# Usage:
#   bash scripts/health-check.sh
#   OR
#   scripts/health-check.sh  (if made executable)
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

# Ports for MCP servers
MCP_PORTS=(8000 8001 8002 8003)
MCP_NAMES=("Gladia" "HoneyHive" "Horizon3" "Custom API")

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

# Check if port is available
is_port_available() {
    local port=$1
    local os=$(uname)

    if [ "$os" = "Darwin" ]; then
        # macOS
        ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1
    else
        # Linux
        ! netstat -tuln 2>/dev/null | grep -q ":$port "
    fi
}

# Check Docker
check_docker() {
    print_header "Docker Status"

    if ! command_exists docker; then
        print_error "Docker command not found"
        print_info "Install from: https://www.docker.com/products/docker-desktop"
        return 1
    fi

    if ! docker ps >/dev/null 2>&1; then
        print_error "Docker is not running"
        print_info "Start Docker Desktop or run: systemctl start docker"
        return 1
    fi

    local docker_version=$(docker --version)
    print_success "$docker_version"

    # Check docker-compose
    if command_exists docker-compose; then
        local compose_version=$(docker-compose --version)
        print_success "$compose_version"
    else
        print_warning "docker-compose not found (may be: docker compose)"
    fi

    return 0
}

# Check E2B CLI
check_e2b() {
    print_header "E2B CLI Status"

    if ! command_exists e2b; then
        print_warning "E2B CLI not installed"
        print_info "Install with: npm install -g @e2b/cli"
        return 1
    fi

    print_success "E2B CLI installed"

    # Check authentication
    if e2b auth whoami >/dev/null 2>&1; then
        local user=$(e2b auth whoami 2>/dev/null || echo "Unknown")
        print_success "E2B authenticated as: $user"
        return 0
    else
        print_warning "E2B CLI not authenticated"
        print_info "Run: e2b auth login"
        return 1
    fi
}

# Check ports
check_ports() {
    print_header "MCP Server Ports"

    local all_available=true

    for i in "${!MCP_PORTS[@]}"; do
        local port="${MCP_PORTS[$i]}"
        local name="${MCP_NAMES[$i]}"

        if is_port_available "$port"; then
            print_success "Port $port (${name}) - AVAILABLE"
        else
            print_warning "Port $port (${name}) - IN USE"
            print_info "Check running services with: lsof -i :$port"
            all_available=false
        fi
    done

    return 0
}

# Check environment variables
check_env() {
    print_header "Environment Configuration"

    local project_root="/Users/codewithabdul/LockeIn/Stepwise"

    if [ -f "$project_root/.env" ]; then
        print_success ".env file exists"
    else
        print_warning ".env file not found"
        print_info "Run: scripts/setup-env.sh"
        return 1
    fi

    # Check for required keys (without printing values for security)
    if grep -q "E2B_API_KEY=" "$project_root/.env"; then
        print_success "E2B_API_KEY configured"
    else
        print_warning "E2B_API_KEY not configured"
    fi

    if grep -q "GLADIA_API_KEY=" "$project_root/.env"; then
        print_success "GLADIA_API_KEY configured"
    else
        print_warning "GLADIA_API_KEY not configured"
    fi

    if grep -q "HONEYHIVE_API_KEY=" "$project_root/.env"; then
        print_success "HONEYHIVE_API_KEY configured"
    else
        print_warning "HONEYHIVE_API_KEY not configured"
    fi

    if grep -q "OPENAI_API_KEY=\|ANTHROPIC_API_KEY=" "$project_root/.env"; then
        print_success "LLM API key configured"
    else
        print_warning "No LLM API key configured"
    fi

    return 0
}

# Check required commands
check_commands() {
    print_header "Required Commands"

    local commands=("node" "python3" "npm" "git")
    local all_found=true

    for cmd in "${commands[@]}"; do
        if command_exists "$cmd"; then
            local version=$($cmd --version 2>&1 | head -n1)
            print_success "$cmd: $version"
        else
            print_error "$cmd: NOT FOUND"
            all_found=false
        fi
    done

    if [ "$all_found" = false ]; then
        return 1
    fi

    return 0
}

# Check Node.js dependencies
check_npm_deps() {
    print_header "NPM Dependencies"

    local project_root="/Users/codewithabdul/LockeIn/Stepwise"

    # Check if package.json exists in agent directory
    if [ -f "$project_root/agent/package.json" ]; then
        if [ -d "$project_root/agent/node_modules" ]; then
            print_success "agent/node_modules exists"
        else
            print_warning "agent/node_modules not found"
            print_info "Run: cd agent && npm install"
        fi
    fi

    # Check global E2B CLI
    if npm list -g @e2b/cli >/dev/null 2>&1; then
        print_success "@e2b/cli installed globally"
    else
        print_warning "@e2b/cli not installed globally"
        print_info "Run: npm install -g @e2b/cli"
    fi

    return 0
}

# Check Python dependencies
check_python_deps() {
    print_header "Python Dependencies"

    if ! command_exists python3; then
        print_error "Python3 not found"
        return 1
    fi

    # Check for python-dotenv
    if python3 -c "import dotenv" 2>/dev/null; then
        print_success "python-dotenv installed"
    else
        print_warning "python-dotenv not installed"
        print_info "Run: pip install python-dotenv"
    fi

    return 0
}

# Print summary and recommendations
print_summary() {
    print_header "Health Check Summary"

    echo "Key checks to perform before development:"
    echo ""
    echo "1. API Keys:"
    echo "   ${BOLD}python scripts/validate-apis.py${NC}"
    echo ""
    echo "2. Local MCP servers (in separate terminals):"
    echo "   ${BOLD}cd mcp-servers/gladia && npm start${NC}"
    echo "   ${BOLD}cd mcp-servers/honeyhive && python src/server.py${NC}"
    echo "   ${BOLD}cd mcp-servers/horizon3 && npm start${NC}"
    echo "   ${BOLD}cd mcp-servers/custom-api && npm start${NC}"
    echo ""
    echo "3. Start agent:"
    echo "   ${BOLD}cd agent && npm start${NC}"
    echo ""
    echo "4. Start frontend:"
    echo "   ${BOLD}cd frontend && python app.py${NC}"
    echo ""
}

# Main execution
main() {
    echo -e "${BOLD}${BLUE}"
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║     Stepwise MCP - System Health Check                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Run all checks
    check_commands || true
    check_docker || true
    check_e2b || true
    check_env || true
    check_ports || true
    check_npm_deps || true
    check_python_deps || true

    # Print summary
    print_summary

    print_success "Health check complete!"
    echo ""
}

# Run main function
main
