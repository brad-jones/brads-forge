# Pixi Usage Examples

Common scenarios and solutions for working with pixi.

## Getting Started

### Initialize a new Python project

```bash
pixi init my-project
cd my-project
pixi add python numpy pandas
```

### Initialize with pyproject.toml

```bash
pixi init --format pyproject my-project
```

### Convert existing project

```bash
# If you have requirements.txt
pixi init
pixi add --pypi -r requirements.txt

# If you have environment.yml
pixi init
pixi add $(cat environment.yml | grep -v "^#" | grep -v "^name:" | grep -v "^channels:" | grep -v "^dependencies:" | tr -d " -")
```

## Package Management

### Add packages from different sources

```bash
# Conda package (default)
pixi add numpy

# PyPI package
pixi add --pypi requests

# Specific version
pixi add "python>=3.11,<3.12"
pixi add "numpy>=1.20,<2.0"

# From specific channel
pixi add --channel conda-forge pytorch
```

### Add multiple packages at once

```bash
pixi add numpy pandas matplotlib scikit-learn
pixi add --pypi requests flask fastapi
```

### Add development dependencies

```bash
pixi add --feature dev pytest black ruff mypy
pixi add --feature dev --pypi ipython
```

### Remove packages

```bash
pixi remove numpy
pixi remove --feature dev pytest
```

## Environment Management

### Create multiple environments

```toml
# pixi.toml
[dependencies]
python = "3.11.*"
numpy = "*"

[feature.test.dependencies]
pytest = "*"
pytest-cov = "*"

[feature.dev.dependencies]
black = "*"
ruff = "*"

[environments]
test = ["test"]
dev = ["dev", "test"]
```

```bash
# Install all environments
pixi install

# Install specific environment
pixi install --environment test
```

### Switch between environments

```bash
# Activate test environment
pixi shell --environment test

# Run command in dev environment
pixi run --environment dev python script.py
```

## Task Management

### Define tasks

```toml
# pixi.toml
[tasks]
start = "python app.py"
test = "pytest tests/"
format = "black ."
lint = "ruff check ."

[feature.dev.tasks]
dev = "python app.py --reload"
typecheck = "mypy src/"
```

### Run tasks

```bash
# Run task in default environment
pixi run test

# Run task in specific environment
pixi run --environment dev typecheck

# Chain tasks
pixi run format && pixi run lint && pixi run test
```

### Task with dependencies

```toml
[tasks]
install = "pip install -e ."
test = { cmd = "pytest", depends-on = ["install"] }
ci = { depends-on = ["format", "lint", "test"] }
```

## Real-World Scenarios

### Scenario 1: Data Science Project

```bash
# Initialize project
pixi init data-analysis
cd data-analysis

# Add data science packages
pixi add python=3.11 numpy pandas matplotlib seaborn scikit-learn jupyter

# Add development tools
pixi add --feature dev pytest black ruff

# Define tasks
pixi task add notebook "jupyter lab"
pixi task add analyze "python scripts/analyze.py"

# Run
pixi run notebook
```

### Scenario 2: Web Application

```bash
# Initialize project
pixi init web-app
cd web-app

# Add web framework
pixi add python=3.11
pixi add --pypi fastapi uvicorn sqlalchemy

# Add development dependencies
pixi add --feature dev --pypi pytest httpx black

# Define tasks
pixi task add dev "uvicorn app:app --reload"
pixi task add prod "uvicorn app:app --host 0.0.0.0 --port 8000"
pixi task add test "pytest tests/"

# Run development server
pixi run dev
```

### Scenario 3: Machine Learning with CUDA

