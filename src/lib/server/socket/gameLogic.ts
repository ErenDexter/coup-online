import type { Server } from 'socket.io';
import type { GameState, Card } from '../game/coup';
import { ACTIONS, GAME_CONFIG } from '../game/coup';
import { db } from '../db';
import { players } from '../db/schema';
import { eq } from 'drizzle-orm';
import { verifyDeckIntegrity } from './state';

export async function resolveAction(
	io: Server,
	roomCode: string,
	gameState: GameState
): Promise<void> {
	if (!gameState.pendingAction) return;

	const actor = gameState.players.get(gameState.pendingAction.playerId);
	if (!actor) return;

	const action = gameState.pendingAction.action;
	const targetId = gameState.pendingAction.target;

	switch (action) {
		case ACTIONS.INCOME:
			actor.coins += 1;
			break;

		case ACTIONS.FOREIGN_AID:
			actor.coins += 2;
			break;

		case ACTIONS.TAX:
			actor.coins += 3;
			break;

		case ACTIONS.COUP:
			actor.coins -= GAME_CONFIG.COUP_COST;
			if (targetId) {
				io.to(roomCode).emit('action_resolved', {
					action,
					actor: actor.name
				});
				// Target loses influence, then next turn
				loseInfluence(io, roomCode, gameState, targetId, 'coup', 'resolve_then_next');
				return; // Wait for target to choose card
			}
			break;

		case ACTIONS.ASSASSINATE:
			actor.coins -= GAME_CONFIG.ASSASSINATE_COST;
			if (targetId) {
				io.to(roomCode).emit('action_resolved', {
					action,
					actor: actor.name
				});
				// Target loses influence, then next turn
				loseInfluence(io, roomCode, gameState, targetId, 'assassination', 'resolve_then_next');
				return; // Wait for target to choose card
			}
			break;

		case ACTIONS.STEAL:
			const target = gameState.players.get(targetId!);
			if (target) {
				const stolen = Math.min(2, target.coins);
				target.coins -= stolen;
				actor.coins += stolen;
			}
			break;

		case ACTIONS.EXCHANGE:
			// Draw 2 cards, choose 2 to keep
			const drawnCards = [gameState.deck.pop()!, gameState.deck.pop()!];
			console.log(
				`[EXCHANGE] ${actor.name} drawing cards: ${drawnCards.join(', ')} (deck now has ${gameState.deck.length})`
			);
			// Store drawn cards in pending action for later
			gameState.pendingAction = {
				...gameState.pendingAction!,
				drawnCards
			};
			verifyDeckIntegrity(gameState, 'EXCHANGE_DRAW');
			io.to(actor.socketId).emit('exchange_cards', {
				currentCards: actor.cards,
				drawnCards
			});
			return; // Wait for player to choose
	}

	io.to(roomCode).emit('action_resolved', {
		action,
		actor: actor.name
	});

	// Save coin changes to DB
	await db.update(players).set({ coins: actor.coins }).where(eq(players.id, actor.id));

	// If steal, also update target's coins
	if (action === ACTIONS.STEAL && targetId) {
		const target = gameState.players.get(targetId);
		if (target) {
			await db.update(players).set({ coins: target.coins }).where(eq(players.id, target.id));
		}
	}

	gameState.pendingAction = null;
	nextTurn(io, roomCode, gameState);
}

/**
 * Request a player to lose an influence (choose a card to discard)
 */
export function loseInfluence(
	io: Server,
	roomCode: string,
	gameState: GameState,
	playerId: string,
	reason: 'challenge_failed' | 'challenge_succeeded' | 'assassination' | 'coup',
	afterAction?: 'resolve' | 'next_turn' | 'resolve_then_next'
): void {
	const player = gameState.players.get(playerId);
	if (!player) return;

	// Set waiting state - game pauses until this player chooses
	gameState.waitingForInfluenceLoss = {
		playerId,
		reason,
		afterAction
	};

	// Notify all players that we're waiting
	io.to(roomCode).emit('waiting_for_influence_loss', {
		player: player.name,
		playerId: playerId
	});

	// Ask the player to choose a card
	io.to(player.socketId).emit('choose_card_to_lose', {
		cards: player.cards
	});
}

/**
 * Advance to the next player's turn
 */
export function nextTurn(io: Server, roomCode: string, gameState: GameState): void {
	const allPlayersArray = Array.from(gameState.players.values());
	const alivePlayers = allPlayersArray.filter((p) => p.isAlive);

	// Check for game over
	if (alivePlayers.length === 1) {
		io.to(roomCode).emit('game_over', { winner: alivePlayers[0].name });
		// Note: activeGames cleanup should be done by the caller
		return;
	}

	// Find the next alive player starting from current index + 1
	// We iterate through ALL players (not just alive ones) to maintain proper turn order
	let nextIndex = (gameState.currentTurnIndex + 1) % allPlayersArray.length;
	let attempts = 0;

	// Keep advancing until we find an alive player (or we've checked everyone)
	while (!allPlayersArray[nextIndex].isAlive && attempts < allPlayersArray.length) {
		nextIndex = (nextIndex + 1) % allPlayersArray.length;
		attempts++;
	}

	gameState.currentTurnIndex = nextIndex;
	const nextPlayer = allPlayersArray[nextIndex];

	io.to(roomCode).emit('next_turn', {
		currentPlayer: nextPlayer.id,
		players: allPlayersArray.map((p) => ({
			id: p.id,
			name: p.name,
			coins: p.coins,
			cardCount: p.cards.length,
			isAlive: p.isAlive,
			isConnected: p.isConnected
		}))
	});
}

/**
 * Handle automatic influence loss for disconnected player
 */
export async function autoLoseInfluence(
	io: Server,
	roomCode: string,
	gameState: GameState,
	player: { id: string; name: string; cards: Card[]; isAlive: boolean }
): Promise<void> {
	if (player.cards.length === 0) return;

	const cardToLose = player.cards[0];
	player.cards.splice(0, 1);

	// Track revealed card
	const currentRevealed = gameState.revealedCards.get(player.id) || [];
	gameState.revealedCards.set(player.id, [...currentRevealed, cardToLose]);

	if (player.cards.length === 0) {
		player.isAlive = false;
	}

	io.to(roomCode).emit('card_lost', {
		player: player.name,
		card: cardToLose,
		cardsRemaining: player.cards.length,
		isAlive: player.isAlive,
		wasDisconnected: true
	});

	// Save to DB - include revealed cards
	const revealedCardsToSave = gameState.revealedCards.get(player.id) || [];
	await db
		.update(players)
		.set({
			cards: player.cards,
			isAlive: player.isAlive,
			revealedCards: revealedCardsToSave
		})
		.where(eq(players.id, player.id));
}
