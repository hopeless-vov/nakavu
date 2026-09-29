<script setup lang="ts">
import LegalPage from '~/components/LegalPage.vue'
import { useSeo } from '~/composables/use-seo'

useSeo({ title: 'seo.privacy.title', description: 'seo.privacy.description' })
</script>

<template>
  <LegalPage
    doc="privacy"
    :sections="7"
  />
</template>
