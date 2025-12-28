<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page } from '$app/stores';
	import { io, type Socket } from 'socket.io-client';
	import { fade, fly, scale, slide } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	// Import components
	import {
		ConnectionStatus,
		ActionLog,
		PlayerList,
		MyCards,
		ActionButtons,
		ResponseButtons,
		TargetModal,
		CardLossModal,
		ExchangeModal,
		GameOverScreen,
		// Types and utilities
		type Player,
		type PendingAction,
		type ExchangeCards,
		cardImages,
		backCoverImg,
		cardNamesBengali,
		actionNamesBengali,
		avatarColors,
		getAvatarUrl,
		getBlockCard
	} from '$lib/components/game';

	const roomCode = $page.params.code;
	const playerName = $page.url.searchParams.get('name') || 'খেলোয়াড়';

	// Floating animation positions for lobby
	let floatingPositions: Map<string, { x: number; y: number; delay: number; duration: number }> =
		$state(new Map());

	// Socket and connection state
	let socket: Socket;
	let roomId = $state('');
	let authToken = $state('');
	let isHost = $state(false);
	let connectionStatus: 'connecting' | 'connected' | 'disconnected' = $state('connecting');

	// Game state
	let gameState: 'lobby' | 'playing' | 'finished' = $state('lobby');
	let players: Player[] = $state([]);
	let myCards: string[] = $state([]);
	let myCoins = $state(2);
	let myId = $state('');
	let revealedCards: Map<string, string[]> = $state(new Map());
	let currentTurnPlayer: string | null = $state(null);
	let isMyTurn = $state(false);
	let pendingAction: PendingAction | null = $state(null);
	let waitingForMe = $state(false);
	let waitingForInfluenceLoss: { player: string; playerId: string } | null = $state(null);
	let actionLog: string[] = $state([]);

	// UI state
	let showCopied = $state(false);
	let errorMessage = $state('');
	let selectingTarget = $state(false);
	let targetAction = $state('');
	let selectingCardToLose = $state(false);
	let cardsToChoose: string[] = $state([]);
	let exchangeCards: ExchangeCards | null = $state(null);

	// Constants
	const MUST_COUP_AT = 10;

	// Derived state
	let mustCoup = $derived(myCoins >= MUST_COUP_AT);
	let otherPlayers = $derived(players.filter((p) => p.id !== myId));

	// Generate random floating position for a player in lobby
	function generateFloatingPosition(playerId: string, index: number) {
		if (!floatingPositions.has(playerId)) {
			const otherPlayersCount = players.filter((p) => p.id !== myId).length;
			const myIndex = players.findIndex((p) => p.id === playerId);
			const myPlayerIndex = players.findIndex((p) => p.id === myId);
			let adjustedIndex = myIndex > myPlayerIndex ? myIndex - 1 : myIndex;

			const startAngle = -Math.PI / 2;
			const angleSpread = Math.PI * 1.6;

			let angle =
				otherPlayersCount === 1
					? startAngle
					: startAngle + (adjustedIndex * angleSpread) / (otherPlayersCount - 1) - angleSpread / 2;

			let radius =
				otherPlayersCount === 1
					? 120
					: otherPlayersCount === 2
						? 130
						: otherPlayersCount === 3
							? 140
							: otherPlayersCount === 4
								? 145
								: 150;

			floatingPositions.set(playerId, {
				x: Math.cos(angle) * radius,
				y: Math.sin(angle) * radius,
				delay: Math.random() * 2,
				duration: 3 + Math.random() * 2
			});
		}
		return floatingPositions.get(playerId)!;
	}

	// Update floating positions when players change
	$effect(() => {
		if (gameState === 'lobby' && players.length > 0) {
			const existingIds = new Set(players.map((p) => p.id));
			for (const id of floatingPositions.keys()) {
				if (!existingIds.has(id)) floatingPositions.delete(id);
			}
			players.forEach((player, index) => {
				if (player.id !== myId) generateFloatingPosition(player.id, index);
			});
		}
	});

	// Session persistence
	function saveSession() {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(
				`coup_session_${roomCode}`,
				JSON.stringify({ roomId, authToken, myId, isHost, timestamp: Date.now() })
			);
		}
	}

	function loadSession() {
		if (typeof localStorage === 'undefined') return null;
		const data = localStorage.getItem(`coup_session_${roomCode}`);
		if (!data) return null;
		try {
			const session = JSON.parse(data);
			if (Date.now() - session.timestamp > 3600000) {
				localStorage.removeItem(`coup_session_${roomCode}`);
				return null;
			}
			return session;
		} catch {
			return null;
		}
	}

	function clearSession() {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(`coup_session_${roomCode}`);
		}
	}

	// Socket connection
	function connectSocket() {
		const existingSession = loadSession();
		socket = io({ transports: ['websocket', 'polling'], reconnection: true });

		socket.on('connect', () => {
			connectionStatus = 'connected';
			socket.emit(
				'join_room',
				{ code: roomCode, playerName, authToken: existingSession?.authToken },
				(response: any) => {
					if (response.success) {
						roomId = response.roomId;
						authToken = response.authToken;
						myId = response.playerId;
						isHost = response.isHost;
						players = response.players;
						if (response.gameInProgress) gameState = 'playing';
						saveSession();
					} else {
						errorMessage = response.message || 'কক্ষে যোগদান ব্যর্থ';
					}
				}
			);
		});

		socket.on('disconnect', () => {
			connectionStatus = 'disconnected';
			actionLog = [...actionLog, 'সার্ভার থেকে সংযোগ বিচ্ছিন্ন...'];
		});

		socket.io.on('reconnect', () => {
			connectionStatus = 'connected';
			actionLog = [...actionLog, 'পুনরায় সংযুক্ত!'];
			const session = loadSession();
			socket.emit(
				'join_room',
				{ code: roomCode, playerName, authToken: session?.authToken },
				(response: any) => {
					if (response.success && response.players) {
						players = response.players;
						myId = response.playerId;
						isHost = response.isHost;
					}
				}
			);
		});

		socket.on('error', (data: { message: string }) => {
			errorMessage = data.message;
			actionLog = [...actionLog, `ত্রুটি: ${data.message}`];
			setTimeout(() => (errorMessage = ''), 3000);
		});

		socket.on('player_joined', (data) => {
			players = data.players;
			if (data.player.name !== playerName) {
				actionLog = [...actionLog, `${data.player.name} কক্ষে যোগ দিয়েছেন`];
			}
		});

		socket.on('action_declared', (data) => {
			pendingAction = {
				player: data.player,
				playerId: data.playerId,
				action: data.action,
				target: data.target,
				canChallenge: data.canChallenge,
				canBlock: data.canBlock,
				waitingFor: data.waitingFor
			};
			waitingForMe = data.waitingFor?.includes(myId) || data.target === myId;
			const actionBengali = actionNamesBengali[data.action] || data.action;
			actionLog = [...actionLog, `${data.player} ${actionBengali} ঘোষণা করেছেন`];
		});

		socket.on('player_passed', (data) => {
			const passMsg = data.wasDisconnected
				? `${data.player} স্বয়ংক্রিয়ভাবে পাস করেছেন`
				: `${data.player} পাস করেছেন`;
			actionLog = [...actionLog, passMsg];
			if (pendingAction) {
				pendingAction.waitingFor = data.waitingFor;
				waitingForMe = data.waitingFor?.includes(myId) || false;
			}
		});

		socket.on('action_blocked', (data) => {
			const blockCardBengali = cardNamesBengali[data.blockCard] || data.blockCard;
			actionLog = [...actionLog, `${data.blocker} ${blockCardBengali} দিয়ে প্রতিরোধ করেছেন`];
			if (pendingAction) {
				pendingAction.blocked = true;
				pendingAction.blocker = data.blocker;
				pendingAction.blockerId = data.blockerId;
				pendingAction.blockCard = data.blockCard;
				pendingAction.waitingFor = data.waitingFor;
				pendingAction.canChallenge = true;
				pendingAction.canBlock = false;
			}
			waitingForMe = data.waitingFor?.includes(myId) || false;
		});

		socket.on('action_blocked_success', (data) => {
			actionLog = [...actionLog, `${data.blocker}-এর প্রতিরোধ সফল`];
			pendingAction = null;
			waitingForMe = false;
		});

		socket.on('challenge_block_result', (data) => {
			actionLog = [
				...actionLog,
				data.success
					? `${data.challenger} সফলভাবে ${data.blocker}-এর প্রতিরোধ চ্যালেঞ্জ করেছেন`
					: `${data.challenger}-এর চ্যালেঞ্জ ব্যর্থ`
			];
			pendingAction = null;
			waitingForMe = false;
		});

		socket.on('waiting_for_influence_loss', (data) => {
			waitingForInfluenceLoss = { player: data.player, playerId: data.playerId };
			actionLog = [...actionLog, `${data.player} তাস বাছাই করছেন...`];
		});

		socket.on('card_lost', (data) => {
			const cardBengali = cardNamesBengali[data.card] || data.card;
			actionLog = [
				...actionLog,
				data.wasDisconnected
					? `${data.player} (সংযোগ বিচ্ছিন্ন) ${cardBengali} হারিয়েছেন`
					: `${data.player} ${cardBengali} হারিয়েছেন`
			];
			const playerObj = players.find((p) => p.name === data.player);
			if (playerObj) {
				const currentRevealed = revealedCards.get(playerObj.id) || [];
				revealedCards.set(playerObj.id, [...currentRevealed, data.card]);
				revealedCards = revealedCards;
			}
			waitingForInfluenceLoss = null;
			if (!data.isAlive) {
				actionLog = [...actionLog, `${data.player} বিদায় হয়েছেন`];
			}
		});

		socket.on('player_disconnected', (data) => {
			actionLog = [...actionLog, `${data.playerName} সংযোগ বিচ্ছিন্ন`];
			players = players.map((p) => (p.id === data.playerId ? { ...p, isConnected: false } : p));
		});

		socket.on('player_reconnected', (data) => {
			actionLog = [...actionLog, `${data.playerName} পুনরায় সংযুক্ত`];
			players = players.map((p) => (p.id === data.playerId ? { ...p, isConnected: true } : p));
		});

		socket.on('game_started', (data) => {
			const isReconnecting = gameState === 'playing';
			gameState = 'playing';
			myCards = data.yourCards;
			myCoins = data.yourCoins;
			players = data.players;
			currentTurnPlayer = data.currentTurn;
			myId = data.yourId;
			isMyTurn = currentTurnPlayer === myId;
			if (!isReconnecting) revealedCards = new Map();
			if (data.revealedCards) revealedCards = new Map(Object.entries(data.revealedCards));
			saveSession();
			if (!actionLog.includes('খেলা শুরু হয়েছে!')) {
				actionLog = [...actionLog, 'খেলা শুরু হয়েছে!'];
			}
		});

		socket.on('challenge_result', (data) => {
			actionLog = [
				...actionLog,
				data.success
					? `${data.challenger} সফলভাবে ${data.actor}-কে চ্যালেঞ্জ করেছেন`
					: `${data.challenger}-এর চ্যালেঞ্জ ব্যর্থ`
			];
			pendingAction = null;
			waitingForMe = false;
		});

		socket.on('action_resolved', (data) => {
			const actionBengali = actionNamesBengali[data.action] || data.action;
			actionLog = [...actionLog, `${data.actor}-এর ${actionBengali} সম্পন্ন`];
			pendingAction = null;
			waitingForMe = false;
		});

		socket.on('next_turn', (data) => {
			players = data.players;
			currentTurnPlayer = data.currentPlayer;
			isMyTurn = currentTurnPlayer === myId;
			const me = players.find((p) => p.id === myId);
			if (me && me.coins !== undefined) myCoins = me.coins;
		});

		socket.on('game_over', (data) => {
			gameState = 'finished';
			actionLog = [...actionLog, `${data.winner} বিজয়ী!`];
			clearSession();
		});

		socket.on('choose_card_to_lose', (data) => {
			selectingCardToLose = true;
			cardsToChoose = data.cards;
		});

		socket.on('exchange_cards', (data) => {
			exchangeCards = { current: myCards, drawn: data.drawnCards };
		});

		socket.on('exchange_complete', (data) => {
			myCards = data.newCards;
			exchangeCards = null;
		});
	}

	onMount(connectSocket);
	onDestroy(() => socket?.disconnect());

	// Game actions
	function startGame() {
		socket.emit('start_game', { code: roomCode, authToken });
	}

	function handleAction(detail: { action: string; claimedCard?: string }) {
		const { action, claimedCard } = detail;
		performAction(action, undefined, claimedCard);
	}

	function performAction(action: string, target?: string, claimedCard?: string) {
		if (mustCoup && action !== 'coup') {
			errorMessage = `আপনার ${myCoins} স্বর্ণমুদ্রা আছে - অভ্যুত্থান করতে হবে!`;
			setTimeout(() => (errorMessage = ''), 3000);
			return;
		}

		if ((action === 'steal' || action === 'assassinate' || action === 'coup') && !target) {
			selectingTarget = true;
			targetAction = action;
			return;
		}

		socket.emit('player_action', { roomId, action, target, claimedCard });
		selectingTarget = false;
		targetAction = '';
	}

	function selectTarget(targetId: string) {
		const claimedCard =
			targetAction === 'steal'
				? 'captain'
				: targetAction === 'assassinate'
					? 'assassin'
					: undefined;
		performAction(targetAction, targetId, claimedCard);
	}

	function challenge() {
		socket.emit('challenge', { roomId });
		waitingForMe = false;
	}

	function challengeBlock() {
		socket.emit('challenge_block', { roomId });
		waitingForMe = false;
	}

	function block(blockCard: string) {
		socket.emit('block', { roomId, blockCard });
		waitingForMe = false;
	}

	function pass() {
		socket.emit('pass', { roomId });
		waitingForMe = false;
	}

	function loseCard(card: string) {
		socket.emit('lose_card', { roomId, card });
		selectingCardToLose = false;
		const index = myCards.indexOf(card);
		if (index > -1) myCards = [...myCards.slice(0, index), ...myCards.slice(index + 1)];
	}

	function handleExchangeConfirm(keptCards: string[]) {
		socket.emit('exchange_complete', { roomId, keptCards });
		myCards = keptCards;
		exchangeCards = null;
	}

	function copyRoomCode() {
		navigator.clipboard.writeText(roomCode ?? '');
		showCopied = true;
		setTimeout(() => (showCopied = false), 2000);
	}
