//go:build linux && amd64
// +build linux,amd64

package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Printf("Running on %s/%s\n", runtime.GOOS, runtime.GOARCH)
}