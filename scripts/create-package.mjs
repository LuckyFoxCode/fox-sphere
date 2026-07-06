#!/usr/bin/env node
// Scaffold a new workspace package under packages/<name>, pre-wired for tsdown.
// Usage:  pnpm new:pkg <name>        e.g.  pnpm new:pkg http-dtos
// Produces a package identical in shape to @fox-sphere/shared-schemas:
// ESM-only, single bundled entry, .d.ts + sourcemaps, exports map.
// See docs/adding-a-package.md.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCOPE = '@fox-sphere'
const TSDOWN_VERSION = '^0.22.2'
const TYPESCRIPT_VERSION = '^6.0.3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const name = process.argv[2]
if (!name) {
	console.error('❌ Package name required.  Usage: pnpm new:pkg <name>')
	process.exit(1)
}
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
	console.error(`❌ "${name}" is not kebab-case (lowercase, hyphen-separated).`)
	process.exit(1)
}

const targetDir = path.join(rootDir, 'packages', name)
if (fs.existsSync(targetDir)) {
	console.error(`❌ packages/${name} already exists.`)
	process.exit(1)
}

const files = {
	'package.json': `${JSON.stringify(
		{
			name: `${SCOPE}/${name}`,
			version: '0.1.0',
			private: true,
			type: 'module',
			main: 'dist/index.js',
			types: 'dist/index.d.ts',
			exports: {
				'.': {
					types: './dist/index.d.ts',
					import: './dist/index.js',
					default: './dist/index.js'
				}
			},
			scripts: {
				build: 'tsdown',
				dev: 'tsdown --watch',
				'type:check': 'tsc --noEmit'
			},
			dependencies: {},
			devDependencies: {
				tsdown: TSDOWN_VERSION,
				typescript: TYPESCRIPT_VERSION
			}
		},
		null,
		2
	)}\n`,

	'tsdown.config.ts': `import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['index.ts'],
	format: ['esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	target: 'esnext',
	outDir: 'dist',
	outExtensions: () => ({ js: '.js' })
})
`,

	'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "rootDir": "./",
    "outDir": "./dist",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["index.ts", "src/**/*"]
}
`,

	'index.ts': `export * from './src/index.js'\n`,

	'src/index.ts': `// Public API of ${SCOPE}/${name}. Re-export your modules here.\nexport {}\n`
}

for (const [rel, content] of Object.entries(files)) {
	const full = path.join(targetDir, rel)
	fs.mkdirSync(path.dirname(full), { recursive: true })
	fs.writeFileSync(full, content)
}

console.log(`✅ Created packages/${name}  (${SCOPE}/${name})

Next:
  1. pnpm install                       # link the new workspace package
  2. add code under packages/${name}/src and re-export from src/index.ts
  3. pnpm --filter ${SCOPE}/${name} build   # or: pnpm build (builds all packages + frontend)
  4. consume it from an app:
       // apps/<app>/package.json
       "dependencies": { "${SCOPE}/${name}": "workspace:*" }
       import { ... } from '${SCOPE}/${name}'
`)
