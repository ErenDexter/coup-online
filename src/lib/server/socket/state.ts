import type { GameState, Card } from '../game/coup';
import { db } from '../db';
import { rooms, players } from '../db/schema';
import { eq } from 'drizzle-orm';

// In-memory active games
export const activeGames = new Map<string, GameState>();

// Restore game state from database (when server restarts mid-game)
export async function restoreGameStateFromDb(roomId: string): Promise<GameState | null> {
	const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
	if (!room || room.status !== 'playing') return null;

	const roomPlayers = await db.select().from(players).where(eq(players.roomId, roomId));
	if (roomPlayers.length === 0) return null;

	// Reconstruct deck - start with full deck, remove cards held by players
	const allCards: Card[] = [];
	(['duke', 'assassin', 'captain', 'ambassador', 'contessa'] as Card[]).forEach((card) => {
		allCards.push(card, card, card); // 3 of each
	});

	const gameState: GameState = {
		roomId,
		players: new Map(),
		deck: [...allCards],
		currentTurnIndex: 0,
		pendingAction: null,
		actionLog: [{ type: 'system', player: 'System', timestamp: Date.now() }],
		revealedCards: new Map()
	};

	// Add players and remove their cards from deck
	roomPlayers.forEach((p) => {
		const playerCards = (p.cards as Card[]) || [];
		const playerRevealedCards = (p.revealedCards as Card[]) || [];

		gameState.players.set(p.id, {
			id: p.id,
			name: p.name,
			socketId: p.socketId || '',
			cards: playerCards,
			coins: p.coins,
			isAlive: p.isAlive,
			isConnected: false // Will be updated when they reconnect
		});

		// Restore revealed cards for this player
		if (playerRevealedCards.length > 0) {
			gameState.revealedCards.set(p.id, playerRevealedCards);
		}

		// Remove player's cards from deck
		for (const card of playerCards) {
			const idx = gameState.deck.indexOf(card);
			if (idx !== -1) {
				gameState.deck.splice(idx, 1);
			}
		}

		// Also remove revealed cards from deck (they're out of the game)
		for (const card of playerRevealedCards) {
			const idx = gameState.deck.indexOf(card);
			if (idx !== -1) {
				gameState.deck.splice(idx, 1);
			}
		}
	});

	console.log(
		`[RESTORE] Restored game state from DB for room ${roomId}. Deck has ${gameState.deck.length} cards.`
	);
	verifyDeckIntegrity(gameState, 'RESTORE_FROM_DB');

	activeGames.set(roomId, gameState);
	return gameState;
}

// Helper to verify deck integrity
export function verifyDeckIntegrity(gameState: GameState, context: string): boolean {
	const expectedCards = { duke: 3, assassin: 3, captain: 3, ambassador: 3, contessa: 3 };
	const actualCards: Record<string, number> = {
		duke: 0,
		assassin: 0,
		captain: 0,
		ambassador: 0,
		contessa: 0
	};

	// Count cards in deck
	for (const card of gameState.deck) {
		actualCards[card] = (actualCards[card] || 0) + 1;
	}

	// Count cards held by players
	for (const player of gameState.players.values()) {
		for (const card of player.cards) {
			actualCards[card] = (actualCards[card] || 0) + 1;
		}
	}

	// Count cards in pending action (exchange drawn cards)
	if (gameState.pendingAction?.drawnCards) {
		for (const card of gameState.pendingAction.drawnCards) {
			actualCards[card] = (actualCards[card] || 0) + 1;
		}
	}

	// Verify totals
	const totalCards = Object.values(actualCards).reduce((a, b) => a + b, 0);
	const isValid =
		totalCards === 15 &&
		Object.entries(expectedCards).every(([card, count]) => actualCards[card] === count);

	console.log(
		`[DECK CHECK - ${context}] Valid: ${isValid}, Deck: ${gameState.deck.length}, Total: ${totalCards}`
	);
	if (!isValid) {
		console.log(`  Expected:`, expectedCards);
		console.log(`  Actual:`, actualCards);
		console.log(`  Deck contents:`, gameState.deck);
		for (const [, player] of gameState.players) {
			console.log(`  Player ${player.name} cards:`, player.cards);
		}
		if (gameState.pendingAction?.drawnCards) {
			console.log(`  Pending drawn cards:`, gameState.pendingAction.drawnCards);
		}
	}
	return isValid;
}

// Generate a random room code
export function generateRoomCode(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}
