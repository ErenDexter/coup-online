<script lang="ts">
	import { goto } from '$app/navigation';
	import { fade, scale } from 'svelte/transition';
	import { io } from 'socket.io-client';
	import { RulesCard } from '$lib/components/game';

	let playerName = $state('');
	let roomCode = $state('');
	let loading = $state(false);
	let error = $state('');
	let showRules = $state(false);

	// Store session data securely in localStorage
	function storeSession(code: string, data: any) {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(
				`coup_session_${code}`,
				JSON.stringify({
					authToken: data.authToken,
					myId: data.playerId,
					roomId: data.roomId,
					isHost: data.isHost,
					timestamp: Date.now()
				})
			);
		}
	}

	async function createRoom() {
		if (!playerName.trim()) return;
		loading = true;
		error = '';

		const socket = io();
		socket.emit('create_room', { hostName: playerName }, (response: any) => {
			if (response.success) {
				// Store auth token before navigating
				storeSession(response.code, response);
				socket.disconnect();
				// No longer pass host=true in URL - it's determined server-side
				goto(`/room/${response.code}?name=${encodeURIComponent(playerName)}`);
			} else {
				error = response.error || 'কক্ষ তৈরি করতে ব্যর্থ হয়েছে';
				loading = false;
			}
		});
	}

	async function joinRoom() {
		if (!playerName.trim() || !roomCode.trim()) return;
		loading = true;
		goto(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
	}
</script>

<div class="royal-bg flex min-h-screen items-center justify-center p-4">
	<!-- Decorative Corner Elements -->
	<div class="pointer-events-none fixed inset-0 overflow-hidden">
		<div class="absolute top-0 left-0 h-32 w-32 opacity-20">
			<svg viewBox="0 0 100 100" class="h-full w-full text-[#D4AF37]">
				<path d="M0,0 L100,0 L100,20 C50,20 20,50 20,100 L0,100 Z" fill="currentColor" />
			</svg>
		</div>
		<div class="absolute top-0 right-0 h-32 w-32 opacity-20" style="transform: scaleX(-1)">
			<svg viewBox="0 0 100 100" class="h-full w-full text-[#D4AF37]">
				<path d="M0,0 L100,0 L100,20 C50,20 20,50 20,100 L0,100 Z" fill="currentColor" />
			</svg>
		</div>
		<div class="absolute bottom-0 left-0 h-32 w-32 opacity-20" style="transform: scaleY(-1)">
			<svg viewBox="0 0 100 100" class="h-full w-full text-[#D4AF37]">
				<path d="M0,0 L100,0 L100,20 C50,20 20,50 20,100 L0,100 Z" fill="currentColor" />
			</svg>
		</div>
		<div class="absolute right-0 bottom-0 h-32 w-32 opacity-20" style="transform: scale(-1)">
			<svg viewBox="0 0 100 100" class="h-full w-full text-[#D4AF37]">
				<path d="M0,0 L100,0 L100,20 C50,20 20,50 20,100 L0,100 Z" fill="currentColor" />
			</svg>
		</div>
	</div>

	<div class="relative z-10 w-full max-w-2xl" transition:fade>
		<!-- Title Section -->
		<div class="mb-12 text-center">
			<!-- Royal Emblem -->
			<div class="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
				<div class="royal-emblem text-6xl">⚔️</div>
			</div>

			<!-- Game Title -->
			<h1
				class="royal-emblem mb-4 text-5xl font-bold text-[#D4AF37] md:text-7xl"
				style="font-family: 'Tiro Bangla', 'Hind Siliguri', serif;"
				transition:scale
			>
				ষড়যন্ত্র
			</h1>

			<!-- Subtitle -->
			<p class="text-lg text-[#F5F0E1]/80" style="font-family: 'Hind Siliguri', sans-serif;">
				রাজকীয় তাসের খেলা
			</p>

			<!-- Ornate Divider -->
			<div class="ornate-divider mx-auto mt-6 max-w-xs">
				<span class="text-[#D4AF37]">✦</span>
			</div>
		</div>

		<!-- Main Card -->
		<div class="card-base space-y-6">
			<!-- Player Name Input -->
			<div>
				<label
					for="name"
					class="mb-2 block text-sm font-medium text-[#F5F0E1]/90"
					style="font-family: 'Hind Siliguri', sans-serif;"
				>
					আপনার নাম
				</label>
				<input
					id="name"
					type="text"
					bind:value={playerName}
					placeholder="এখানে আপনার নাম লিখুন"
					class="royal-input"
				/>
			</div>

			<!-- Error Message -->
			{#if error}
				<div
					class="rounded-lg border border-red-500/50 bg-red-900/30 px-4 py-3 text-center text-red-300"
					transition:fade
				>
					{error}
				</div>
			{/if}

			<!-- Create Room Button -->
			<button
				onclick={createRoom}
				disabled={loading || !playerName.trim()}
				class="btn-primary w-full py-4 text-lg"
			>
				{#if loading}
					<span class="inline-block animate-spin">⚔️</span> তৈরি হচ্ছে...
				{:else}
					🏰 নতুন কক্ষ তৈরি করুন
				{/if}
			</button>

			<!-- Ornate Divider -->
			<div class="ornate-divider">
				<span class="bg-[#2D1B1B] px-4 text-sm text-[#D4AF37]">অথবা</span>
			</div>

			<!-- Join Room Section -->
			<div class="space-y-3">
				<label
					for="code"
					class="block text-sm font-medium text-[#F5F0E1]/90"
					style="font-family: 'Hind Siliguri', sans-serif;"
				>
					বিদ্যমান কক্ষে যোগ দিন
				</label>
				<div class="flex gap-3">
					<input
						id="code"
						type="text"
						bind:value={roomCode}
						placeholder="কক্ষ কোড"
						maxlength="6"
						class="royal-input flex-1 text-center tracking-widest uppercase"
					/>
					<button
						onclick={joinRoom}
						disabled={loading || !playerName.trim() || !roomCode.trim()}
						class="btn-primary px-8 whitespace-nowrap"
					>
						যোগ দিন
					</button>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-8 text-center">
			<button
				onclick={() => (showRules = true)}
				class="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37] transition-all hover:bg-[#D4AF37]/20"
			>
				নিয়মাবলী দেখুন
			</button>
			<p class="text-sm text-[#F5F0E1]/80" style="font-family: 'Hind Siliguri', sans-serif;">
				বন্ধুদের সাথে খেলতে কক্ষ কোড শেয়ার করুন
			</p>

			<!-- Decorative Element -->
			<div class="mt-4 flex items-center justify-center gap-2 text-[#D4AF37]">
				<span>❧</span>
				<span class="text-xs">রাজসভায় স্বাগতম</span>
				<span>❧</span>
			</div>
		</div>
	</div>

	{#if showRules}
		<RulesCard onclose={() => (showRules = false)} />
	{/if}
</div>
