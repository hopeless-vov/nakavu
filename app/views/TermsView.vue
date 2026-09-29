<script setup lang="ts">
import LegalPage from '~/components/LegalPage.vue'
import { useSeo } from '~/composables/use-seo'

useSeo({ title: 'seo.terms.title', description: 'seo.terms.description' })
</script>

<template>
  <LegalPage
    doc="terms"
    :sections="6"
  />
</template>
