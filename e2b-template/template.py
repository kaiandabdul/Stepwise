"""
E2B Template Definition for Stepwise MCP Debugger
Uses E2B Template SDK v2
"""
from e2b import Template

# Define the template
template = (
    Template()
    .from_ubuntu_image("24.04")

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

    # Set up working directory in user home (avoids permission issues)
    .make_dir("/home/user/app", mode=0o755)
    .set_workdir("/home/user/app")

    # Install Python packages globally for MCP servers
    # Using run_cmd with --break-system-packages to bypass Ubuntu 24.04 PEP 668 restrictions
    .run_cmd(
        "pip install --break-system-packages "
        "fastmcp>=2.12.4 honeyhive>=0.2.57 python-dotenv>=1.0.0 "
        "requests>=2.32.0 pydantic>=2.9.0"
    )

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

    # Note: Agent will upload docker-compose.yml to /home/user/app
    # and start services dynamically
)
