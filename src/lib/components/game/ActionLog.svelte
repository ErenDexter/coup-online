<script lang="ts">
	import { fly } from 'svelte/transition';

	interface Props {
		logs: string[];
	}

	let { logs }: Props = $props();

	let displayLogs = $derived(logs.slice(-6));
</script>

<div
	class="action-log-bar flex-none border-b border-[#D4AF37]/20 bg-linear-to-b from-primary/95 to-primary/80 backdrop-blur-sm"
>
	<div class="flex items-center gap-2 overflow-x-auto px-3 py-2">
		<span class="shrink-0 text-[10px] font-semibold tracking-wider text-[#D4AF37]/60 uppercase"
			>কার্যকলাপ</span
		>
		<div class="h-3 w-px shrink-0 bg-[#D4AF37]/30"></div>
		<div class="flex items-center gap-2">
			{#each displayLogs as log, i (logs.length - 6 + i)}
				<div class="log-entry" transition:fly={{ x: -15, duration: 200 }}>
					<span class="log-text">{log}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.action-log-bar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.action-log-bar::-webkit-scrollbar {
		display: none;
	}

	.log-entry {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(45, 27, 27, 0.4) 100%);
		border: 1px solid rgba(212, 175, 55, 0.15);
		white-space: nowrap;
		flex-shrink: 0;
	}

	.log-entry:last-child {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(45, 27, 27, 0.5) 100%);
		border-color: rgba(212, 175, 55, 0.3);
	}

	.log-text {
		font-size: 0.65rem;
		font-weight: 500;
		color: rgba(245, 240, 225, 0.85);
		letter-spacing: 0.01em;
	}

	.log-entry:last-child .log-text {
		color: rgba(245, 240, 225, 0.95);
	}
</style>
