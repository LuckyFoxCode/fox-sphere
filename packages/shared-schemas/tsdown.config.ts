import { defineConfig } from 'tsdown'

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
