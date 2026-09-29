<script setup lang="ts">
import PageHeader from '~/components/ui/PageHeader.vue'
import { useI18n } from 'vue-i18n'

/** Privacy policy / terms. Sections are legal.<doc>.sections.<n>.{title,body}. */
const props = defineProps<{ doc: 'privacy' | 'terms'; sections: number }>()
const { t } = useI18n()
const base = `legal.${props.doc}`
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
    <PageHeader
      :title="t(`${base}.title`)"
      :subtitle="t('legal.updated')"
    />
    <p class="text-lg leading-relaxed text-muted">
      {{ t(`${base}.intro`) }}
    </p>
    <section
      v-for="i in sections"
      :key="i"
      class="mt-10"
    >
      <h2 class="text-2xl text-fg">
        {{ t(`${base}.sections.${i - 1}.title`) }}
      </h2>
      <p class="mt-3 leading-relaxed whitespace-pre-line text-muted">
        {{ t(`${base}.sections.${i - 1}.body`) }}
      </p>
    </section>
  </article>
</template>
