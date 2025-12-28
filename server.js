import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';

const port = process.env.PORT || 3000;
const app = express();
const server = createServer(app);
const io = new Server(server, {
	cors: { origin: '*' }
});

// Import the bundled game server
async function startServer() {
	try {
		const { setupGameServer } = await import('./build/gameServer.js');
		setupGameServer(io);
	} catch (e) {
		console.error('Could not load gameServer module. Make sure to build first:', e);
		process.exit(1);
	}

	app.use(handler);

	server.listen(port, () => {
		console.log(`Coup game server running on http://localhost:${port}`);
	});
}

startServer();
