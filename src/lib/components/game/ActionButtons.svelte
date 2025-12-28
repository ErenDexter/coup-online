<script lang="ts">
	import { slide } from 'svelte/transition';

	interface Props {
		mustCoup: boolean;
		myCoins: number;
		onaction: (detail: { action: string; claimedCard?: string }) => void;
	}

	let { mustCoup, myCoins, onaction }: Props = $props();

	function performAction(action: string, claimedCard?: string) {
		onaction({ action, claimedCard });
	}
</script>

<div class="flex flex-wrap justify-center gap-2 md:gap-3" transition:slide>
	{#if mustCoup}
		<button onclick={() => performAction('coup')} class="action-btn action-btn-coup animate-pulse">
			<span class="action-text">অভ্যুত্থান (৭)</span>
			<span class="action-badge">আবশ্যক</span>
		</button>
	{:else}
		<!-- Basic Actions -->
		<button onclick={() => performAction('income')} class="action-btn action-btn-basic">
			<span class="action-text">আয়</span>
			<span class="action-badge">+১</span>
		</button>
		<button onclick={() => performAction('foreign_aid')} class="action-btn action-btn-basic">
			<span class="action-text">বৈদেশিক সাহায্য</span>
			<span class="action-badge">+২</span>
		</button>

		<!-- Character Actions -->
		<button onclick={() => performAction('tax', 'duke')} class="action-btn action-btn-character">
			<span class="action-text">কর</span>
			<span class="action-badge">+৩</span>
		</button>
		<button onclick={() => performAction('steal')} class="action-btn action-btn-character">
			<span class="action-text">চুরি</span>
		</button>
		<button
			onclick={() => performAction('exchange', 'ambassador')}
			class="action-btn action-btn-character"
		>
			<span class="action-text">বিনিময়</span>
		</button>

		<!-- Attack Actions -->
		{#if myCoins >= 3}
			<button onclick={() => performAction('assassinate')} class="action-btn action-btn-attack">
				<span class="action-text">হত্যা</span>
				<span class="action-badge">-৩</span>
			</button>
		{/if}
		{#if myCoins >= 7}
			<button onclick={() => performAction('coup')} class="action-btn action-btn-coup">
				<span class="action-text">অভ্যুত্থান</span>
				<span class="action-badge">-৭</span>
			</button>
		{/if}
	{/if}
</div>

<style>
	/* Action Button Styles */
	.action-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 0.75rem 1rem;
		min-width: 80px;
		border-radius: 12px;
		border: 2px solid rgba(212, 175, 55, 0.4);
		background: linear-gradient(135deg, rgba(45, 27, 27, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
		backdrop-filter: blur(4px);
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.action-btn::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent);
		transition: left 0.4s ease;
	}

	.action-btn:hover::before {
		left: 100%;
	}

	.action-btn:hover {
		transform: translateY(-2px);
		border-color: rgba(212, 175, 55, 0.7);
		box-shadow: 0 4px 20px rgba(212, 175, 55, 0.25);
	}

	.action-btn:active {
		transform: translateY(0);
	}

	.action-text {
		font-size: 0.75rem;
		font-weight: 600;
		color: #f5f0e1;
		white-space: nowrap;
	}

	.action-badge {
		font-size: 0.65rem;
		font-weight: 700;
		padding: 0.15rem 0.4rem;
		border-radius: 6px;
		margin-top: 0.25rem;
		background: rgba(212, 175, 55, 0.2);
		color: #d4af37;
	}

	/* Basic Actions - Green tint */
	.action-btn-basic {
		border-color: rgba(34, 197, 94, 0.4);
		background: linear-gradient(135deg, rgba(27, 45, 35, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
	}

	.action-btn-basic:hover {
		border-color: rgba(34, 197, 94, 0.7);
		box-shadow: 0 4px 20px rgba(34, 197, 94, 0.25);
	}

	.action-btn-basic .action-badge {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	/* Character Actions - Purple tint */
	.action-btn-character {
		border-color: rgba(168, 85, 247, 0.4);
		background: linear-gradient(135deg, rgba(45, 27, 62, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
	}

	.action-btn-character:hover {
		border-color: rgba(168, 85, 247, 0.7);
		box-shadow: 0 4px 20px rgba(168, 85, 247, 0.25);
	}

	.action-btn-character .action-badge {
		background: rgba(168, 85, 247, 0.2);
		color: #a855f7;
	}

	/* Attack Actions - Red tint */
	.action-btn-attack {
		border-color: rgba(239, 68, 68, 0.4);
		background: linear-gradient(135deg, rgba(62, 27, 27, 0.9) 0%, rgba(26, 21, 18, 0.95) 100%);
	}

	.action-btn-attack:hover {
		border-color: rgba(239, 68, 68, 0.7);
		box-shadow: 0 4px 20px rgba(239, 68, 68, 0.25);
	}

	.action-btn-attack .action-badge {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	/* Coup Action - Gold/Special */
	.action-btn-coup {
		border-color: rgba(212, 175, 55, 0.6);
		background: linear-gradient(135deg, rgba(62, 45, 20, 0.95) 0%, rgba(45, 27, 27, 0.95) 100%);
		box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
	}

	.action-btn-coup:hover {
		border-color: #d4af37;
		box-shadow: 0 4px 25px rgba(212, 175, 55, 0.4);
	}

	.action-btn-coup .action-badge {
		background: rgba(212, 175, 55, 0.3);
		color: #d4af37;
	}

	.action-btn-coup .action-text {
		color: #d4af37;
	}

	/* Responsive adjustments */
	@media (min-width: 768px) {
		.action-btn {
			padding: 1rem 1.25rem;
			min-width: 100px;
		}

		.action-text {
			font-size: 0.85rem;
		}

		.action-badge {
			font-size: 0.7rem;
		}
	}
</style>
