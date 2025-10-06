# Installation Guide

## Prerequisites

### Node.js
- Node.js 14.0.0 or higher
- npm or yarn package manager

### Python (Optional)
For advanced embedding features:
- Python 3.8 or higher
- pip package manager

### Rust (Optional)
For high-performance indexing:
- Rust 1.70.0 or higher
- Cargo package manager

## Installation Methods

### 1. Global Installation (Recommended)

```bash
npm install -g context-rag
```

After installation, verify it works:
```bash
context-rag --version
context-rag --help
```

### 2. Local Project Installation

```bash
npm install context-rag
npx context-rag --help
```

### 3. Development Installation

```bash
git clone https://github.com/yourusername/context-rag.git
cd context-rag
npm install
npm link
```

## Python Dependencies (Optional)

For advanced embedding features, install Python dependencies:

```bash
pip install -r python/requirements.txt
```

This includes:
- `sentence-transformers` - For semantic embeddings
- `numpy` - For numerical operations
- `torch` - For deep learning models

## Rust Dependencies (Optional)

For high-performance indexing, compile the Rust components:

```bash
cargo build --release
```

## Verification

Test your installation:

```bash
# Initialize a test project
mkdir test-context-rag
cd test-context-rag
echo "# Test Project" > README.md

# Initialize context-rag
context-rag init

# Create an index
context-rag index

# Test search
context-rag query "test project"
```

## Troubleshooting

### Command Not Found

If `context-rag` command is not found after global installation:

1. Check npm global bin directory:
   ```bash
   npm config get prefix
   ```

2. Add to your PATH:
   ```bash
   export PATH=$PATH:$(npm config get prefix)/bin
   ```

### Python Dependencies Issues

If you encounter Python-related errors:

1. Ensure Python 3.8+ is installed:
   ```bash
   python3 --version
   ```

2. Install dependencies in a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r python/requirements.txt
   ```

### Permission Issues

On macOS/Linux, if you get permission errors:

```bash
sudo npm install -g context-rag
```

Or use a Node version manager like nvm to avoid sudo.

### Performance Issues

For better performance:

1. Install Python dependencies for faster embeddings
2. Compile Rust components for faster indexing
3. Use SSD storage for cache directories
4. Increase Node.js memory limit for large projects:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

## Next Steps

After installation, see:
- [Quick Start Guide](./quick-start.md)
- [Configuration Reference](./configuration.md)
- [API Documentation](./api.md)