import type { Server, Socket } from 'socket.io';
import {
	handleCreateRoom,
	handleJoinRoom,
	handleStartGame,
	handlePlayerAction,
	handleExchangeComplete,
	handleLoseCard,
	handlePass,
	handleChallenge,
	handleBlock,
	handleChallengeBlock,
	handleDisconnect
} from './handlers';

export function setupGameServer(io: Server) {
	io.on('connection', (socket: Socket) => {
		console.log('Player connected:', socket.id);

		// Room management
		socket.on('create_room', handleCreateRoom(socket));
		socket.on('join_room', handleJoinRoom(io, socket));

		// Game flow
		socket.on('start_game', handleStartGame(io, socket));
		socket.on('player_action', handlePlayerAction(io, socket));
		socket.on('exchange_complete', handleExchangeComplete(io, socket));
		socket.on('lose_card', handleLoseCard(io, socket));

		// Challenge/Block/Pass responses
		socket.on('pass', handlePass(io, socket));
		socket.on('challenge', handleChallenge(io, socket));
		socket.on('block', handleBlock(io, socket));
		socket.on('challenge_block', handleChallengeBlock(io, socket));

		// Disconnect
		socket.on('disconnect', handleDisconnect(io, socket));
	});
}

export { activeGames, restoreGameStateFromDb } from './state';
