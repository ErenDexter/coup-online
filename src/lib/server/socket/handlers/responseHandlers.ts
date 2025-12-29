import type { Server, Socket } from 'socket.io';
import { db } from '../../db';
import { rooms, players } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { shuffleDeck, type Card } from '../../game/coup';
import { activeGames, verifyDeckIntegrity } from '../state';
import { resolveAction, loseInfluence, nextTurn } from '../gameLogic';

/**
 * Handle pass on challenge/block opportunity
 */
export function handlePass(io: Server, socket: Socket) {
	return async (data: { roomId: string }) => {
		console.log('Pass received from socket:', socket.id, 'for room:', data.roomId);

		const gameState = activeGames.get(data.roomId);
		if (!gameState) {
			console.log('Pass failed: no game state');
			socket.emit('error', { message: 'Game not found' });
			return;
		}
		if (!gameState.pendingAction) {
			console.log('Pass failed: no pending action');
			socket.emit('error', { message: 'No action to respond to' });
			return;
		}

		const player = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		if (!player) {
			console.log('Pass failed: player not found for socket:', socket.id);
			socket.emit('error', { message: 'Player not found in game' });
			return;
		}

		if (!gameState.pendingAction.waitingFor) {
			console.log('Pass failed: no waitingFor list');
			socket.emit('error', { message: 'No players waiting to respond' });
			return;
		}

		if (!gameState.pendingAction.waitingFor.includes(player.id)) {
			console.log('Pass failed: player not in waiting list:', player.id);
			socket.emit('error', { message: 'Not waiting for your response' });
			return;
		}

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));
		if (!room) {
			socket.emit('error', { message: 'Room not found' });
			return;
		}

		console.log(`Player ${player.name} passed in room ${room.code}`);

		// Add player to passed list
		if (!gameState.pendingAction.passed) {
			gameState.pendingAction.passed = [];
		}
		if (!gameState.pendingAction.passed.includes(player.id)) {
			gameState.pendingAction.passed.push(player.id);
		}

		// Remove from waiting list
		gameState.pendingAction.waitingFor = gameState.pendingAction.waitingFor.filter(
			(id) => id !== player.id
		);

		io.to(room.code).emit('player_passed', {
			player: player.name,
			waitingFor: gameState.pendingAction.waitingFor
		});

		// If everyone has passed, resolve the action
		if (gameState.pendingAction.waitingFor.length === 0) {
			console.log('All players passed, resolving...');
			if (gameState.pendingAction.blocked) {
				// Block was successful, action is cancelled
				io.to(room.code).emit('action_blocked_success', {
					blocker: gameState.players.get(gameState.pendingAction.blocker!)?.name || 'Unknown'
				});
				gameState.pendingAction = null;
				nextTurn(io, room.code, gameState);
			} else {
				// No one challenged or blocked, resolve the action
				resolveAction(io, room.code, gameState);
			}
		}
	};
}

/**
 * Handle challenge to an action
 */
export function handleChallenge(io: Server, socket: Socket) {
	return async (data: { roomId: string }) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState || !gameState.pendingAction) return;

		const challenger = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		const actor = gameState.players.get(gameState.pendingAction.playerId);

		if (!challenger || !actor) return;

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		const claimedCard = gameState.pendingAction.claimedCard;
		if (!claimedCard) return;

		// Check if actor has claimed card
		const hasCard = actor.cards.includes(claimedCard as Card);

		if (hasCard) {
			// Challenge failed - challenger loses influence
			io.to(room.code).emit('challenge_result', {
				success: false,
				challenger: challenger.name,
				actor: actor.name,
				revealedCard: claimedCard
			});

			// Actor returns card and draws new one (shuffle so they get random card)
			const cardIndex = actor.cards.indexOf(claimedCard as Card);
			actor.cards.splice(cardIndex, 1);
			gameState.deck.push(claimedCard as Card);
			gameState.deck = shuffleDeck(gameState.deck);
			actor.cards.push(gameState.deck.pop()!);
			verifyDeckIntegrity(gameState, 'CHALLENGE_FAILED_ACTOR_SWAP');

			// Save actor's new cards to DB
			await db.update(players).set({ cards: actor.cards }).where(eq(players.id, actor.id));

			// Send updated cards to the actor
			if (actor.socketId) {
				io.to(actor.socketId).emit('cards_updated', { cards: actor.cards });
			}

			// Challenger loses influence, then resolve original action
			loseInfluence(io, room.code, gameState, challenger.id, 'challenge_failed', 'resolve');
		} else {
			// Challenge succeeded - actor loses influence
			io.to(room.code).emit('challenge_result', {
				success: true,
				challenger: challenger.name,
				actor: actor.name
			});

			// Actor loses influence, then next turn
			loseInfluence(io, room.code, gameState, actor.id, 'challenge_succeeded', 'next_turn');
		}
	};
}

