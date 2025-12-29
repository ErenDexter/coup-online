<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		onclose: () => void;
	}

	let { onclose }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
	transition:fade
	onclick={onclose}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border-2 border-[#D4AF37]/40 bg-linear-to-br from-primary/98 to-[#2D1B1B]/98 backdrop-blur-sm"
		transition:scale={{ duration: 200 }}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="document"
	>
		<!-- Header -->
		<div class="sticky top-0 z-10 border-b border-[#D4AF37]/30 bg-primary px-4 py-4 md:px-6">
			<div class="flex items-center justify-between">
				<h2
					class="text-xl font-bold text-[#D4AF37] md:text-2xl"
					style="font-family: 'Tiro Bangla', serif;"
				>
					কু (Coup) রেফারেন্স কার্ড
				</h2>
				<button
					onclick={onclose}
					class="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4AF37]/30 text-[#F5F0E1]/70 transition-colors hover:bg-[#D4AF37]/20 hover:text-[#F5F0E1]"
				>
					✕
				</button>
			</div>
		</div>

		<div class="space-y-6 p-4 md:p-6">
			<!-- Basic Actions Section -->
			<section>
				<h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-[#F5F0E1] md:text-lg">
					<span class="h-px flex-1 bg-[#D4AF37]/30"></span>
					<span>সাধারণ কাজ</span>
					<span class="h-px flex-1 bg-[#D4AF37]/30"></span>
				</h3>
				<div class="space-y-2">
					<!-- Income -->
					<div
						class="grid grid-cols-1 gap-1 rounded-lg border border-[#D4AF37]/10 bg-[#D4AF37]/5 p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:gap-2"
					>
						<div class="flex items-center gap-2 font-semibold text-[#F5F0E1]">
							<span class="text-[#D4AF37]">+1</span>
							<span>আয় (Income)</span>
						</div>
						<div class="pl-6 text-[#F5F0E1]/90 sm:pl-0">১টি মোহর নিন</div>
						<div class="pl-6 text-xs text-[#F5F0E1]/60 sm:pl-0">—</div>
					</div>
					<!-- Foreign Aid -->
					<div
						class="grid grid-cols-1 gap-1 rounded-lg border border-[#D4AF37]/10 bg-[#D4AF37]/5 p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:gap-2"
					>
						<div class="flex items-center gap-2 font-semibold text-[#F5F0E1]">
							<span class="text-[#D4AF37]">+2</span>
							<span>বৈদেশিক সাহায্য</span>
						</div>
						<div class="pl-6 text-[#F5F0E1]/90 sm:pl-0">২টি মোহর নিন</div>
						<div class="pl-6 text-xs text-red-400 sm:pl-0">জমিদার দ্বারা বাধা</div>
					</div>
					<!-- Coup -->
					<div
						class="grid grid-cols-1 gap-1 rounded-lg border border-[#D4AF37]/10 bg-[#D4AF37]/5 p-3 text-sm sm:grid-cols-[1fr_1fr_auto] sm:gap-2"
					>
						<div class="flex items-center gap-2 font-semibold text-[#F5F0E1]">
							<span class="text-red-500">-7</span>
							<span>কু (Coup)</span>
						</div>
						<div class="pl-6 text-[#F5F0E1]/90 sm:pl-0">৭টি মোহর দিন, প্রভাব নষ্ট করুন</div>
						<div class="pl-6 text-xs text-[#F5F0E1]/60 sm:pl-0">—</div>
					</div>
				</div>
			</section>

			<!-- Character Actions Section -->
			<section>
				<h3 class="mb-3 flex items-center gap-2 text-base font-semibold text-[#F5F0E1] md:text-lg">
					<span class="h-px flex-1 bg-[#D4AF37]/30"></span>
					<span>চরিত্র ভিত্তিক কাজ</span>
					<span class="h-px flex-1 bg-[#D4AF37]/30"></span>
				</h3>
				<div class="space-y-3">
					<!-- Duke -->
					<div class="rounded-xl border-l-4 border-l-purple-600 bg-purple-600/10 p-3 md:p-3.5">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-bold text-[#D4AF37] md:text-base">জমিদার (Duke)</span>
						</div>
						<div class="flex flex-col gap-1 pl-1 text-sm text-[#F5F0E1]/90 md:text-[0.85rem]">
							<div>
								<span class="font-semibold text-[#D4AF37]/80">কাজ:</span>
								কর (Tax) — ৩টি মোহর নিন
							</div>
							<div>
								<span class="font-semibold text-[#D4AF37]/80">বাধা:</span>
								বৈদেশিক সাহায্য বন্ধ করুন
							</div>
						</div>
					</div>

					<!-- Assassin -->
					<div class="rounded-xl border-l-4 border-l-red-500 bg-red-500/10 p-3 md:p-3.5">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-bold text-[#D4AF37] md:text-base">ঘাতক (Assassin)</span>
						</div>
						<div class="flex flex-col gap-1 pl-1 text-sm text-[#F5F0E1]/90 md:text-[0.85rem]">
							<div>
								<span class="font-semibold text-[#D4AF37]/80">কাজ:</span>
								হত্যা — ৩টি মোহর দিন, প্রভাব নষ্ট করুন
							</div>
						</div>
					</div>

					<!-- Ambassador -->
					<div class="rounded-xl border-l-4 border-l-green-500 bg-green-500/10 p-3 md:p-3.5">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-bold text-[#D4AF37] md:text-base">মন্ত্রী (Ambassador)</span
							>
						</div>
						<div class="flex flex-col gap-1 pl-1 text-sm text-[#F5F0E1]/90 md:text-[0.85rem]">
							<div>
								<span class="font-semibold text-[#D4AF37]/80">কাজ:</span>
								বিনিময় — ২টি কার্ড তুলে ২টি ফেরত দিন
							</div>
							<div>
								<span class="font-semibold text-[#D4AF37]/80">বাধা:</span>
								চুরি ঠেকান
							</div>
						</div>
					</div>

					<!-- Captain -->
					<div class="rounded-xl border-l-4 border-l-blue-500 bg-blue-500/10 p-3 md:p-3.5">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-bold text-[#D4AF37] md:text-base">সেনাপতি (Captain)</span>
						</div>
						<div class="flex flex-col gap-1 pl-1 text-sm text-[#F5F0E1]/90 md:text-[0.85rem]">
							<div>
								<span class="font-semibold text-[#D4AF37]/80">কাজ:</span>
								চুরি — অন্যের থেকে ২টি মোহর নিন
							</div>
							<div>
								<span class="font-semibold text-[#D4AF37]/80">বাধা:</span>
								চুরি ঠেকান
							</div>
						</div>
					</div>

					<!-- Contessa -->
					<div class="rounded-xl border-l-4 border-l-pink-500 bg-pink-500/10 p-3 md:p-3.5">
						<div class="mb-2 flex items-center gap-2">
							<span class="text-sm font-bold text-[#D4AF37] md:text-base">রাজমাতা (Contessa)</span>
						</div>
						<div class="flex flex-col gap-1 pl-1 text-sm text-[#F5F0E1]/90 md:text-[0.85rem]">
							<div>
								<span class="font-semibold text-[#D4AF37]/80">বাধা:</span>
								হত্যা ঠেকান
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Tips Section -->
			<section class="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4">
				<h3 class="mb-2 text-sm font-semibold text-[#D4AF37]">টিপস</h3>
				<ul class="space-y-1 text-xs text-[#F5F0E1]/80 md:text-sm">
					<li>• যেকোনো কাজ চ্যালেঞ্জ করা যায় (আয় ও কু ছাড়া)</li>
					<li>• ১০+ মোহর থাকলে অবশ্যই কু করতে হবে</li>
					<li>• চ্যালেঞ্জে হারলে একটি প্রভাব হারাবেন</li>
					<li>• সব প্রভাব হারালে খেলা থেকে বাদ</li>
				</ul>
			</section>
		</div>
	</div>
</div>
