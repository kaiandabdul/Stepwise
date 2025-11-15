#!/usr/bin/env python3
"""
Stepwise MCP Project - API Key Validation Script

This script validates that all required API keys are configured in the .env file.
It checks for:
- E2B API key (required)
- Gladia API key (required)
- HoneyHive API key (required)
- OpenAI or Anthropic API key (at least one required)
- Horizon3 API key (optional)

Usage:
    python scripts/validate-apis.py

Exit codes:
    0 - All required keys are present
    1 - One or more required keys are missing
"""

import os
import sys
from pathlib import Path

# Try to load python-dotenv, provide helpful error if not installed
try:
    from dotenv import load_dotenv
except ImportError:
    print("Error: python-dotenv is not installed.")
    print("Install it with: pip install python-dotenv")
    sys.exit(1)


class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_status(name, is_valid, message=""):
    """Print validation status with color"""
    status_symbol = f"{Colors.GREEN}✓{Colors.RESET}" if is_valid else f"{Colors.RED}✗{Colors.RESET}"
    status_text = f"{Colors.GREEN}VALID{Colors.RESET}" if is_valid else f"{Colors.RED}MISSING{Colors.RESET}"

    output = f"  {status_symbol} {name:<25} [{status_text}]"
    if message:
        output += f"  {message}"
    print(output)


def print_header(text):
    """Print a section header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{text}{Colors.RESET}")
    print("-" * 60)


def validate_env_file_exists():
    """Check if .env file exists"""
    env_path = Path("/Users/codewithabdul/LockeIn/Stepwise/.env")
    if env_path.exists():
        print_status(".env file", True, "Found")
        return True
    else:
        print_status(".env file", False, "Not found - run scripts/setup-env.sh first")
        return False


def validate_e2b():
    """Validate E2B API key"""
    api_key = os.getenv("E2B_API_KEY")

    if not api_key:
        print_status("E2B_API_KEY", False)
        return False

    if len(api_key) < 10:
        print_status("E2B_API_KEY", False, "Value too short")
        return False

    print_status("E2B_API_KEY", True, f"Set ({len(api_key)} chars)")
    return True


def validate_gladia():
    """Validate Gladia API key"""
    api_key = os.getenv("GLADIA_API_KEY")

    if not api_key:
        print_status("GLADIA_API_KEY", False)
        return False

    if len(api_key) < 10:
        print_status("GLADIA_API_KEY", False, "Value too short")
        return False

    print_status("GLADIA_API_KEY", True, f"Set ({len(api_key)} chars)")
    return True


def validate_honeyhive():
    """Validate HoneyHive API key (v0.2.57 compatible)"""
    api_key = os.getenv("HONEYHIVE_API_KEY")

    if not api_key:
        print_status("HONEYHIVE_API_KEY", False)
        return False

    if len(api_key) < 10:
        print_status("HONEYHIVE_API_KEY", False, "Value too short")
        return False

    project = os.getenv("HONEYHIVE_PROJECT", "stepwise-agent")
    print_status("HONEYHIVE_API_KEY", True, f"Set ({len(api_key)} chars)")
    print_status("HONEYHIVE_PROJECT", True, f"Set to '{project}'")
    return True


def validate_llm():
    """Validate OpenAI or Anthropic API key (at least one required)"""
    openai_key = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    has_openai = openai_key and len(openai_key) > 10
    has_anthropic = anthropic_key and len(anthropic_key) > 10

    if has_openai:
        print_status("OPENAI_API_KEY", True, f"Set ({len(openai_key)} chars)")
    else:
        print_status("OPENAI_API_KEY", False, "Not set")

    if has_anthropic:
        print_status("ANTHROPIC_API_KEY", True, f"Set ({len(anthropic_key)} chars)")
    else:
        print_status("ANTHROPIC_API_KEY", False, "Not set")

    if has_openai or has_anthropic:
        return True
    else:
        return False


def validate_horizon3():
    """Validate Horizon3 API key (optional)"""
    api_key = os.getenv("HORIZON3_API_KEY")
    use_mock = os.getenv("HORIZON3_USE_MOCK", "false").lower() == "true"

    if api_key and len(api_key) > 10:
        print_status("HORIZON3_API_KEY", True, f"Set ({len(api_key)} chars)")
        return True
    elif use_mock:
        print_status("HORIZON3_API_KEY", True, "Using mock mode")
        return True
    else:
        print_status("HORIZON3_API_KEY", False, "Optional - can use HORIZON3_USE_MOCK=true")
        return True  # Optional, so return True


def check_optional_settings():
    """Check optional configuration settings"""
    e2b_template = os.getenv("E2B_TEMPLATE_ID")
    if e2b_template:
        print_status("E2B_TEMPLATE_ID", True, f"Set to '{e2b_template[:20]}...'")
    else:
        print_status("E2B_TEMPLATE_ID", False, "Not set (created in Phase 3)")

    use_e2b = os.getenv("USE_E2B", "true").lower() == "true"
    print_status("USE_E2B", True, f"Set to '{use_e2b}'")

    log_level = os.getenv("LOG_LEVEL", "info")
    print_status("LOG_LEVEL", True, f"Set to '{log_level}'")


def main():
    """Run all validation checks"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}═════════════════════════════════════════════════════════{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}    Stepwise MCP - API Key Validation{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}═════════════════════════════════════════════════════════{Colors.RESET}")

    # Load .env file
    env_path = Path("/Users/codewithabdul/LockeIn/Stepwise/.env")
    if env_path.exists():
        load_dotenv(env_path)

    # Check .env file exists
    print_header("Configuration File")
    if not validate_env_file_exists():
        print(f"\n{Colors.RED}✗ .env file not found!{Colors.RESET}")
        print(f"  Run: {Colors.BOLD}scripts/setup-env.sh{Colors.RESET}")
        sys.exit(1)

    # Validate required API keys
    print_header("Required API Keys")
    results = {
        "e2b": validate_e2b(),
        "gladia": validate_gladia(),
        "honeyhive": validate_honeyhive(),
        "llm": validate_llm(),
    }

    # Validate optional API keys
    print_header("Optional API Keys")
    validate_horizon3()

    # Check optional settings
    print_header("Configuration Settings")
    check_optional_settings()

    # Summary
    print_header("Validation Summary")

    all_required_valid = all(results.values())

    if all_required_valid:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ All required API keys are configured!{Colors.RESET}")
        print("\nYou're ready to proceed with Phase 1 setup.")
        print(f"\nNext steps:")
        print(f"  1. Create project directories (see CLAUDE.md)")
        print(f"  2. Proceed with Phase 2: Building MCP Servers")
        print(f"  3. Reference: {Colors.BOLD}phases/README.md{Colors.RESET}\n")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}✗ Some required API keys are missing!{Colors.RESET}")
        print("\nMissing keys:")
        for key, valid in results.items():
            if not valid:
                if key == "e2b":
                    print(f"  - E2B_API_KEY: Get from https://e2b.dev")
                elif key == "gladia":
                    print(f"  - GLADIA_API_KEY: Get from https://www.gladia.io")
                elif key == "honeyhive":
                    print(f"  - HONEYHIVE_API_KEY: Get from https://www.honeyhive.ai")
                elif key == "llm":
                    print(f"  - OPENAI_API_KEY or ANTHROPIC_API_KEY")

        print(f"\nAdd missing keys to: {Colors.BOLD}.env{Colors.RESET}")
        print(f"Reference: {Colors.BOLD}.env.example{Colors.RESET}\n")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except Exception as e:
        print(f"\n{Colors.RED}Error during validation: {e}{Colors.RESET}")
        sys.exit(1)