/**
 * Handle block action
 */
export function handleBlock(io: Server, socket: Socket) {
	return async (data: { roomId: string; blockCard: string }) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState || !gameState.pendingAction) return;

		const blocker = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		if (!blocker) return;

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		gameState.pendingAction.blocked = true;
		gameState.pendingAction.blocker = blocker.id;
		gameState.pendingAction.blockCard = data.blockCard;

		// Reset waiting list - now everyone except blocker can challenge the block
		const playersArray = Array.from(gameState.players.values());
		gameState.pendingAction.waitingFor = playersArray
			.filter((p) => p.id !== blocker.id && p.isAlive)
			.map((p) => p.id);
		gameState.pendingAction.passed = [];

		io.to(room.code).emit('action_blocked', {
			blocker: blocker.name,
			blockerId: blocker.id,
			blockCard: data.blockCard,
			canChallengeBlock: true,
			waitingFor: gameState.pendingAction.waitingFor
		});
	};
}

/**
 * Handle challenge to a block
 */
export function handleChallengeBlock(io: Server, socket: Socket) {
	return async (data: { roomId: string }) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState || !gameState.pendingAction || !gameState.pendingAction.blocked) return;

		const challenger = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		const blocker = gameState.players.get(gameState.pendingAction.blocker!);

		if (!challenger || !blocker) return;

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		const blockCard = gameState.pendingAction.blockCard;
		if (!blockCard) return;

		// Check if blocker has the claimed block card
		const hasCard = blocker.cards.includes(blockCard as Card);

		if (hasCard) {
			// Challenge failed - challenger loses influence
			io.to(room.code).emit('challenge_block_result', {
				success: false,
				challenger: challenger.name,
				blocker: blocker.name,
				revealedCard: blockCard
			});

			// Blocker returns card and draws new one (shuffle so they get random card)
			const cardIndex = blocker.cards.indexOf(blockCard as Card);
			blocker.cards.splice(cardIndex, 1);
			gameState.deck.push(blockCard as Card);
			gameState.deck = shuffleDeck(gameState.deck);
			blocker.cards.push(gameState.deck.pop()!);
			verifyDeckIntegrity(gameState, 'BLOCK_CHALLENGE_FAILED_BLOCKER_SWAP');

			// Save blocker's new cards to DB
			await db.update(players).set({ cards: blocker.cards }).where(eq(players.id, blocker.id));

			// Send updated cards to the blocker
			if (blocker.socketId) {
				io.to(blocker.socketId).emit('cards_updated', { cards: blocker.cards });
			}

			// Challenger loses influence, block stands, then next turn
			loseInfluence(io, room.code, gameState, challenger.id, 'challenge_failed', 'next_turn');
		} else {
			// Challenge succeeded - blocker loses influence
			io.to(room.code).emit('challenge_block_result', {
				success: true,
				challenger: challenger.name,
				blocker: blocker.name
			});

			// Blocker loses influence, then resolve original action
			gameState.pendingAction.blocked = false;
			loseInfluence(io, room.code, gameState, blocker.id, 'challenge_succeeded', 'resolve');
		}
	};
}