```toml
# pixi.toml
[dependencies]
python = "3.11.*"
numpy = "*"
pandas = "*"

[feature.cuda.dependencies]
pytorch-cuda = { version = "2.0.*", channel = "pytorch" }
torchvision = { channel = "pytorch" }

[feature.cuda.system-requirements]
cuda = "12.0"

[feature.cpu.dependencies]
pytorch-cpu = { version = "2.0.*", channel = "pytorch" }
torchvision = { channel = "pytorch" }

[feature.train.tasks]
train = "python train.py"
evaluate = "python evaluate.py"

[environments]
cuda = { features = ["cuda", "train"], solve-group = "gpu" }
cpu = { features = ["cpu", "train"], solve-group = "cpu" }
```

```bash
# Train on GPU
pixi run --environment cuda train

# Train on CPU
pixi run --environment cpu train
```

### Scenario 4: Testing Multiple Python Versions

```toml
# pixi.toml
[dependencies]
pytest = "*"
mypy = "*"

[feature.py39.dependencies]
python = "3.9.*"

[feature.py310.dependencies]
python = "3.10.*"

[feature.py311.dependencies]
python = "3.11.*"

[feature.py312.dependencies]
python = "3.12.*"

[tasks]
test = "pytest tests/"
typecheck = "mypy src/"

[environments]
py39 = ["py39"]
py310 = ["py310"]
py311 = ["py311"]
py312 = ["py312"]
```

```bash
# Test all Python versions
for env in py39 py310 py311 py312; do
    echo "Testing with $env"
    pixi run --environment $env test
done
```

### Scenario 5: Documentation Project

```bash
# Initialize
pixi init docs-project
cd docs-project

# Add documentation tools
pixi add --feature docs python sphinx sphinx-rtd-theme myst-parser

# Define tasks
pixi task add --feature docs docs-build "sphinx-build docs docs/_build"
pixi task add --feature docs docs-serve "python -m http.server -d docs/_build"
pixi task add --feature docs docs-clean "rm -rf docs/_build"

# Build and serve docs
pixi run --environment docs docs-build
pixi run --environment docs docs-serve
```

## Global Tools

### Install CLI tools globally

```bash
# Install common tools
pixi global install gh ripgrep fd-find bat

# Install Python tools
pixi global install ruff black mypy

# Install specific version
pixi global install "python==3.11.*"
```

### List and manage global tools

```bash
# List installed tools
pixi global list

# Upgrade tool
pixi global upgrade ruff

# Upgrade all tools
pixi global upgrade-all

# Remove tool
pixi global remove bat
```

## Temporary Execution

### Run command with temporary package

```bash
# Run ruff without installing it in project
pixi exec --spec ruff ruff check .

# Run black
pixi exec --spec black black .

# Run with specific version
pixi exec --spec "python==3.9.*" python script.py
```

## Maintenance

### Update dependencies

```bash
# Update all dependencies to latest compatible versions
pixi update

# Update specific package
pixi update numpy

# Upgrade dependencies (modify manifest)
pixi upgrade
pixi upgrade numpy
```

### Clean up

```bash
# Remove environment directory
pixi clean

# Clean package cache
pixi clean cache
```

### Check project status

```bash
# Show project information
pixi info

# Show detailed information
pixi info --extended

# JSON output for scripting
pixi info --json
```

## Tips and Tricks

### Use shell aliases

```bash
# Add to ~/.bashrc or ~/.zshrc
alias pr="pixi run"
alias ps="pixi shell"
alias pa="pixi add"
```

### Quick project setup script

```bash
#!/bin/bash
# setup-pixi-project.sh

PROJECT_NAME=$1
pixi init $PROJECT_NAME
cd $PROJECT_NAME

# Add common packages
pixi add python numpy pandas matplotlib

# Add dev tools
pixi add --feature dev pytest black ruff mypy

# Define common tasks
pixi task add test "pytest tests/"
pixi task add format "black ."
pixi task add lint "ruff check ."

echo "Project $PROJECT_NAME created and configured!"
```

### Check if in pixi project

```bash
if [ -f "pixi.toml" ] || [ -f "pyproject.toml" ]; then
    echo "In pixi project"
else
    echo "Not in pixi project"
fi
```

### List all tasks across environments

```bash
pixi task list
```
