<script setup lang="ts">
import { ClientOnly, NuxtLayout, NuxtPage, NuxtRouteAnnouncer } from '#components'
import { useHead, useLocaleHead } from '#imports'
import AppToasts from '~/components/AppToasts.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const i18nHead = useLocaleHead({ dir: true, lang: true, seo: true })

useHead({
  titleTemplate: (title) => (title ? `${title} · ${t('brand.name')}` : `${t('brand.name')} — ${t('brand.tagline')}`),
  htmlAttrs: { lang: () => i18nHead.value.htmlAttrs.lang, dir: () => i18nHead.value.htmlAttrs.dir },
  link: () => [...(i18nHead.value.link ?? [])],
  meta: () => [...(i18nHead.value.meta ?? [])],
})
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <AppToasts />
  </ClientOnly>
</template>
