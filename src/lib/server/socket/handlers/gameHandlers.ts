import type { Server, Socket } from 'socket.io';
import { db } from '../../db';
import { rooms, players } from '../../db/schema';
import { eq } from 'drizzle-orm';
import {
	createDeck,
	GAME_CONFIG,
	ACTIONS,
	type GameState,
	type Card,
	shuffleDeck
} from '../../game/coup';
import { activeGames, verifyDeckIntegrity } from '../state';
import { resolveAction, loseInfluence, nextTurn } from '../gameLogic';

/**
 * Handle game start (host only)
 */
export function handleStartGame(io: Server, socket: Socket) {
	return async (data: { code: string; authToken: string }) => {
		const [room] = await db.select().from(rooms).where(eq(rooms.code, data.code));
		if (!room) return;

		// Verify the requesting player is the host using auth token
		const requestingPlayer = await db
			.select()
			.from(players)
			.where(eq(players.roomId, room.id))
			.then((ps) => ps.find((p) => p.authToken === data.authToken));

		if (!requestingPlayer || !requestingPlayer.isHost) {
			socket.emit('error', { message: 'Only the host can start the game' });
			return;
		}

		const roomPlayers = await db.select().from(players).where(eq(players.roomId, room.id));

		if (roomPlayers.length < 2) {
			socket.emit('error', { message: 'Need at least 2 players' });
			return;
		}

		// Initialize game
		const deck = createDeck();
		const gameState: GameState = {
			roomId: room.id,
			players: new Map(),
			deck,
			currentTurnIndex: 0,
			pendingAction: null,
			actionLog: [],
			revealedCards: new Map()
		};

		// Deal cards to players
		roomPlayers.forEach((p) => {
			const playerCards = [deck.pop()!, deck.pop()!];
			gameState.players.set(p.id, {
				id: p.id,
				name: p.name,
				socketId: p.socketId!,
				cards: playerCards,
				coins: GAME_CONFIG.STARTING_COINS,
				isAlive: true,
				isConnected: true
			});

			// Update DB
			db.update(players).set({ cards: playerCards }).where(eq(players.id, p.id)).execute();
		});

		activeGames.set(room.id, gameState);
		verifyDeckIntegrity(gameState, 'GAME_START');

		await db.update(rooms).set({ status: 'playing' }).where(eq(rooms.id, room.id));

		// Send game start to all players
		const playersArray = Array.from(gameState.players.values());
		playersArray.forEach((player) => {
			io.to(player.socketId).emit('game_started', {
				yourId: player.id,
				yourCards: player.cards,
				yourCoins: player.coins,
				players: playersArray.map((p) => ({
					id: p.id,
					name: p.name,
					coins: p.coins,
					cardCount: p.cards.length,
					isAlive: p.isAlive,
					isConnected: p.isConnected
				})),
				currentTurn: playersArray[0].id
			});
		});
	};
}

/**
 * Handle player action declaration
 */
export function handlePlayerAction(io: Server, socket: Socket) {
	return async (data: {
		roomId: string;
		action: string;
		target?: string;
		claimedCard?: string;
	}) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState) return;

		const playersArray = Array.from(gameState.players.values());
		const currentPlayer = playersArray[gameState.currentTurnIndex];

		if (currentPlayer.socketId !== socket.id) {
			socket.emit('error', { message: 'Not your turn' });
			return;
		}

		// Force Coup rule: if player has 10+ coins, they MUST coup
		if (currentPlayer.coins >= GAME_CONFIG.MUST_COUP_AT && data.action !== ACTIONS.COUP) {
			socket.emit('error', {
				message: `You have ${currentPlayer.coins} coins. You must Coup!`
			});
			return;
		}

		const actionTimestamp = Date.now();

		// Set pending action for challenge/block phase
		gameState.pendingAction = {
			playerId: currentPlayer.id,
			action: data.action,
			target: data.target,
			claimedCard: data.claimedCard,
			timestamp: actionTimestamp
		};

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		// Determine who can respond to this action
		const canChallenge = !!data.claimedCard;
		const canBlock =
			data.action === ACTIONS.FOREIGN_AID ||
			data.action === ACTIONS.STEAL ||
			data.action === ACTIONS.ASSASSINATE;

		// If no one can challenge or block, resolve immediately
		if (!canChallenge && !canBlock) {
			resolveAction(io, room.code, gameState);
			return;
		}

		// Track who needs to respond (all players except the actor)
		const respondingPlayers = playersArray
			.filter((p) => p.id !== currentPlayer.id && p.isAlive)
			.map((p) => p.id);

		gameState.pendingAction.waitingFor = respondingPlayers;
		gameState.pendingAction.passed = [];

		// Broadcast action to all players
		io.to(room.code).emit('action_declared', {
			player: currentPlayer.name,
			playerId: currentPlayer.id,
			action: data.action,
			target: data.target,
			canChallenge,
			canBlock,
			waitingFor: respondingPlayers
		});
	};
}

