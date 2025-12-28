<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { Player, PendingAction } from '$lib/types';
	import { cardNamesBengali, actionNamesBengali, getBlockCard } from '$lib/types';

	interface Props {
		pendingAction: PendingAction;
		waitingForMe: boolean;
		players: Player[];
		myId: string;
		onchallenge: () => void;
		onchallengeBlock: () => void;
		onblock: (blockCard: string) => void;
		onpass: () => void;
	}

	let {
		pendingAction,
		waitingForMe,
		players,
		myId,
		onchallenge,
		onchallengeBlock,
		onblock,
		onpass
	}: Props = $props();
</script>

{#if waitingForMe}
	<div class="space-y-3" transition:slide>
		<div class="text-center">
			{#if pendingAction.blocked}
				<p class="mb-2 text-base md:text-lg">
					<span class="font-bold text-[#D4AF37]">{pendingAction.blocker}</span>
					<span class="font-bold">{cardNamesBengali[pendingAction.blockCard || '']}</span> দিয়ে প্রতিরোধ
					করছেন
				</p>
				<p class="text-sm text-[#F5F0E1]/70">প্রতিরোধ চ্যালেঞ্জ করুন অথবা পাস করুন</p>
			{:else}
				<p class="mb-2 text-base md:text-lg">
					<span class="font-bold text-[#D4AF37]">{pendingAction.player}</span>
					<span class="font-bold"
						>{actionNamesBengali[pendingAction.action] || pendingAction.action}</span
					>
					ঘোষণা করেছেন
					{#if pendingAction.target}
						({players.find((p) => p.id === pendingAction.target)?.name || pendingAction.target}-এর
						উপর)
					{/if}
				</p>
				<p class="text-sm text-[#F5F0E1]/70">
					{#if pendingAction.waitingFor && pendingAction.waitingFor.length > 0}
						{pendingAction.waitingFor.length} জন খেলোয়াড়ের জবাবের অপেক্ষায়
					{/if}
				</p>
			{/if}
		</div>
		<div class="flex flex-wrap justify-center gap-3">
			{#if pendingAction.blocked}
				<button
					onclick={() => onchallengeBlock()}
					class="rounded-lg border-2 border-[#D4AF37] bg-linear-to-r from-red-800 to-red-900 px-6 py-3 text-base font-bold transition-all hover:scale-105"
				>
					চ্যালেঞ্জ!
				</button>
			{:else}
				{#if pendingAction.canChallenge}
					<button
						onclick={() => onchallenge()}
						class="rounded-lg border-2 border-[#D4AF37] bg-linear-to-r from-red-800 to-red-900 px-6 py-3 text-base font-bold transition-all hover:scale-105"
					>
						চ্যালেঞ্জ!
					</button>
				{/if}
				{#if pendingAction.canBlock && (pendingAction.action === 'foreign_aid' || pendingAction.target === myId)}
					<button
						onclick={() => onblock(getBlockCard(pendingAction.action))}
						class="rounded-lg border-2 border-[#D4AF37] bg-linear-to-r from-amber-700 to-amber-800 px-6 py-3 text-base font-bold transition-all hover:scale-105"
					>
						🛡️ প্রতিরোধ!
					</button>
				{/if}
			{/if}
			<button
				onclick={() => onpass()}
				class="rounded-lg border-2 border-[#D4AF37]/50 bg-linear-to-r from-gray-700 to-gray-800 px-6 py-3 text-base font-bold transition-all hover:scale-105"
			>
				✓ পাস
			</button>
		</div>
	</div>
{:else if pendingAction.playerId === myId}
	<div class="text-center text-[#F5F0E1]/70" transition:slide>
		<p class="text-base">অন্যান্য খেলোয়াড়দের জবাবের অপেক্ষায়...</p>
		{#if pendingAction.waitingFor && pendingAction.waitingFor.length > 0}
			<p class="mt-1 text-sm">
				{pendingAction.waitingFor.length} জন খেলোয়াড় সিদ্ধান্ত নিচ্ছেন
			</p>
		{/if}
	</div>
{/if}
