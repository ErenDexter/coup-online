import type { Server, Socket } from 'socket.io';
import { db } from '../../db';
import { rooms, players } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { activeGames } from '../state';
import { resolveAction, nextTurn, autoLoseInfluence } from '../gameLogic';

/**
 * Handle player disconnect
 */
export function handleDisconnect(io: Server, socket: Socket) {
	return async () => {
		console.log('Player disconnected:', socket.id);

		// Find which game this player was in
		for (const [roomId, gameState] of activeGames.entries()) {
			const player = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);

			if (player) {
				player.isConnected = false;

				// Get the room code
				const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
				if (room) {
					// Notify other players
					io.to(room.code).emit('player_disconnected', {
						playerId: player.id,
						playerName: player.name
					});

					// Handle if this player needs to act
					await handleDisconnectedPlayerAction(io, room.code, gameState, player);
				}
				break;
			}
		}

		// Also check lobby rooms (not yet started games)
		const playerInDb = await db.select().from(players).where(eq(players.socketId, socket.id));
		if (playerInDb.length > 0) {
			const player = playerInDb[0];
			const [room] = await db.select().from(rooms).where(eq(rooms.id, player.roomId));
			if (room && room.status === 'waiting') {
				// Notify lobby that player disconnected
				io.to(room.code).emit('player_disconnected', {
					playerId: player.id,
					playerName: player.name
				});
			}
		}
	};
}

/**
 * Handle actions needed when a player disconnects mid-game
 */
async function handleDisconnectedPlayerAction(
	io: Server,
	roomCode: string,
	gameState: any,
	player: any
) {
	// Case 1: Player needs to choose a card to lose
	if (gameState.waitingForInfluenceLoss?.playerId === player.id) {
		await autoLoseInfluence(io, roomCode, gameState, player);

		// Continue game flow
		const afterAction = gameState.waitingForInfluenceLoss.afterAction;
		gameState.waitingForInfluenceLoss = undefined;

		if (afterAction === 'resolve') {
			resolveAction(io, roomCode, gameState);
		} else {
			gameState.pendingAction = null;
			nextTurn(io, roomCode, gameState);
		}
		return;
	}

	// Case 2: Player was in the waiting list for pass/challenge/block
	if (gameState.pendingAction?.waitingFor?.includes(player.id)) {
		// Auto-pass for disconnected player
		gameState.pendingAction.waitingFor = gameState.pendingAction.waitingFor.filter(
			(id: string) => id !== player.id
		);
		if (!gameState.pendingAction.passed) {
			gameState.pendingAction.passed = [];
		}
		gameState.pendingAction.passed.push(player.id);

		io.to(roomCode).emit('player_passed', {
			player: player.name,
			waitingFor: gameState.pendingAction.waitingFor,
			wasDisconnected: true
		});

		// Check if everyone has now passed
		if (gameState.pendingAction.waitingFor.length === 0) {
			if (gameState.pendingAction.blocked) {
				io.to(roomCode).emit('action_blocked_success', {
					blocker: gameState.players.get(gameState.pendingAction.blocker!)?.name || 'Unknown'
				});
				gameState.pendingAction = null;
				nextTurn(io, roomCode, gameState);
			} else {
				resolveAction(io, roomCode, gameState);
			}
		}
	}
}