/**
 * Handle exchange completion (Ambassador action)
 */
export function handleExchangeComplete(io: Server, socket: Socket) {
	return async (data: { roomId: string; keptCards: string[] }) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState) {
			socket.emit('error', { message: 'Game not found' });
			return;
		}

		const player = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		if (!player) {
			socket.emit('error', { message: 'Player not found' });
			return;
		}

		if (!gameState.pendingAction?.drawnCards) {
			socket.emit('error', { message: 'No exchange in progress' });
			return;
		}

		const drawnCards = gameState.pendingAction.drawnCards;
		const allCards = [...player.cards, ...drawnCards];
		const originalCardCount = player.cards.length;

		console.log(
			`[EXCHANGE_COMPLETE] ${player.name} has ${player.cards.join(', ')}, drew ${drawnCards.join(', ')}`
		);
		console.log(`[EXCHANGE_COMPLETE] Keeping: ${data.keptCards.join(', ')}`);

		// Validate kept cards count matches original hand size
		if (data.keptCards.length !== originalCardCount) {
			socket.emit('error', { message: `Must keep exactly ${originalCardCount} cards` });
			return;
		}

		// Validate all kept cards are from the pool of available cards
		const availableCardsCopy = [...allCards];
		for (const keptCard of data.keptCards) {
			const idx = availableCardsCopy.indexOf(keptCard as Card);
			if (idx === -1) {
				socket.emit('error', { message: `Invalid card selection: ${keptCard}` });
				console.error(
					`[EXCHANGE ERROR] ${player.name} tried to keep '${keptCard}' which is not in ${allCards.join(', ')}`
				);
				return;
			}
			availableCardsCopy.splice(idx, 1);
		}

		// Return non-kept cards to deck
		const returnedCards = availableCardsCopy;
		console.log(`[EXCHANGE_COMPLETE] Returning to deck: ${returnedCards.join(', ')}`);

		gameState.deck.push(...returnedCards);
		gameState.pendingAction.drawnCards = undefined;

		player.cards = data.keptCards as Card[];
		verifyDeckIntegrity(gameState, 'EXCHANGE_COMPLETE');

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		// Update DB
		await db.update(players).set({ cards: player.cards }).where(eq(players.id, player.id));

		io.to(room.code).emit('action_resolved', {
			action: ACTIONS.EXCHANGE,
			actor: player.name
		});

		gameState.pendingAction = null;
		nextTurn(io, room.code, gameState);
	};
}

/**
 * Handle lose card selection
 */
export function handleLoseCard(io: Server, socket: Socket) {
	return async (data: { roomId: string; card: string }) => {
		const gameState = activeGames.get(data.roomId);
		if (!gameState) return;

		const player = Array.from(gameState.players.values()).find((p) => p.socketId === socket.id);
		if (!player) return;

		// Verify this player was supposed to lose influence
		if (
			!gameState.waitingForInfluenceLoss ||
			gameState.waitingForInfluenceLoss.playerId !== player.id
		) {
			socket.emit('error', { message: 'Not your turn to lose a card' });
			return;
		}

		const cardIndex = player.cards.indexOf(data.card as Card);
		if (cardIndex > -1) {
			player.cards.splice(cardIndex, 1);
			// Track revealed card
			const currentRevealed = gameState.revealedCards.get(player.id) || [];
			gameState.revealedCards.set(player.id, [...currentRevealed, data.card as Card]);
		}

		if (player.cards.length === 0) {
			player.isAlive = false;
		}

		const [room] = await db.select().from(rooms).where(eq(rooms.id, data.roomId));

		io.to(room.code).emit('card_lost', {
			player: player.name,
			card: data.card,
			cardsRemaining: player.cards.length,
			isAlive: player.isAlive
		});

		// Update DB - include revealed cards
		const currentRevealedCards = gameState.revealedCards.get(player.id) || [];
		await db
			.update(players)
			.set({ cards: player.cards, isAlive: player.isAlive, revealedCards: currentRevealedCards })
			.where(eq(players.id, player.id));

		// Get what should happen after and clear the waiting state
		const afterAction = gameState.waitingForInfluenceLoss.afterAction;
		gameState.waitingForInfluenceLoss = undefined;

		// Continue game flow based on what was pending
		if (afterAction === 'resolve') {
			resolveAction(io, room.code, gameState);
		} else if (afterAction === 'next_turn') {
			gameState.pendingAction = null;
			nextTurn(io, room.code, gameState);
		} else if (afterAction === 'resolve_then_next') {
			gameState.pendingAction = null;
			nextTurn(io, room.code, gameState);
		} else {
			gameState.pendingAction = null;
			nextTurn(io, room.code, gameState);
		}
	};
}
