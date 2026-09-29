<script setup lang="ts">
import FaqList from '~/components/ui/FaqList.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useSeo } from '~/composables/use-seo'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const items = computed(() => Array.from({ length: 10 }, (_, i) => ({ question: t(`faq.items.${i}.q`), answer: t(`faq.items.${i}.a`) })))

useSeo({
  title: 'seo.faq.title',
  description: 'seo.faq.description',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.value.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  },
})
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
    <PageHeader
      :title="t('faq.title')"
      :subtitle="t('faq.subtitle')"
    />
    <FaqList :items="items" />
  </div>
</template>
