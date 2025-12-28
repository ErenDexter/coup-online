import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';

// Note: In production, we need to dynamically import the gameServer
// The path may vary based on build output structure
const port = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: { origin: '*' }
});

// Dynamically import the game server setup
async function startServer() {
	try {
		// Try the production build path
		const { setupGameServer } = await import('./build/server/chunks/gameServer.js');
		setupGameServer(io);
	} catch {
		try {
			// Fallback to alternative path
			const { setupGameServer } = await import('./build/server/lib/server/socket/gameServer.js');
			setupGameServer(io);
		} catch (e) {
			console.error('Could not load gameServer module. Make sure to build first:', e);
			process.exit(1);
		}
	}

	app.use(handler);

	server.listen(port, () => {
		console.log(`Coup game server running on http://localhost:${port}`);
	});
}

startServer();
