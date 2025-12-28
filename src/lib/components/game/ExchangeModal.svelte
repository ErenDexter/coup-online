<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { ExchangeCards } from '$lib/types';
	import { cardImages, cardNamesBengali } from '$lib/types';

	interface Props {
		exchangeCards: ExchangeCards;
		onconfirm: (keptCards: string[]) => void;
	}

	let { exchangeCards, onconfirm }: Props = $props();

	let selectedCards: number[] = $state([]);

	let allCards = $derived([...exchangeCards.current, ...exchangeCards.drawn]);

	// Number of cards to keep equals current hand size (1 or 2)
	let cardsToKeep = $derived(exchangeCards.current.length);

	function toggleCard(index: number) {
		if (selectedCards.includes(index)) {
			selectedCards = selectedCards.filter((i) => i !== index);
		} else if (selectedCards.length < cardsToKeep) {
			selectedCards = [...selectedCards, index];
		}
	}

	function confirm() {
		if (selectedCards.length !== cardsToKeep) return;
		const keptCards = selectedCards.map((i) => allCards[i]);
		onconfirm(keptCards);
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" transition:fade>
	<div class="card-base mx-4 w-full max-w-2xl">
		<h3 class="mb-2 text-center text-xl font-bold text-[#D4AF37] md:text-2xl">
			বিনিময়: {cardsToKeep === 1 ? '১টি' : '২টি'} তাস রাখুন
		</h3>
		<p class="mb-6 text-center text-sm text-[#F5F0E1]/70">
			বাছাই করা হয়েছে: {selectedCards.length}/{cardsToKeep === 1 ? '১' : '২'}
		</p>
		<div class="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-3">
			{#each allCards as card, i}
				<button
					class="game-card relative aspect-2/3 h-full w-full transition-all
            {selectedCards.includes(i)
						? 'scale-105 ring-4 ring-green-400'
						: 'opacity-70 hover:opacity-100'}"
					onclick={() => toggleCard(i)}
				>
					<img
						src={cardImages[card]}
						alt={cardNamesBengali[card]}
						class="h-full w-full object-cover"
					/>
					{#if selectedCards.includes(i)}
						<div
							class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm"
						>
							✓
						</div>
					{/if}
					<div
						class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-1"
					>
						<span class="text-[10px] font-bold text-[#F5F0E1]">
							{i < exchangeCards.current.length ? 'বর্তমান' : 'নতুন'}
						</span>
					</div>
				</button>
			{/each}
		</div>
		<button
			onclick={confirm}
			disabled={selectedCards.length !== cardsToKeep}
			class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
		>
			{selectedCards.length === cardsToKeep
				? 'নিশ্চিত করুন'
				: cardsToKeep === 1
					? '১টি তাস বাছাই করুন'
					: '২টি তাস বাছাই করুন'}
		</button>
	</div>
</div>

<style>
	.card-base {
		padding: 1.5rem;
		border-radius: 16px;
		border: 2px solid rgba(212, 175, 55, 0.4);
		background: linear-gradient(145deg, rgba(45, 27, 27, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%);
		backdrop-filter: blur(8px);
	}

	.game-card {
		border-radius: 12px;
		border: 3px solid rgba(212, 175, 55, 0.5);
		overflow: hidden;
		cursor: pointer;
	}

	.btn-primary {
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		border: 2px solid #d4af37;
		background: linear-gradient(135deg, #d4af37 0%, #b8860b 100%);
		color: #1a1512;
		font-weight: 700;
		transition: all 0.2s ease;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
	}
</style>
