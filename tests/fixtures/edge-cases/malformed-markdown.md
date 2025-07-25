# Malformed Markdown Test

This file contains various markdown syntax errors to test parser robustness.

## Unclosed Code Block

```javascript
function test() {
  console.log("missing closing backticks");

## Missing Header Levels

### This is h3
##### This is h5 (skipped h4)

## Broken Links

[Broken link](http://example.com
[Another broken link]()
[Link with no URL]

## Malformed Lists

- Item 1
  - Nested item
- Item 2
  * Mixed list markers
  1. Mixed with numbered
- Item 3

## Invalid HTML

<div class="unclosed">
<p>Unclosed paragraph
<img src="missing-alt">

## Weird Code Blocks

```
No language specified
```

```unknown-language
This language doesn't exist
```

```bash
# Command with weird characters
npm install @scope/package-name™
```

## Table Issues

| Column 1 | Column 2
| Missing separator
| Too | Many | Separators |

## Special Characters

This has unicode: 🚀 ✨ 🎉
And some weird chars: ™ © ® ¿ ¡

## Empty Sections

### 

### Empty Header Above

## Duplicate Headers

## Installation

First installation section.

## Installation

Second installation section with same name.

## Mixed Content

Some text here.

```bash
npm install
```

More text mixed with code.

```python
print("hello")
```

And even more text.