#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-build validation...\n');

// Common JSX syntax errors to check for
const JSX_VALIDATION_RULES = [
  {
    pattern: /[^&]<\d+%/g,
    message: 'Found unescaped < character in percentage (use &lt; instead)',
    fix: (content) => content.replace(/([^&])<(\d+%)/g, '$1&lt;$2')
  }
];

let hasErrors = false;

function validateFile(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(process.cwd(), filePath);
  
  console.log(`📄 Validating: ${relativePath}`);
  
  JSX_VALIDATION_RULES.forEach(rule => {
    const matches = content.match(rule.pattern);
    if (matches) {
      console.log(`❌ ERROR in ${relativePath}: ${rule.message}`);
      matches.forEach(match => console.log(`   Found: "${match}"`));
      
      if (rule.fix) {
        console.log(`🔧 Auto-fixing...`);
        const fixedContent = rule.fix(content);
        fs.writeFileSync(filePath, fixedContent);
        console.log(`✅ Fixed automatically`);
      } else {
        hasErrors = true;
      }
    }
  });
}

function validateDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      validateDirectory(filePath);
    } else {
      validateFile(filePath);
    }
  });
}

// Run validation
console.log('🔍 Validating pages directory...');
validateDirectory('./pages');

console.log('\n🔍 Validating components directory...');
validateDirectory('./components');

// Summary
console.log('\n📊 Validation Summary:');
if (hasErrors) {
  console.log('❌ Build validation FAILED - Please fix errors before building');
  process.exit(1);
} else {
  console.log('✅ Build validation PASSED - Ready to build!');
  process.exit(0);
}
