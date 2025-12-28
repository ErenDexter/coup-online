// Coup card types based on game rules
export const CARDS = {
	DUKE: 'duke',
	ASSASSIN: 'assassin',
	CAPTAIN: 'captain',
	AMBASSADOR: 'ambassador',
	CONTESSA: 'contessa'
} as const;

export type Card = (typeof CARDS)[keyof typeof CARDS];

export const ACTIONS = {
	INCOME: 'income',
	FOREIGN_AID: 'foreign_aid',
	COUP: 'coup',
	TAX: 'tax', // Duke
	ASSASSINATE: 'assassinate', // Assassin
	STEAL: 'steal', // Captain
	EXCHANGE: 'exchange' // Ambassador
} as const;

export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// Game configuration
export const GAME_CONFIG = {
	STARTING_COINS: 2,
	COUP_COST: 7,
	ASSASSINATE_COST: 3,
	MUST_COUP_AT: 10,
	CARDS_PER_PLAYER: 2
};

// Initialize deck for game
export function createDeck(): Card[] {
	const deck: Card[] = [];
	Object.values(CARDS).forEach((card) => {
		deck.push(card, card, card); // 3 of each card
	});
	return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
	const shuffled = [...deck];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

export interface Player {
	id: string;
	name: string;
	socketId: string;
	cards: Card[];
	coins: number;
	isAlive: boolean;
	isConnected: boolean;
}

export interface PendingAction {
	playerId: string;
	action: string;
	target?: string;
	claimedCard?: string;
	timestamp: number;
	blocked?: boolean;
	blocker?: string;
	blockCard?: string;
	drawnCards?: Card[];
	waitingFor?: string[]; // Player IDs who haven't responded yet
	passed?: string[]; // Player IDs who passed
}

export interface ActionLogEntry {
	type: string;
	player: string;
	action?: string;
	target?: string;
	timestamp: number;
}

export interface InfluenceLossWait {
	playerId: string;
	reason: 'challenge_failed' | 'challenge_succeeded' | 'assassination' | 'coup' | 'block_failed';
	afterAction?: 'resolve' | 'next_turn' | 'resolve_then_next';
	resolveData?: any;
}

export interface GameState {
	roomId: string;
	players: Map<string, Player>;
	deck: Card[];
	currentTurnIndex: number;
	pendingAction: PendingAction | null;
	actionLog: ActionLogEntry[];
	waitingForInfluenceLoss?: InfluenceLossWait;
	revealedCards: Map<string, Card[]>; // playerId -> revealed cards
}

// Validate if player can perform action
export function canPerformAction(player: Player, action: Action): boolean {
	if (!player.isAlive) return false;

	switch (action) {
		case ACTIONS.COUP:
			return player.coins >= GAME_CONFIG.COUP_COST;
		case ACTIONS.ASSASSINATE:
			return player.coins >= GAME_CONFIG.ASSASSINATE_COST;
		default:
			return true;
	}
}

// Check if action requires specific card
export function getRequiredCard(action: Action): Card | null {
	switch (action) {
		case ACTIONS.TAX:
			return CARDS.DUKE;
		case ACTIONS.ASSASSINATE:
			return CARDS.ASSASSIN;
		case ACTIONS.STEAL:
			return CARDS.CAPTAIN;
		case ACTIONS.EXCHANGE:
			return CARDS.AMBASSADOR;
		default:
			return null;
	}
}

// Check if card can block action
export function canBlockAction(card: Card, action: Action): boolean {
	if (action === ACTIONS.FOREIGN_AID && card === CARDS.DUKE) return true;
	if (action === ACTIONS.STEAL && (card === CARDS.CAPTAIN || card === CARDS.AMBASSADOR))
		return true;
	if (action === ACTIONS.ASSASSINATE && card === CARDS.CONTESSA) return true;
	return false;
}
