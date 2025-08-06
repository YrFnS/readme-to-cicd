const { LanguageDetector } = require('./src/parser/analyzers/language-detector');
const { MarkdownParser } = require('./src/parser/utils/markdown-parser');

async function debugLanguageDetection() {
  console.log('Testing LanguageDetector...');
  
  const parser = new MarkdownParser();
  const detector = new LanguageDetector();
  
  const testContent = `# Test Project

This is a Python project with testing.

## Installation

\`\`\`bash
pip install -r requirements.txt
\`\`\`

## Testing

\`\`\`python
import pytest

def test_example():
    assert True
\`\`\`

## Running

\`\`\`python
python app.py
\`\`\`
`;

  try {
    // Parse the markdown
    console.log('Parsing markdown...');
    const parseResult = await parser.parseContent(testContent);
    
    if (!parseResult.success) {
      console.error('Markdown parsing failed:', parseResult.error);
      return;
    }
    
    console.log('AST structure:', JSON.stringify(parseResult.data.ast, null, 2));
    
    // Test language detection
    console.log('\nTesting language detection...');
    const detectionResult = detector.detectWithContext(parseResult.data.ast, testContent);
    
    console.log('Detection result:', JSON.stringify(detectionResult, null, 2));
    
    console.log('\nLanguages detected:', detectionResult.languages.length);
    console.log('Contexts generated:', detectionResult.contexts.length);
    
    if (detectionResult.contexts.length > 0) {
      console.log('\nContext details:');
      detectionResult.contexts.forEach((ctx, i) => {
        console.log(`Context ${i + 1}:`, {
          language: ctx.language,
          confidence: ctx.confidence,
          evidenceCount: ctx.evidence.length
        });
      });
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

debugLanguageDetection();