</script>

<div class="royal-bg min-h-screen text-[#F5F0E1]" style="font-family: 'Hind Siliguri', sans-serif;">
	<ConnectionStatus status={connectionStatus} />

	<!-- Error Toast -->
	{#if errorMessage}
		<div
			class="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border-2 border-[#D4AF37] bg-red-900/90 px-6 py-3 text-[#F5F0E1] shadow-lg"
			transition:fly={{ y: -20 }}
		>
			{errorMessage}
		</div>
	{/if}

	{#if gameState === 'lobby'}
		<!-- Lobby Screen -->
		<div class="container mx-auto max-w-3xl px-4 py-8 md:py-12" transition:fade>
			<!-- Header -->
			<div class="mb-8 text-center">
				<h1
					class="royal-emblem mb-2 text-4xl font-bold text-[#D4AF37] md:text-5xl"
					style="font-family: 'Tiro Bangla', serif;"
				>
					ষড়যন্ত্র
				</h1>
				<div class="ornate-divider mx-auto my-4 max-w-xs">
					<span class="text-[#D4AF37]">✦</span>
				</div>
				<div class="flex flex-wrap items-center justify-center gap-4">
					<span class="text-lg text-[#F5F0E1]/80">কক্ষ:</span>
					<span class="text-2xl font-bold tracking-widest text-[#D4AF37]">{roomCode}</span>
					<button
						onclick={copyRoomCode}
						class="btn-secondary relative bg-transparent px-4 py-2 text-sm"
					>
						{#if showCopied}
							<span transition:scale>✓ কপি হয়েছে!</span>
						{:else}
							কোড কপি
						{/if}
					</button>
				</div>
			</div>

			<!-- Players Floating Animation -->
			<div class="card-base relative mb-8" style="min-height: 500px;">
				<h2
					class="mb-4 text-center font-bengali text-lg font-semibold text-[#D4AF37] md:mb-6 md:text-xl"
				>
					খেলোয়াড়গণ ({players.length})
				</h2>

				<div class="relative" style="height: 400px; padding: 20px;">
					{#each players as player, i (player.id)}
						<div animate:flip={{ duration: 500 }}>
							{#if player.id === myId}
								<div
									class="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
									transition:scale={{ duration: 500 }}
								>
									<div class="floating-center flex flex-col items-center gap-2 md:gap-3">
										<div
											class="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-3 border-[#D4AF37] bg-linear-to-br shadow-2xl shadow-[#D4AF37]/50 md:h-24 md:w-24 md:border-4 {avatarColors[
												i % avatarColors.length
											]}"
											class:opacity-40={player.isConnected === false}
										>
											<img
												src={getAvatarUrl(player.name)}
												alt={player.name}
												class="h-full w-full"
											/>
											{#if player.isHost}
												<span
													class="absolute -top-4 left-1/2 -translate-x-1/2 text-2xl md:-top-6 md:text-3xl"
													>👑</span
												>
											{/if}
										</div>
										<div
											class="rounded-lg border-2 border-[#D4AF37] bg-linear-to-r from-[#D4AF37]/20 to-[#B8860B]/20 px-3 py-1.5 md:px-4 md:py-2"
										>
											<span class="text-base font-bold text-[#D4AF37] md:text-lg"
												>{player.name}</span
											>
											<div class="text-center text-xs text-[#F5F0E1]/70 md:text-sm">আপনি</div>
										</div>
									</div>
								</div>
							{:else}
								{@const pos = generateFloatingPosition(player.id, i)}
								<div
									class="floating-player absolute top-1/2 left-1/2"
									style="--float-x: {pos.x}px; --float-y: {pos.y}px; --float-delay: {pos.delay}s; --float-duration: {pos.duration}s;"
									transition:scale={{ duration: 400, delay: i * 100 }}
								>
									<div
										class="flex cursor-pointer flex-col items-center gap-2 transition-transform hover:scale-110"
										class:opacity-40={player.isConnected === false}
										class:grayscale={player.isConnected === false}
									>
										<div
											class="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#D4AF37]/60 bg-linear-to-br shadow-lg md:h-16 md:w-16 md:border-3 {avatarColors[
												i % avatarColors.length
											]}"
										>
											<img
												src={getAvatarUrl(player.name)}
												alt={player.name}
												class="h-full w-full"
											/>
											{#if player.isHost}
												<span
													class="absolute -top-3 left-1/2 -translate-x-1/2 text-base md:-top-4 md:text-xl"
													>👑</span
												>
											{/if}
										</div>
										<div
											class="rounded-md border border-[#D4AF37]/40 bg-[#2D1B1B]/80 px-2 py-0.5 backdrop-blur-sm md:px-3 md:py-1"
										>
											<span class="text-xs font-medium whitespace-nowrap text-[#F5F0E1] md:text-sm"
												>{player.name}</span
											>
											{#if player.isConnected === false}
												<span class="block text-center text-xs text-red-400">🔌</span>
											{/if}
										</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Start Game / Waiting -->
			{#if players.length >= 2}
				{#if isHost}
					<button
						onclick={startGame}
						class="btn-primary golden-glow w-full py-4 text-lg md:text-xl"
					>
						⚔️ খেলা শুরু করুন
					</button>
				{:else}
					<div class="card-base text-center text-[#F5F0E1]/70">
						<p class="text-lg">হোস্টের জন্য অপেক্ষা করছেন...</p>
					</div>
				{/if}
			{:else}
				<div class="card-base text-center text-[#F5F0E1]/70">
					<p class="text-lg">আরও খেলোয়াড়ের জন্য অপেক্ষা করছেন...</p>
					<p class="mt-2 text-sm">সর্বনিম্ন ২ জন খেলোয়াড় প্রয়োজন</p>
				</div>
			{/if}
		</div>
	{:else if gameState === 'playing'}
		<!-- Game Screen -->
		<div class="flex h-screen flex-col overflow-hidden">
			<ActionLog logs={actionLog} />

			<!-- Main Game Area -->
			<div class="relative flex-1 overflow-hidden">
				<!-- Central Table Decoration -->
				<div
					class="pointer-events-none absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-[#D4AF37]/20 bg-[#2D1B1B]/30 md:h-64 md:w-64"
				></div>
				<div
					class="pointer-events-none absolute top-1/2 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#D4AF37]/10 md:h-48 md:w-48"
				></div>

				<PlayerList players={otherPlayers} {currentTurnPlayer} {revealedCards} />
			</div>

			<!-- My Area - Fixed at Bottom -->
			<div class="flex-none bg-linear-to-t from-primary via-primary/95 to-transparent pt-4">
				<div class="mx-auto w-full max-w-4xl space-y-4 px-4 pb-4">
					<MyCards cards={myCards} coins={myCoins} {isMyTurn} {mustCoup} />

					{#if isMyTurn && !pendingAction}
						<ActionButtons {mustCoup} {myCoins} onaction={handleAction} />
					{/if}

					{#if pendingAction}
						<ResponseButtons
							{pendingAction}
							{waitingForMe}
							{players}
							{myId}
							onchallenge={challenge}
							onchallengeBlock={challengeBlock}
							onblock={(blockCard) => block(blockCard)}
							onpass={pass}
						/>
					{/if}

					<!-- Waiting for other player to choose card -->
					{#if waitingForInfluenceLoss && waitingForInfluenceLoss.playerId !== myId && !selectingCardToLose}
						<div class="text-center" transition:slide>
							<div
								class="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-[#2D1B1B] px-6 py-3 text-[#F5F0E1]/80"
							>
								<span
									class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent"
								></span>
								{waitingForInfluenceLoss.player} তাস বাছাই করছেন...
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Modals -->
		{#if selectingTarget}
			<TargetModal
				{targetAction}
				{players}
				{myId}
				onselect={(targetId) => selectTarget(targetId)}
				oncancel={() => {
					selectingTarget = false;
					targetAction = '';
				}}
			/>
		{/if}

		{#if selectingCardToLose}
			<CardLossModal cards={cardsToChoose} onselect={(card) => loseCard(card)} />
		{/if}

		{#if exchangeCards}
			<ExchangeModal {exchangeCards} onconfirm={handleExchangeConfirm} />
		{/if}
	{:else}
		<GameOverScreen />
	{/if}
</div>

<style>
	/* Floating animations for lobby players */
	.floating-player {
		--float-scale: 1;
		animation: float var(--float-duration, 4s) ease-in-out infinite;
		animation-delay: var(--float-delay, 0s);
		transform: translate(
			calc(var(--float-x, 0) * var(--float-scale)),
			calc(var(--float-y, 0) * var(--float-scale))
		);
	}

	@keyframes float {
		0%,
		100% {
			transform: translate(
				calc(var(--float-x, 0) * var(--float-scale)),
				calc(var(--float-y, 0) * var(--float-scale))
			);
		}
		25% {
			transform: translate(
				calc(var(--float-x, 0) * var(--float-scale) + 20px),
				calc(var(--float-y, 0) * var(--float-scale) - 16px)
			);
		}
		50% {
			transform: translate(
				calc(var(--float-x, 0) * var(--float-scale) + 30px),
				calc(var(--float-y, 0) * var(--float-scale) + 80px)
			);
		}
		75% {
			transform: translate(
				calc(var(--float-x, 0) * var(--float-scale) - 60px),
				calc(var(--float-y, 0) * var(--float-scale) + 30px)
			);
		}
	}

	.floating-center {
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@keyframes pulse-glow {
		0%,
		100% {
			filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.4));
		}
		50% {
			filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.6));
			transform: scale(1.02);
		}
	}

	@media (max-width: 640px) {
		.card-base {
			min-height: 450px !important;
		}
		.card-base > div {
			height: 380px !important;
			padding: 15px !important;
		}
		.floating-player {
			--float-scale: 0.35;
		}
		.floating-center {
			transform: scale(0.9);
		}
	}

	@media (min-width: 641px) and (max-width: 1024px) {
		.floating-player {
			--float-scale: 0.75;
		}
	}
</style>
