<script lang="ts">
	import { fade } from 'svelte/transition';
</script>

<div class="royal-bg flex min-h-screen items-center justify-center p-4" transition:fade>
	<div class="card-base mx-auto max-w-md space-y-8 text-center">
		<!-- Victory Crown -->
		<div class="animate-bounce text-6xl">👑</div>

		<div>
			<h1
				class="royal-emblem mb-4 text-4xl font-bold text-[#D4AF37] md:text-5xl"
				style="font-family: 'Tiro Bangla', serif;"
			>
				খেলা শেষ!
			</h1>
			<div class="ornate-divider mx-auto my-4 max-w-xs">
				<span class="text-[#D4AF37]">✦</span>
			</div>
		</div>

		<button
			onclick={() => (window.location.href = '/')}
			class="btn-primary golden-glow px-12 py-4 text-lg md:text-xl"
		>
			🔄 আবার খেলুন
		</button>
	</div>
</div>

<style>
	.royal-bg {
		background: linear-gradient(135deg, #1a1512 0%, #2d1b1b 50%, #1a1512 100%);
	}

	.card-base {
		padding: 2rem;
		border-radius: 16px;
		border: 2px solid rgba(212, 175, 55, 0.4);
		background: linear-gradient(145deg, rgba(45, 27, 27, 0.98) 0%, rgba(26, 21, 18, 0.98) 100%);
		backdrop-filter: blur(8px);
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

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
	}

	.golden-glow {
		box-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
	}

	.ornate-divider {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.ornate-divider::before,
	.ornate-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
	}
</style>
