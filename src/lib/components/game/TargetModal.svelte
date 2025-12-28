<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { Player } from '$lib/types';
	import { actionNamesBengali, avatarColors, getAvatarUrl } from '$lib/types';

	interface Props {
		targetAction: string;
		players: Player[];
		myId: string;
		onselect: (targetId: string) => void;
		oncancel: () => void;
	}

	let { targetAction, players, myId, onselect, oncancel }: Props = $props();

	let availableTargets = $derived(players.filter((p) => p.id !== myId && p.isAlive));
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" transition:fade>
	<div class="card-base mx-4 w-full max-w-md">
		<h3 class="mb-6 text-center text-xl font-bold text-[#D4AF37] md:text-2xl">
			{actionNamesBengali[targetAction] || targetAction}-এর জন্য লক্ষ্য বাছাই করুন
		</h3>
		<div class="space-y-3">
			{#each availableTargets as target, i}
				<button
					onclick={() => onselect(target.id)}
					class="btn-secondary flex w-full items-center justify-between py-4 text-lg"
				>
					<div class="flex items-center gap-3">
						<div
							class="player-avatar h-10 w-10 overflow-hidden bg-linear-to-br text-sm {avatarColors[
								i % avatarColors.length
							]}"
						>
							<img src={getAvatarUrl(target.name)} alt={target.name} class="h-full w-full" />
						</div>
						<span>{target.name}</span>
					</div>
					<span class="text-[#D4AF37]">💰{target.coins}</span>
				</button>
			{/each}
		</div>
		<button
			onclick={() => oncancel()}
			class="mt-4 w-full rounded-lg border border-[#D4AF37]/30 bg-[#2D1B1B] py-3 transition-all hover:bg-[#3D2B2B]"
		>
			বাতিল
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

	.btn-secondary {
		padding: 0.75rem 1.5rem;
		border-radius: 12px;
		border: 2px solid rgba(212, 175, 55, 0.4);
		background: linear-gradient(135deg, rgba(45, 27, 27, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
		transition: all 0.2s ease;
	}

	.btn-secondary:hover {
		border-color: rgba(212, 175, 55, 0.7);
		transform: translateY(-2px);
	}

	.player-avatar {
		border-radius: 9999px;
		border: 2px solid rgba(212, 175, 55, 0.6);
	}
</style>
