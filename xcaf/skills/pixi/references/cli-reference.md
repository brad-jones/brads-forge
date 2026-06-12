# Pixi CLI Reference

Complete reference for pixi commands.

## Core Commands

### Project Initialization

```bash
pixi init [NAME]                    # Initialize new pixi project
pixi init --format pyproject        # Use pyproject.toml instead of pixi.toml
```

### Dependency Management

```bash
pixi add <PACKAGE>                  # Add package to default environment
pixi add <PACKAGE> --feature <NAME> # Add package to specific feature
pixi add --pypi <PACKAGE>           # Add PyPI package
pixi add --host <PACKAGE>           # Add host dependency
pixi add --build <PACKAGE>          # Add build dependency

pixi remove <PACKAGE>               # Remove package
pixi remove <PACKAGE> --feature <NAME>

pixi install                        # Install all dependencies (update lock)
pixi install --frozen               # Install without updating lock
pixi install --environment <NAME>   # Install specific environment

pixi reinstall                      # Reinstall environment from scratch
```

### Environment Management

```bash
pixi shell                          # Activate default environment
pixi shell --environment <NAME>     # Activate specific environment
pixi shell -e <NAME>                # Short form

# Exit shell with: exit
```

### Running Commands

```bash
pixi run <TASK>                     # Run defined task
pixi run --environment <NAME> <TASK> # Run task in specific environment

pixi exec <COMMAND>                 # Execute command in environment
pixi exec --spec <PACKAGE> <CMD>    # Install package temporarily and run
```

### Task Management

```bash
pixi task add <NAME> <COMMAND>      # Add new task
pixi task add <NAME> --depends-on <TASK> <COMMAND>
pixi task add <NAME> --feature <FEATURE> <COMMAND>

pixi task list                      # List all tasks
pixi task remove <NAME>             # Remove task
pixi task alias <ALIAS> <TASK>      # Create task alias
```

### Package Information

```bash
pixi list                           # List installed packages
pixi list --environment <NAME>      # List packages in environment
pixi list --json                    # JSON output

pixi tree                           # Show dependency tree
pixi tree --environment <NAME>

pixi search <QUERY>                 # Search conda packages
pixi search --limit 10 <QUERY>
```

### Lock File Management

```bash
pixi lock                           # Update lock file without installing
pixi lock --environment <NAME>      # Lock specific environment

pixi update                         # Update dependencies to newer versions
pixi update <PACKAGE>               # Update specific package

pixi upgrade                        # Upgrade dependencies in manifest
pixi upgrade <PACKAGE>              # Upgrade specific package
```

### Project Information

```bash
pixi info                           # Show project information
pixi info --json                    # JSON output
pixi info --extended                # Extended information
```

### Cleanup

```bash
pixi clean                          # Remove environment directory
pixi clean cache                    # Clean package cache
```

### Global Package Management

```bash
pixi global install <PACKAGE>       # Install package globally
pixi global install gh nvim ripgrep # Install multiple packages

pixi global list                    # List global packages
pixi global remove <PACKAGE>        # Remove global package
pixi global upgrade <PACKAGE>       # Upgrade global package
pixi global upgrade-all             # Upgrade all global packages
```

### Workspace Management

```bash
pixi workspace add <PATH>           # Add workspace member
pixi workspace list                 # List workspace members
```

## Global Options

```bash
-v, --verbose                       # Increase logging verbosity
-q, --quiet                         # Decrease logging verbosity
--color <always|never|auto>         # Control colored output
--no-progress                       # Hide progress bars
-h, --help                          # Show help
-V, --version                       # Show version
```

## Environment Variables

```bash
PIXI_HOME                           # Pixi home directory (default: ~/.pixi)
PIXI_CACHE_DIR                      # Cache directory
PIXI_NO_PATH_UPDATE                 # Don't update PATH in shell
PIXI_DEFAULT_CHANNELS               # Default channels to use
```

## Common Patterns

### Add multiple packages

```bash
pixi add numpy pandas matplotlib
```

### Add package with version constraint

```bash
pixi add "python>=3.11,<3.12"
pixi add "numpy>=1.20"
```

### Add package from specific channel

```bash
pixi add --channel conda-forge pytorch
```

### Run command without activating shell

```bash
pixi run python script.py
pixi exec pytest tests/
```

### Install and run tool temporarily

```bash
pixi exec --spec ruff ruff check .
pixi exec --spec black black .
```

### Work with multiple environments

```bash
pixi run --environment test pytest
pixi run --environment prod python app.py
```
