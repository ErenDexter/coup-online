<script lang="ts">
	import { flip } from 'svelte/animate';
	import type { Player } from '$lib/types';
	import {
		cardImages,
		backCoverImg,
		cardNamesBengali,
		avatarColors,
		getAvatarUrl
	} from '$lib/types';

	interface Props {
		players: Player[];
		currentTurnPlayer: string | null;
		revealedCards: Map<string, string[]>;
	}

	let { players, currentTurnPlayer, revealedCards }: Props = $props();
</script>

<!-- Desktop: Top Bar Layout -->
<div class="hidden md:block">
	<div class="mx-auto flex max-w-6xl flex-wrap items-start justify-center gap-4 px-6 py-4">
		{#each players as player, i (player.id)}
			<div
				class="desktop-player-card"
				class:is-current-turn={currentTurnPlayer === player.id}
				class:is-disconnected={player.isConnected === false}
				class:is-eliminated={!player.isAlive}
				animate:flip={{ duration: 300 }}
			>
				<!-- Turn Indicator Glow -->
				{#if currentTurnPlayer === player.id}
					<div class="turn-glow"></div>
				{/if}

				<!-- Player Info Row -->
				<div class="mb-3 flex items-center gap-3">
					<div
						class="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#D4AF37]/60 bg-linear-to-br {avatarColors[
							i % avatarColors.length
						]}"
					>
						<img src={getAvatarUrl(player.name)} alt={player.name} class="h-full w-full" />
						{#if player.isHost}
							<span class="absolute -top-2 left-1/2 -translate-x-1/2 text-sm">👑</span>
						{/if}
						{#if !player.isAlive}
							<span
								class="absolute inset-0 flex items-center justify-center rounded-full bg-black/70 text-xl"
								>💀</span
							>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate text-sm font-bold text-[#F5F0E1]">{player.name}</span>
							{#if player.isConnected === false}
								<span class="text-xs text-red-400">🔌</span>
							{/if}
						</div>
						<div class="flex items-center gap-1 text-sm font-semibold text-[#D4AF37]">
							<span>💰</span>
							<span>{player.coins ?? 0}</span>
						</div>
					</div>
				</div>

				<!-- Cards Row -->
				<div class="flex justify-center gap-2">
					{#if true}
						{@const playerRevealed = revealedCards.get(player.id) || []}
						{#each playerRevealed as revealedCard}
							<div
								class="h-16 w-11 overflow-hidden rounded-lg border-2 border-red-500/60 opacity-50 shadow-md"
								title={cardNamesBengali[revealedCard]}
							>
								<img
									src={cardImages[revealedCard]}
									alt={cardNamesBengali[revealedCard]}
									class="h-full w-full object-cover"
								/>
							</div>
						{/each}
						{#each Array(player.cardCount ?? 0) as _}
							<div
								class="h-16 w-11 overflow-hidden rounded-lg border-2 border-[#D4AF37]/50 shadow-md transition-transform hover:scale-105"
							>
								<img src={backCoverImg} alt="তাস" class="h-full w-full object-cover" />
							</div>
						{/each}
						{#if (player.cardCount ?? 0) === 0 && playerRevealed.length === 0}
							<div class="py-2 text-xs text-[#F5F0E1]/40 italic">বিদায়</div>
						{/if}
					{/if}
				</div>

				<!-- Turn Indicator Text -->
				{#if currentTurnPlayer === player.id}
					<div
						class="mt-2 flex animate-pulse items-center justify-center gap-1 text-xs font-bold text-[#D4AF37]"
					>
						<span class="h-1.5 w-1.5 animate-ping rounded-full bg-[#D4AF37]"></span>
						{player.isConnected === false ? 'সংযোগ বিচ্ছিন্ন...' : 'তার পালা'}
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<!-- Mobile: Horizontal Player Row -->
<div
	class="hide-scrollbar flex gap-3 overflow-x-auto border-b-2 border-[#D4AF37]/30 bg-primary/60 p-3 md:hidden"
>
	{#each players as player, i (player.id)}
		<div
			class="player-game-card flex min-w-30 shrink-0 flex-col items-center gap-2 p-3 transition-all"
			class:is-current-turn={currentTurnPlayer === player.id}
			class:is-disconnected={player.isConnected === false}
			class:is-eliminated={!player.isAlive}
			animate:flip={{ duration: 300 }}
		>
			<!-- Avatar -->
			<div
				class="player-avatar relative h-12 w-12 overflow-hidden bg-linear-to-br text-lg {avatarColors[
					i % avatarColors.length
				]}"
			>
				<img src={getAvatarUrl(player.name)} alt={player.name} class="h-full w-full" />
				{#if player.isHost}
					<span class="absolute -top-2 left-1/2 -translate-x-1/2 text-xs">👑</span>
				{/if}
			</div>

			<!-- Name -->
			<span class="max-w-25 truncate text-center text-sm font-semibold">{player.name}</span>

			<!-- Stats -->
			<div class="flex items-center justify-center gap-3 text-sm font-medium">
				<span class="text-[#D4AF37]">💰 {player.coins ?? 0}</span>
			</div>

			<!-- Cards -->
			<div class="flex justify-center gap-1">
				{#if true}
					{@const playerRevealed = revealedCards.get(player.id) || []}
					<!-- Show revealed cards face-up -->
					{#each playerRevealed as revealedCard}
						<div
							class="h-11 w-8 overflow-hidden rounded-md border-2 border-red-500/50 opacity-60 shadow"
							title={cardNamesBengali[revealedCard]}
						>
							<img
								src={cardImages[revealedCard]}
								alt={cardNamesBengali[revealedCard]}
								class="h-full w-full object-cover"
							/>
						</div>
					{/each}
					<!-- Show remaining face-down cards -->
					{#each Array(player.cardCount ?? 0) as _}
						<div class="h-11 w-8 overflow-hidden rounded-md border-2 border-[#D4AF37]/50 shadow">
							<img src={backCoverImg} alt="তাস" class="h-full w-full object-cover" />
						</div>
					{/each}
					{#if (player.cardCount ?? 0) === 0 && playerRevealed.length === 0}
						<span class="text-xs text-[#F5F0E1]/40 italic">বিদায়</span>
					{/if}
				{/if}
			</div>

			<!-- Turn Indicator -->
			{#if currentTurnPlayer === player.id}
				<div class="flex animate-pulse items-center gap-1 text-xs font-bold text-[#D4AF37]">
					<span class="h-1.5 w-1.5 animate-ping rounded-full bg-[#D4AF37]"></span>
					তার পালা
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	/* Desktop Player Card Styles */
	.desktop-player-card {
		position: relative;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		min-width: 140px;
		max-width: 160px;
		border-radius: 16px;
		border: 2px solid rgba(212, 175, 55, 0.3);
		background: linear-gradient(145deg, rgba(45, 27, 27, 0.95) 0%, rgba(26, 21, 18, 0.98) 100%);
		backdrop-filter: blur(8px);
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.desktop-player-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
	}

	.desktop-player-card:hover {
		border-color: rgba(212, 175, 55, 0.5);
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	.desktop-player-card.is-current-turn {
		border-color: #d4af37;
		box-shadow:
			0 0 20px rgba(212, 175, 55, 0.4),
			0 0 40px rgba(212, 175, 55, 0.2);
	}

	.desktop-player-card.is-current-turn::before {
		background: linear-gradient(90deg, transparent, #d4af37, transparent);
		animation: shimmer 2s infinite;
	}

	@keyframes shimmer {
		0% {
			opacity: 0.5;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.5;
		}
	}

	.desktop-player-card.is-disconnected {
		opacity: 0.5;
		filter: grayscale(0.5);
	}

	.desktop-player-card.is-eliminated {
		opacity: 0.4;
		filter: grayscale(0.7);
		border-color: rgba(100, 100, 100, 0.3);
	}

	.desktop-player-card.is-eliminated::before {
		background: linear-gradient(90deg, transparent, rgba(100, 100, 100, 0.3), transparent);
	}

	.turn-glow {
		position: absolute;
		inset: -2px;
		background: linear-gradient(45deg, #d4af37, #b8860b, #d4af37);
		border-radius: 18px;
		z-index: -1;
		animation: turn-pulse 2s ease-in-out infinite;
	}

	@keyframes turn-pulse {
		0%,
		100% {
			opacity: 0.6;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.02);
		}
	}

	/* Mobile Player Card Styles */
	.player-game-card {
		border-radius: 12px;
		border: 2px solid rgba(212, 175, 55, 0.3);
		background: linear-gradient(145deg, rgba(45, 27, 27, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
	}

	.player-game-card.is-current-turn {
		border-color: #d4af37;
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
	}

	.player-game-card.is-disconnected {
		opacity: 0.5;
	}

	.player-game-card.is-eliminated {
		opacity: 0.4;
		filter: grayscale(0.5);
	}

	.player-avatar {
		border-radius: 9999px;
		border: 2px solid rgba(212, 175, 55, 0.6);
	}

	.hide-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
