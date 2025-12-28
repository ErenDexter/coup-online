<script lang="ts">
	import { scale } from 'svelte/transition';
	import { cardImages, cardNamesBengali } from '$lib/types';

	interface Props {
		cards: string[];
		coins: number;
		isMyTurn: boolean;
		mustCoup: boolean;
	}

	let { cards, coins, isMyTurn, mustCoup }: Props = $props();
</script>

<!-- My Stats -->
<div class="flex flex-col items-center justify-center gap-2">
	<div class="flex items-center gap-4 md:gap-6">
		<span class="flex items-center gap-2 text-2xl font-bold md:text-3xl">
			<span class="text-[#D4AF37]">💰</span>
			{coins}
		</span>
		{#if isMyTurn}
			<span
				class="golden-glow rounded-full bg-linear-to-r from-[#D4AF37] to-[#B8860B] px-4 py-2 text-sm font-bold text-primary md:px-6 md:text-lg"
				transition:scale
			>
				আপনার পালা!
			</span>
		{/if}
	</div>
	{#if mustCoup && isMyTurn}
		<div
			class="rounded-lg border-2 border-[#D4AF37] bg-[#D4AF37]/20 px-4 py-2 text-sm text-[#D4AF37]"
		>
			⚠️ আপনার ১০+ স্বর্ণমুদ্রা আছে - অভ্যুত্থান করতে হবে!
		</div>
	{/if}
</div>

<!-- My Cards - Large Display -->
<div class="flex justify-center gap-4 md:gap-6">
	{#each cards as card, idx (`${card}-${idx}`)}
		<div class="my-card group relative" transition:scale>
			<img src={cardImages[card]} alt={cardNamesBengali[card]} class="h-full w-full object-cover" />
			<!-- Card Name Overlay -->
			<div
				class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/90 via-black/60 to-transparent p-3 md:p-4"
			>
				<span class="text-sm font-bold text-[#F5F0E1] drop-shadow-lg md:text-lg"
					>{cardNamesBengali[card]}</span
				>
			</div>
			<!-- Subtle shine effect on hover -->
			<div
				class="pointer-events-none absolute inset-0 bg-linear-to-tr from-transparent via-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
			></div>
		</div>
	{/each}
</div>

<style>
	.my-card {
		width: 100px;
		height: 140px;
		border-radius: 12px;
		border: 3px solid rgba(212, 175, 55, 0.7);
		overflow: hidden;
		box-shadow:
			0 10px 30px rgba(0, 0, 0, 0.4),
			0 0 20px rgba(212, 175, 55, 0.2);
		transition: all 0.3s ease;
	}

	.my-card:hover {
		transform: translateY(-8px) scale(1.02);
		box-shadow:
			0 15px 40px rgba(0, 0, 0, 0.5),
			0 0 30px rgba(212, 175, 55, 0.3);
	}

	@media (min-width: 768px) {
		.my-card {
			width: 140px;
			height: 196px;
		}
	}

	.golden-glow {
		box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
	}
</style>
