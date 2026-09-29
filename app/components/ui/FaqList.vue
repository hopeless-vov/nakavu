<script setup lang="ts">
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui'

defineProps<{ items: { question: string; answer: string }[] }>()
</script>

<template>
  <AccordionRoot
    type="single"
    collapsible
    class="divide-y divide-line rounded-2xl border border-line bg-surface"
  >
    <AccordionItem
      v-for="(item, i) in items"
      :key="i"
      :value="String(i)"
    >
      <AccordionHeader as="h3">
        <AccordionTrigger class="group flex w-full items-center justify-between gap-4 px-5 py-5 text-left font-sans text-[17px] font-semibold text-fg sm:px-6">
          {{ item.question }}
          <span
            class="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition-transform duration-300 group-data-[state=open]:rotate-45"
            aria-hidden="true"
          >+</span>
        </AccordionTrigger>
      </AccordionHeader>
      <AccordionContent class="overflow-hidden text-muted data-[state=closed]:animate-[collapse_.2s_ease-out] data-[state=open]:animate-[expand_.25s_ease-out]">
        <p class="px-5 pb-5 leading-relaxed sm:px-6">
          {{ item.answer }}
        </p>
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>

<style>
@keyframes expand {
  from { height: 0; opacity: 0; }
  to { height: var(--reka-accordion-content-height); opacity: 1; }
}
@keyframes collapse {
  from { height: var(--reka-accordion-content-height); opacity: 1; }
  to { height: 0; opacity: 0; }
}
</style>
