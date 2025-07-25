# Rust CLI File Processor

A high-performance command-line tool for processing large files with parallel execution and advanced filtering capabilities.

## Features

- ⚡ Blazing fast parallel file processing
- 🔍 Advanced pattern matching and filtering
- 📊 Built-in statistics and reporting
- 🎨 Colorized output with progress bars
- 🔧 Configurable processing pipelines
- 📝 Multiple output formats (JSON, CSV, XML)
- 🛡️ Memory-safe with zero-cost abstractions
- 🌐 Cross-platform support (Linux, macOS, Windows)

## Installation

### From Releases

Download the latest binary from the [releases page](https://github.com/example/rust-cli-tool/releases).

### Using Cargo

```bash
# Install from crates.io
cargo install file-processor

# Install from source
cargo install --git https://github.com/example/rust-cli-tool.git
```

### From Source

```bash
# Clone repository
git clone https://github.com/example/rust-cli-tool.git
cd rust-cli-tool

# Build release binary
cargo build --release

# Install to system
cargo install --path .
```

### Using Package Managers

```bash
# Homebrew (macOS/Linux)
brew install file-processor

# Scoop (Windows)
scoop install file-processor

# Arch Linux
yay -S file-processor
```

## Usage

### Basic Usage

```bash
# Process a single file
file-processor input.txt

# Process multiple files
file-processor file1.txt file2.txt file3.txt

# Process directory recursively
file-processor --recursive /path/to/directory

# Use glob patterns
file-processor "*.log" --recursive
```

### Advanced Options

```bash
# Parallel processing with custom thread count
file-processor --threads 8 large-file.txt

# Apply filters and transformations
file-processor --filter "error|warning" --case-insensitive input.log

# Output to different formats
file-processor --output results.json --format json input.txt
file-processor --output results.csv --format csv input.txt

# Use custom configuration
file-processor --config config.toml input.txt

# Verbose output with progress
file-processor --verbose --progress input.txt
```

### Configuration File

Create a `config.toml` file for custom settings:

```toml
[processing]
threads = 4
buffer_size = 8192
chunk_size = 1024

[filters]
case_sensitive = false
regex_engine = "fancy"
patterns = [
    "error",
    "warning",
    "critical"
]

[output]
format = "json"
pretty_print = true
include_metadata = true

[logging]
level = "info"
file = "processor.log"
```

## Building

### Prerequisites

- Rust 1.70.0 or higher
- Cargo (comes with Rust)

### Development Build

```bash
# Clone repository
git clone https://github.com/example/rust-cli-tool.git
cd rust-cli-tool

# Build debug version
cargo build

# Run tests
cargo test

# Run with arguments
cargo run -- --help
```

### Release Build

```bash
# Build optimized release binary
cargo build --release

# Run benchmarks
cargo bench

# Generate documentation
cargo doc --open
```

### Cross-Compilation

```bash
# Install target
rustup target add x86_64-pc-windows-gnu

# Build for Windows
cargo build --release --target x86_64-pc-windows-gnu

# Build for multiple targets
cargo build --release --target x86_64-unknown-linux-gnu
cargo build --release --target x86_64-apple-darwin
```

## Testing

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_file_processing

# Run integration tests
cargo test --test integration

# Run tests with coverage
cargo tarpaulin --out Html

# Run benchmarks
cargo bench

# Run clippy linting
cargo clippy -- -D warnings

# Format code
cargo fmt
```

## Project Structure

```
├── src/
│   ├── main.rs              # Application entry point
│   ├── lib.rs               # Library root
│   ├── cli/                 # Command-line interface
│   │   ├── mod.rs
│   │   ├── args.rs          # Argument parsing
│   │   └── config.rs        # Configuration handling
│   ├── processor/           # Core processing logic
│   │   ├── mod.rs
│   │   ├── engine.rs        # Processing engine
│   │   ├── filters.rs       # Filtering logic
│   │   └── parallel.rs      # Parallel execution
│   ├── output/              # Output formatting
│   │   ├── mod.rs
│   │   ├── json.rs
│   │   ├── csv.rs
│   │   └── xml.rs
│   └── utils/               # Utility functions
│       ├── mod.rs
│       ├── progress.rs      # Progress reporting
│       └── logging.rs       # Logging utilities
├── tests/                   # Integration tests
├── benches/                 # Benchmarks
├── examples/                # Usage examples
├── docs/                    # Documentation
└── scripts/                 # Build scripts
```

## Dependencies

Key dependencies used in this project:

```toml
[dependencies]
clap = { version = "4.0", features = ["derive"] }
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
regex = "1.0"
rayon = "1.7"
indicatif = "0.17"
anyhow = "1.0"
thiserror = "1.0"
tracing = "0.1"
tracing-subscriber = "0.3"

[dev-dependencies]
criterion = "0.5"
tempfile = "3.0"
assert_cmd = "2.0"
predicates = "3.0"
```

## Performance

### Benchmarks

| File Size | Processing Time | Memory Usage | Throughput |
|-----------|----------------|--------------|------------|
| 1MB | 15ms | 2MB | 67MB/s |
| 100MB | 1.2s | 8MB | 83MB/s |
| 1GB | 12s | 12MB | 85MB/s |
| 10GB | 118s | 15MB | 87MB/s |

### Optimization Features

- Zero-copy string processing where possible
- Memory-mapped file I/O for large files
- SIMD optimizations for pattern matching
- Lock-free data structures for parallel processing
- Efficient memory allocation with custom allocators

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repository
git clone https://github.com/yourusername/rust-cli-tool.git
cd rust-cli-tool

# Install development dependencies
cargo install cargo-tarpaulin cargo-audit cargo-outdated

# Run pre-commit checks
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --all-features
cargo audit
```

### Submitting Changes

1. Create a feature branch
2. Make your changes
3. Add tests for new functionality
4. Run the full test suite
5. Update documentation if needed
6. Submit a pull request

## License

This project is dual-licensed under either:

- Apache License, Version 2.0 ([LICENSE-APACHE](LICENSE-APACHE))
- MIT License ([LICENSE-MIT](LICENSE-MIT))

at your option.

## Acknowledgments

- The Rust community for excellent tooling and libraries
- Contributors who have helped improve this project
- Users who have provided feedback and bug reports