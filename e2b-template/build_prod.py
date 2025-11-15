#!/usr/bin/env python3
"""
Build E2B template for production
Usage: python build_prod.py
"""
import os
from dotenv import load_dotenv
from e2b import Template, default_build_logger
from template import template

load_dotenv()

def main():
    print("🏗️  Building E2B template for Stepwise (Production)...")
    print("=" * 60)

    result = Template.build(
        template,
        alias="stepwise-prod",
        cpu_count=4,
        memory_mb=8192,
        on_build_logs=default_build_logger(),
    )

    print("=" * 60)
    print(f"✅ Template built successfully!")
    print(f"   Template ID: {result.template_id}")
    print(f"   Alias: stepwise-prod")
    print()
    print(f"💡 Add this to your .env file:")
    print(f"   E2B_TEMPLATE_ID={result.template_id}")
    print("=" * 60)

if __name__ == '__main__':
    main()
