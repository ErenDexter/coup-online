<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		status: 'connecting' | 'connected' | 'disconnected';
	}

	let { status }: Props = $props();
</script>

{#if status === 'disconnected'}
	<div
		class="fixed top-0 right-0 left-0 z-50 bg-red-900/90 py-2 text-center text-sm font-medium"
		transition:fade
	>
		⚠️ সংযোগ বিচ্ছিন্ন। পুনরায় সংযোগ করার চেষ্টা করা হচ্ছে...
	</div>
{/if}
