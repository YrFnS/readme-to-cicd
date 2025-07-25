# Multi-Language Polyglot Project

This project uses multiple programming languages and frameworks to test language detection accuracy.

## Frontend (JavaScript/TypeScript)

```javascript
// React component
import React from 'react';

function App() {
  return <div>Hello World</div>;
}
```

```typescript
interface User {
  id: number;
  name: string;
}

const users: User[] = [];
```

## Backend (Python)

```python
# Flask API
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/users')
def get_users():
    return jsonify([])
```

## Database (SQL)

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE
);

INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
```

## Infrastructure (Go)

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Hello, World!")
}
```

## DevOps (Shell/Docker)

```bash
#!/bin/bash
docker build -t myapp .
docker run -p 8080:8080 myapp
```

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Mobile (Swift/Kotlin)

```swift
import UIKit

class ViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        print("Hello iOS")
    }
}
```

```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        println("Hello Android")
    }
}
```

## Data Science (R/Julia)

```r
# R analysis
library(ggplot2)
data <- read.csv("data.csv")
ggplot(data, aes(x=x, y=y)) + geom_point()
```

```julia
# Julia computation
using DataFrames
df = DataFrame(x=[1,2,3], y=[4,5,6])
println(df)
```

## Systems Programming (Rust/C++)

```rust
fn main() {
    println!("Hello from Rust!");
}

struct Point {
    x: i32,
    y: i32,
}
```

```cpp
#include <iostream>

int main() {
    std::cout << "Hello from C++!" << std::endl;
    return 0;
}
```

## Installation Commands

```bash
# Node.js
npm install
yarn install

# Python
pip install -r requirements.txt
poetry install

# Go
go mod download
go build

# Rust
cargo build
cargo install

# Ruby
bundle install
gem install rails

# PHP
composer install

# Java
mvn install
gradle build
```

## Build Commands

```bash
# Frontend builds
npm run build
yarn build
webpack --mode production

# Backend builds
python setup.py build
go build -o server
cargo build --release
mvn compile
gradle assemble

# Mobile builds
xcodebuild -scheme MyApp
./gradlew assembleRelease
```

## Test Commands

```bash
# JavaScript/TypeScript
npm test
yarn test
jest
vitest

# Python
pytest
python -m unittest
nose2

# Go
go test ./...
go test -race

# Rust
cargo test
cargo test --release

# Java
mvn test
gradle test

# Ruby
rspec
rake test
```

This project demonstrates how a polyglot application might be structured with multiple languages working together.