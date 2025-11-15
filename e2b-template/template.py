"""
E2B Template Definition for Stepwise MCP Debugger
Uses E2B Template SDK v2
"""
from e2b import Template, wait_for_port

# Define the template
template = (
    Template()
    .from_ubuntu("24.04")

    # Install system dependencies
    .apt_install([
        "docker.io",
        "docker-compose-v2",
        "python3",
        "python3-pip",
        "python3-venv",
        "nodejs",
        "npm",
        "curl",
        "git"
    ])

    # Set up working directory
    .run_cmd("mkdir -p /app")

    # Install Python packages globally for MCP servers
    .pip_install([
        "fastmcp>=2.12.4",
        "honeyhive>=0.2.57",
        "python-dotenv>=1.0.0",
        "requests>=2.32.0",
        "pydantic>=2.9.0",
    ])

    # Set environment variables
    .set_envs({
        "NODE_ENV": "production",
        "PYTHONUNBUFFERED": "1",
        "DEBIAN_FRONTEND": "noninteractive",
    })

    # Expose MCP server ports
    # Port 8000: Gladia MCP
    # Port 8001: HoneyHive MCP
    # Port 8002: Horizon3 MCP
    # Port 8003: Custom API MCP

    # Note: Actual startup command will be set dynamically by agent
    # when it uploads docker-compose.yml and starts services
)
