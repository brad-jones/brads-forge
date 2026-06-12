#!/bin/bash
# Check if pixi is installed and display version information

if command -v pixi &> /dev/null; then
    echo "✓ pixi is installed"
    pixi --version
    exit 0
else
    echo "✗ pixi is not installed"
    echo ""
    echo "Install pixi using one of these methods:"
    echo ""
    echo "Linux/macOS:"
    echo "  curl -fsSL https://pixi.sh/install.sh | bash"
    echo ""
    echo "Windows (PowerShell):"
    echo "  iwr -useb https://pixi.sh/install.ps1 | iex"
    echo ""
    echo "Or visit: https://pixi.prefix.dev/latest/"
    exit 1
fi
