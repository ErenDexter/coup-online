import type { Server, Socket } from 'socket.io';
import { db } from '../../db';
import { rooms, players } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { GAME_CONFIG } from '../../game/coup';
import { activeGames, restoreGameStateFromDb, generateRoomCode } from '../state';

/**
 * Handle room creation
 */
export function handleCreateRoom(socket: Socket) {
	return async (data: { hostName: string }, callback: (response: any) => void) => {
		const code = generateRoomCode();

		const [room] = await db
			.insert(rooms)
			.values({
				code,
				hostName: data.hostName,
				status: 'waiting'
			})
			.returning();

		const [player] = await db
			.insert(players)
			.values({
				roomId: room.id,
				name: data.hostName,
				socketId: socket.id,
				coins: GAME_CONFIG.STARTING_COINS,
				isHost: true
			})
			.returning();

		socket.join(code);

		callback({
			success: true,
			code,
			roomId: room.id,
			playerId: player.id,
			authToken: player.authToken,
			isHost: true
		});
	};
}

/**
 * Handle room joining (or reconnection with token)
 */
export function handleJoinRoom(io: Server, socket: Socket) {
	return async (
		data: { code: string; playerName: string; authToken?: string },
		callback: (response: any) => void
	) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.code, data.code));

		if (!room) {
			callback({ success: false, error: 'Room not found' });
			return;
		}

		// If authToken provided, try to authenticate existing player
		if (data.authToken) {
			const existingPlayer = await db
				.select()
				.from(players)
				.where(eq(players.roomId, room.id))
				.then((ps) => ps.find((p) => p.authToken === data.authToken));

			if (existingPlayer) {
				await handleReconnection(io, socket, room, existingPlayer, callback);
				return;
			}
			// Invalid token - fall through to create new player
		}

		// Check if name is already taken (without valid token)
		const nameTaken = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id))
			.then((ps) => ps.some((p) => p.name === data.playerName));

		if (nameTaken) {
			callback({
				success: false,
				error: 'Name already taken. If reconnecting, please use the same browser.'
			});
			return;
		}

		if (room.status !== 'waiting') {
			callback({ success: false, error: 'Game already started' });
			return;
		}

		// Create new player
		const [player] = await db
			.insert(players)
			.values({
				roomId: room.id,
				name: data.playerName,
				socketId: socket.id,
				coins: GAME_CONFIG.STARTING_COINS,
				isHost: false
			})
			.returning();

		socket.join(room.code);

		const roomPlayers = await db.select().from(players).where(eq(players.roomId, room.id));

		// Notify ALL players in room (including the new one via broadcast)
		io.to(room.code).emit('player_joined', {
			player: { id: player.id, name: player.name },
			players: roomPlayers.map((p) => ({
				id: p.id,
				name: p.name,
				isAlive: p.isAlive,
				isHost: p.isHost,
				coins: p.coins,
				isConnected: true
			}))
		});

		console.log(
			`Player ${player.name} joined room ${room.code}, total players: ${roomPlayers.length}`
		);

		callback({
			success: true,
			roomId: room.id,
			playerId: player.id,
			authToken: player.authToken,
			isHost: false,
			players: roomPlayers.map((p) => ({
				id: p.id,
				name: p.name,
				isAlive: p.isAlive,
				isHost: p.isHost,
				coins: p.coins,
				isConnected: true
			}))
		});
	};
}

/**
 * Handle player reconnection
 */
async function handleReconnection(
	io: Server,
	socket: Socket,
	room: { id: string; code: string; status: string },
	existingPlayer: { id: string; name: string; authToken: string; isHost: boolean },
	callback: (response: any) => void
) {
	await db.update(players).set({ socketId: socket.id }).where(eq(players.id, existingPlayer.id));

	socket.join(room.code);
	console.log(`Player ${existingPlayer.name} reconnected to room ${room.code}`);

	const roomPlayers = await db.select().from(players).where(eq(players.roomId, room.id));

	// Update in-memory game state if game is running
	let gameState = activeGames.get(room.id);

	// If game is playing but no in-memory state (server restart), restore from DB
	if (!gameState && room.status === 'playing') {
		console.log(`[RECONNECT] No in-memory state for room ${room.id}, restoring from DB...`);
		const restoredState = await restoreGameStateFromDb(room.id);
		if (restoredState) {
			gameState = restoredState;
		}
	}

	if (gameState) {
		let playerState = gameState.players.get(existingPlayer.id);

		// If player not in game state (edge case), add them from DB
		if (!playerState) {
			const dbPlayer = roomPlayers.find((p) => p.id === existingPlayer.id);
			if (dbPlayer) {
				playerState = {
					id: dbPlayer.id,
					name: dbPlayer.name,
					socketId: socket.id,
					cards: (dbPlayer.cards as any[]) || [],
					coins: dbPlayer.coins,
					isAlive: dbPlayer.isAlive,
					isConnected: true
				};
				gameState.players.set(dbPlayer.id, playerState);
			}
		}

		if (playerState) {
			playerState.socketId = socket.id;
			playerState.isConnected = true;

			// Convert revealedCards Map to object for sending
			const revealedCardsObj: Record<string, string[]> = {};
			for (const [playerId, cards] of gameState.revealedCards) {
				revealedCardsObj[playerId] = cards;
			}

			// Send current game state to reconnected player
			const playersArray = Array.from(gameState.players.values());
			socket.emit('game_started', {
				yourId: existingPlayer.id,
				yourCards: playerState.cards,
				yourCoins: playerState.coins,
				players: playersArray.map((p) => ({
					id: p.id,
					name: p.name,
					coins: p.coins,
					cardCount: p.cards.length,
					isAlive: p.isAlive,
					isHost: roomPlayers.find((rp) => rp.id === p.id)?.isHost,
					isConnected: p.isConnected
				})),
				currentTurn: playersArray[gameState.currentTurnIndex]?.id,
				revealedCards: revealedCardsObj
			});
		}
	}

	// Notify others of reconnection
	io.to(room.code).emit('player_reconnected', {
		playerId: existingPlayer.id,
		playerName: existingPlayer.name
	});

	callback({
		success: true,
		roomId: room.id,
		playerId: existingPlayer.id,
		authToken: existingPlayer.authToken,
		isHost: existingPlayer.isHost,
		players: roomPlayers.map((p) => ({
			id: p.id,
			name: p.name,
			isAlive: p.isAlive,
			isHost: p.isHost,
			coins: p.coins,
			isConnected: gameState ? (gameState.players.get(p.id)?.isConnected ?? true) : true
		}))
	});
}
