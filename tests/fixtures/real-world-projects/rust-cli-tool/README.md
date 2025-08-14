# Rust CLI Tool

A command-line tool built with Rust for file processing and data manipulation.

## Features

- 🚀 Fast file processing with Rust performance
- 📝 Multiple output formats (JSON, CSV, XML)
- 🔧 Configurable processing options
- 📊 Built-in statistics and reporting
- 🛡️ Memory-safe operations

## Tech Stack

- **Language**: Rust 1.70+
- **CLI Framework**: Clap 4.0
- **Serialization**: Serde
- **Testing**: Built-in Rust testing
- **Benchmarking**: Criterion

## Installation

### From Source

```bash
git clone <repository-url>
cd rust-cli-tool
cargo build --release
```

### From Crates.io

```bash
cargo install rust-cli-tool
```

## Usage

### Basic Usage

```bash
rust-cli-tool process input.txt --output output.json
```

### Advanced Options

```bash
rust-cli-tool process input.txt \
  --output output.csv \
  --format csv \
  --filter "size > 1000" \
  --sort name \
  --limit 100
```

### Configuration

```bash
rust-cli-tool config --set default-format json
rust-cli-tool config --set max-threads 4
```

## Development

### Prerequisites

- Rust 1.70 or later
- Cargo

### Building

```bash
cargo build
```

### Testing

```bash
cargo test
cargo test --release
```

### Linting

```bash
cargo clippy
cargo fmt --check
```

### Benchmarking

```bash
cargo bench
```

## Project Structure

```
src/
├── main.rs          # Entry point
├── cli.rs           # CLI argument parsing
├── processor.rs     # Core processing logic
├── formats/         # Output format handlers
│   ├── json.rs
│   ├── csv.rs
│   └── xml.rs
├── filters.rs       # Data filtering
├── stats.rs         # Statistics calculation
└── config.rs        # Configuration management
```

## Performance

- Processes 1M records in ~2 seconds
- Memory usage scales linearly with input size
- Multi-threaded processing support
- Zero-copy string operations where possible

## Security

- Input validation and sanitization
- Safe memory operations (no unsafe blocks)
- Dependency security scanning with `cargo audit`
- Fuzzing tests for robustness

## Release Process

1. Update version in `Cargo.toml`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will build and publish release

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `cargo test` and `cargo clippy`
6. Submit a pull request

## License

MIT License