<script lang="ts">
	import { fade } from 'svelte/transition';
	import { cardImages, cardNamesBengali } from '$lib/types';

	interface Props {
		cards: string[];
		onselect: (card: string) => void;
	}

	let { cards, onselect }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" transition:fade>
	<div class="card-base mx-4 w-full max-w-md border-2 border-red-500/50">
		<h3 class="mb-6 text-center text-xl font-bold text-red-400 md:text-2xl">
			💀 আপনি প্রভাব হারিয়েছেন!
		</h3>
		<p class="mb-4 text-center text-[#F5F0E1]/80">একটি তাস বাছাই করুন প্রকাশ করার জন্য:</p>
		<div class="flex justify-center gap-4">
			{#each cards as card}
				<button
					onclick={() => onselect(card)}
					class="game-card relative hover:ring-4 hover:ring-red-500"
				>
					<img
						src={cardImages[card]}
						alt={cardNamesBengali[card]}
						class="h-full w-full object-cover"
					/>
					<div
						class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/80 to-transparent p-2"
					>
						<span class="text-xs font-bold text-[#F5F0E1] uppercase">{cardNamesBengali[card]}</span>
					</div>
				</button>
			{/each}
		</div>
		<p class="mt-4 text-center text-sm text-[#F5F0E1]/60">অন্যরা আপনার জন্য অপেক্ষা করছেন...</p>
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
		width: 100px;
		height: 140px;
		border-radius: 12px;
		border: 3px solid rgba(212, 175, 55, 0.5);
		overflow: hidden;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.game-card:hover {
		transform: scale(1.05);
	}

	@media (min-width: 768px) {
		.game-card {
			width: 120px;
			height: 168px;
		}
	}
</style>
