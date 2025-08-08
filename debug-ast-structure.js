// Debug script to check AST structure
const { MarkdownParser } = require('./dist/parser/utils/markdown-parser.js');

async function debugASTStructure() {
  const parser = new MarkdownParser();
  
  const testContent = `
# Test Project

## Build Commands

\`\`\`bash
make
make all
make build
\`\`\`
  `;
  
  console.log('Testing AST structure...');
  
  try {
    const result = await parser.parseContent(testContent);
    
    if (result.success) {
      console.log('Parse successful!');
      console.log('AST structure:', JSON.stringify(result.data.ast, null, 2));
      
      // Check for code blocks specifically
      function findCodeBlocks(node, depth = 0) {
        const indent = '  '.repeat(depth);
        if (Array.isArray(node)) {
          console.log(`${indent}Array with ${node.length} items`);
          node.forEach((item, index) => {
            console.log(`${indent}[${index}]:`);
            findCodeBlocks(item, depth + 1);
          });
        } else if (node && typeof node === 'object') {
          console.log(`${indent}Object type: ${node.type || 'unknown'}`);
          if (node.type === 'code' || node.type === 'code_block') {
            console.log(`${indent}*** FOUND CODE BLOCK ***`);
            console.log(`${indent}Language: ${node.lang || node.language || 'none'}`);
            console.log(`${indent}Text: ${node.text || node.content || 'none'}`);
          }
          
          // Traverse children
          if (node.children) {
            console.log(`${indent}Children (${node.children.length}):`);
            findCodeBlocks(node.children, depth + 1);
          }
          if (node.tokens) {
            console.log(`${indent}Tokens (${node.tokens.length}):`);
            findCodeBlocks(node.tokens, depth + 1);
          }
        } else {
          console.log(`${indent}Primitive: ${node}`);
        }
      }
      
      console.log('\n=== SEARCHING FOR CODE BLOCKS ===');
      findCodeBlocks(result.data.ast);
      
    } else {
      console.log('Parse failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

debugASTStructure();