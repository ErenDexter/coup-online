import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function buildServer() {
	try {
		await build({
			entryPoints: [resolve(rootDir, 'src/lib/server/socket/gameServer.ts')],
			bundle: true,
			platform: 'node',
			target: 'node18',
			format: 'esm',
			outfile: resolve(rootDir, 'build/gameServer.js'),
			external: ['better-sqlite3'],
			sourcemap: true,
			minify: false
		});
		console.log('✓ Socket server built successfully');
	} catch (error) {
		console.error('Failed to build socket server:', error);
		process.exit(1);
	}
}

buildServer();
