import type { ACTIONS, CARDS } from './server/game/coup';

// Card images mapping
import ambassadorImg from '$lib/assets/cards/ambassador.jpg';
import assassinImg from '$lib/assets/cards/assassin.jpg';
import captainImg from '$lib/assets/cards/captain.jpg';
import contessaImg from '$lib/assets/cards/contessa.jpg';
import dukeImg from '$lib/assets/cards/duke.jpg';
import backCoverImg from '$lib/assets/cards/back_cover.jpg';

export type Card = (typeof CARDS)[keyof typeof CARDS];
export type Action = (typeof ACTIONS)[keyof typeof ACTIONS];

// Player type for components
export interface Player {
	id: string;
	name: string;
	coins?: number;
	cardCount?: number;
	isAlive: boolean;
	isHost?: boolean;
	isConnected?: boolean;
}

// Socket event payloads
export interface PlayerInfo {
	id: string;
	name: string;
	coins: number;
	cardCount: number;
	isAlive: boolean;
}

export interface PendingAction {
	player: string;
	playerId: string;
	action: string;
	target?: string;
	canChallenge: boolean;
	canBlock: boolean;
	waitingFor?: string[];
	blocked?: boolean;
	blocker?: string;
	blockerId?: string;
	blockCard?: string;
}

export interface ExchangeCards {
	current: string[];
	drawn: string[];
}

export interface GameStartedPayload {
	yourId: string;
	yourCards: Card[];
	yourCoins: number;
	players: PlayerInfo[];
	currentTurn: string;
}

export interface ActionDeclaredPayload {
	player: string;
	action: string;
	target?: string;
	canChallenge: boolean;
	canBlock: boolean;
}

export interface ChallengeResultPayload {
	success: boolean;
	challenger: string;
	actor: string;
	revealedCard?: Card;
}

export interface NextTurnPayload {
	currentPlayer: string;
	players: PlayerInfo[];
}

export interface ExchangeCardsPayload {
	currentCards: Card[];
	drawnCards: Card[];
}

export interface ChooseCardToLosePayload {
	cards: Card[];
}

// Card images
export const cardImages: Record<string, string> = {
	duke: dukeImg,
	assassin: assassinImg,
	captain: captainImg,
	ambassador: ambassadorImg,
	contessa: contessaImg
};

export { backCoverImg };

// Bengali card names
export const cardNamesBengali: Record<string, string> = {
	duke: 'জমিদার',
	assassin: 'ঘাতক',
	captain: 'সেনাপতি',
	ambassador: 'মন্ত্রী',
	contessa: 'রাজমাতা'
};

// Bengali action names
export const actionNamesBengali: Record<string, string> = {
	income: 'আয়',
	foreign_aid: 'বৈদেশিক সাহায্য',
	tax: 'কর',
	steal: 'চুরি',
	assassinate: 'হত্যা',
	exchange: 'বিনিময়',
	coup: 'অভ্যুত্থান'
};

// Player avatar colors
export const avatarColors = [
	'from-[#6B1D1D] to-[#8B2525]',
	'from-[#2D1B4E] to-[#4D2B7E]',
	'from-[#1B4E3D] to-[#2B7E5D]',
	'from-[#4E3D1B] to-[#7E5D2B]',
	'from-[#1B3D4E] to-[#2B5D7E]',
	'from-[#4E1B3D] to-[#7E2B5D]'
];

// Helper function to get player avatar URL
export function getAvatarUrl(name: string): string {
	return `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}`;
}

// Get block card for action
export function getBlockCard(action: string): string {
	switch (action) {
		case 'foreign_aid':
			return 'duke';
		case 'steal':
			return 'captain';
		case 'assassinate':
			return 'contessa';
		default:
			return 'duke';
	}
}
