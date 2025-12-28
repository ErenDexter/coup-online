<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<title>ষড়যন্ত্র - রাজকীয় তাসের খেলা</title>
	<meta name="description" content="ষড়যন্ত্র - একটি রাজকীয় বাংলা তাসের খেলা" />
</svelte:head>
{@render children()}
