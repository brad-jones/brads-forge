#!/usr/bin/env python3
"""
Get information about pixi project, environments, and packages.
"""

import json
import subprocess
import sys
from pathlib import Path


def run_command(cmd):
    """Run a command and return output."""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            check=False
        )
        return result.stdout, result.stderr, result.returncode
    except Exception as e:
        return "", str(e), 1


def check_pixi_project():
    """Check if current directory is a pixi project."""
    return Path("pixi.toml").exists() or Path("pyproject.toml").exists()


def get_pixi_info():
    """Get pixi system and project information."""
    stdout, stderr, code = run_command("pixi info --json")
    if code == 0:
        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            return None
    return None


def get_environments():
    """List all environments in the project."""
    info = get_pixi_info()
    if info and "environments_info" in info:
        return list(info["environments_info"].keys())
    return []


def get_packages(environment="default"):
    """List packages in an environment."""
    stdout, stderr, code = run_command(f"pixi list --environment {environment} --json")
    if code == 0:
        try:
            return json.loads(stdout)
        except json.JSONDecodeError:
            return None
    return None


def main():
    if not check_pixi_project():
        print("Not a pixi project (no pixi.toml or pyproject.toml found)")
        sys.exit(1)

    print("=== Pixi Project Information ===\n")

    # Get project info
    info = get_pixi_info()
    if info:
        print(f"Project: {info.get('project_info', {}).get('name', 'N/A')}")
        print(f"Version: {info.get('project_info', {}).get('version', 'N/A')}")
        print(f"Manifest: {info.get('project_info', {}).get('manifest_path', 'N/A')}")
        print()

    # List environments
    envs = get_environments()
    if envs:
        print(f"Environments ({len(envs)}):")
        for env in envs:
            print(f"  - {env}")
        print()

    # List packages in default environment
    packages = get_packages()
    if packages:
        print(f"Packages in 'default' environment:")
        for pkg in packages[:10]:  # Show first 10
            name = pkg.get("name", "unknown")
            version = pkg.get("version", "unknown")
            print(f"  - {name} {version}")
        if len(packages) > 10:
            print(f"  ... and {len(packages) - 10} more")


if __name__ == "__main__":
    main()
