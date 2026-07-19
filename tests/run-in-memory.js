const fs = require('fs');
const path = require('path');
const ts = require('typescript');

function transpileFile(tsPath, jsPath) {
  console.log(`Transpiling ${path.basename(tsPath)}...`);
  const tsCode = fs.readFileSync(tsPath, 'utf8');
  
  // Strip TypeScript imports that point to .ts files and resolve them to .js in transpiled code
  let cleanCode = tsCode.replace(/from\s+['"]([^'"]+)\.ts['"]/g, "from '$1'");
  
  const result = ts.transpileModule(cleanCode, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2017,
      esModuleInterop: true,
      resolveJsonModule: true
    }
  });

  fs.writeFileSync(jsPath, result.outputText, 'utf8');
}

async function main() {
  const root = path.resolve(__dirname, '..');
  
  // Paths to transpile
  const files = [
    {
      ts: path.join(root, 'src/lib/services/longitudinal-brain.ts'),
      js: path.join(root, 'src/lib/services/longitudinal-brain.js')
    },
    {
      ts: path.join(root, 'src/lib/services/medical-graph.ts'),
      js: path.join(root, 'src/lib/services/medical-graph.js')
    },
    {
      ts: path.join(root, 'tests/graph-tests.ts'),
      js: path.join(root, 'tests/graph-tests.js')
    },
    {
      ts: path.join(root, 'tests/cognitive-tests.ts'),
      js: path.join(root, 'tests/cognitive-tests.js')
    }
  ];

  try {
    // 1. Transpile all files
    for (const f of files) {
      transpileFile(f.ts, f.js);
    }

    console.log('\nRunning tests...\n');

    // 2. Spawn node process to run tests (isolated execution)
    const { execSync } = require('child_process');
    try {
      console.log('--- RUNNING GRAPH TESTS ---');
      execSync('node tests/graph-tests.js', { stdio: 'inherit', cwd: root });
      
      console.log('\n--- RUNNING COGNITIVE OS TESTS ---');
      execSync('node tests/cognitive-tests.js', { stdio: 'inherit', cwd: root });
    } catch (execErr) {
      console.error('Test execution failed with error.');
      process.exit(1);
    }

  } finally {
    // 3. Clean up compiled JS files
    console.log('\nCleaning up compiled JS files...');
    for (const f of files) {
      if (fs.existsSync(f.js)) {
        fs.unlinkSync(f.js);
      }
    }
    console.log('Cleanup completed.');
  }
}

main();
