# Pixi Features and Multi-Environment Guide

## Overview

Features are building blocks that define sets of packages, configurations, and tasks. Environments combine one or more
features to create isolated dependency sets for different purposes (testing, development, production, etc.).

## Features

### What are Features?

Features are named collections of:

- Dependencies (conda and PyPI packages)
- Platform specifications
- Channels
- System requirements
- Tasks
- Environment variables

### Defining Features

In `pixi.toml`:

```toml
[feature.test.dependencies]
pytest = "*"
pytest-cov = "*"

[feature.test.tasks]
test = "pytest tests/"

[feature.cuda.dependencies]
pytorch-cuda = { version = "*", channel = "pytorch" }

[feature.cuda.system-requirements]
cuda = "12.0"

[feature.py310.dependencies]
python = "3.10.*"

[feature.py311.dependencies]
python = "3.11.*"
```

### Feature Types

**Development features:**

```toml
[feature.dev.dependencies]
black = "*"
ruff = "*"
mypy = "*"

[feature.dev.tasks]
format = "black ."
lint = "ruff check ."
typecheck = "mypy src/"
```

**Platform-specific features:**

```toml
[feature.linux.dependencies]
linux-specific-package = "*"

[feature.macos.dependencies]
macos-specific-package = "*"
```

**Hardware-specific features:**

```toml
[feature.cuda.dependencies]
pytorch-cuda = "*"

[feature.cpu.dependencies]
pytorch-cpu = "*"
```

## Environments

### Defining Environments

Environments compose features. The `default` feature is always included automatically:

```toml
[environments]
# default environment = ["default"] (implicit)

# test environment includes default + test features
test = ["test"]

# dev environment includes default + dev + test features
dev = ["dev", "test"]

# Multiple Python versions for testing
test-py310 = ["test", "py310"]
test-py311 = ["test", "py311"]

# Hardware-specific environments
cuda = ["cuda"]
cpu = ["cpu"]
```

### Environment Composition Rules

1. **Default feature is always included** - You don't need to specify it
2. **Features are additive** - All dependencies from all features are combined
3. **Later features override earlier ones** - For conflicting dependencies

Example:

```toml
[dependencies]
python = "3.11.*" # In default feature

[feature.py310.dependencies]
python = "3.10.*" # Overrides default

[environments]
test-py310 = ["test", "py310"] # Uses Python 3.10
```

## Solve Groups

Solve groups ensure consistent dependency versions across environments:

```toml
[environments]
default = { solve-group = "default" }
test = { features = ["test"], solve-group = "default" }
dev = { features = ["dev", "test"], solve-group = "default" }
```

Benefits:

- Same package versions across environments
- Faster solving (solved once, reused)
- Consistent behavior

## Working with Environments

### Activating Environments

```bash
# Activate default environment
pixi shell

# Activate specific environment
pixi shell --environment test
pixi shell -e cuda
```

### Running Tasks in Environments

```bash
# Run task in default environment
pixi run test

# Run task in specific environment
pixi run --environment test pytest
pixi run -e cuda python train.py
```

### Installing Environments

```bash
# Install all environments
pixi install

# Install specific environment
pixi install --environment test
```

### Adding Packages to Features

```bash
# Add to default feature
pixi add numpy

# Add to specific feature
pixi add --feature test pytest
pixi add --feature cuda pytorch-cuda
```

## Common Patterns

### Pattern 1: Testing Multiple Python Versions

```toml
[dependencies]
pytest = "*"

[feature.py39.dependencies]
python = "3.9.*"

[feature.py310.dependencies]
python = "3.10.*"

[feature.py311.dependencies]
python = "3.11.*"

[environments]
py39 = ["py39"]
py310 = ["py310"]
py311 = ["py311"]
```

Usage:

```bash
pixi run -e py39 pytest
pixi run -e py310 pytest
pixi run -e py311 pytest
```

### Pattern 2: Development vs Production

```toml
[dependencies]
# Production dependencies
fastapi = "*"
uvicorn = "*"

[feature.dev.dependencies]
# Development tools
black = "*"
pytest = "*"
mypy = "*"

[feature.dev.tasks]
dev = "uvicorn app:app --reload"
test = "pytest"
format = "black ."

[environments]
# Production: only default feature
default = { solve-group = "prod" }

# Development: default + dev features
dev = { features = ["dev"], solve-group = "prod" }
```

### Pattern 3: CUDA vs CPU

```toml
[feature.cuda.dependencies]
pytorch-cuda = { version = "2.0.*", channel = "pytorch" }

[feature.cuda.system-requirements]
cuda = "12.0"

[feature.cpu.dependencies]
pytorch-cpu = { version = "2.0.*", channel = "pytorch" }

[environments]
cuda = { features = ["cuda"], solve-group = "gpu" }
cpu = { features = ["cpu"], solve-group = "cpu" }
```

### Pattern 4: Documentation Building

```toml
[feature.docs.dependencies]
sphinx = "*"
sphinx-rtd-theme = "*"
myst-parser = "*"

[feature.docs.tasks]
docs-build = "sphinx-build docs docs/_build"
docs-serve = "python -m http.server -d docs/_build"

[environments]
docs = ["docs"]
```

Usage:

```bash
pixi run -e docs docs-build
pixi run -e docs docs-serve
```

### Pattern 5: Platform-Specific Builds

```toml
[feature.linux.dependencies]
linux-package = "*"

[feature.macos.dependencies]
macos-package = "*"

[feature.windows.dependencies]
windows-package = "*"

[environments]
linux = { features = ["linux"], solve-group = "default" }
macos = { features = ["macos"], solve-group = "default" }
windows = { features = ["windows"], solve-group = "default" }
```

## Advanced Configuration

### Feature Activation

Features can be activated based on platform automatically:

```toml
[feature.linux.dependencies]
linux-only = "*"

[feature.linux.activation]
platforms = ["linux-64"]
```

### Task Dependencies

Tasks can depend on other tasks:

```toml
[feature.test.tasks]
install-deps = "pip install -e ."
test = { cmd = "pytest", depends-on = ["install-deps"] }
```

### Environment-Specific Tasks

```toml
[feature.test.tasks]
test = "pytest tests/"

[feature.cuda.tasks]
test = "pytest tests/ --cuda" # Override for CUDA environment
```

## Best Practices

1. **Use solve groups** for consistent versions across related environments
2. **Keep default feature minimal** - Only production dependencies
3. **Create focused features** - Each feature should have a clear purpose
4. **Use descriptive names** - `test`, `dev`, `docs`, `cuda`, etc.
5. **Document environment purposes** - Add comments in pixi.toml
6. **Test all environments** - Ensure each environment works as expected

## Troubleshooting

### Environment not found

```bash
# List available environments
pixi info

# Check pixi.toml [environments] section
```

### Dependency conflicts

```bash
# Check which features are causing conflicts
pixi lock --environment <name> -v

# Use solve groups to align versions
```

### Task not found in environment

```bash
# List tasks in environment
pixi task list --environment <name>

# Ensure task is defined in a feature included in the environment
```
