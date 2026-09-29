<script setup lang="ts">
import AudiencePage from '~/components/AudiencePage.vue'
import { useSeo } from '~/composables/use-seo'

useSeo({ title: 'seo.friends.title', description: 'seo.friends.description' })
</script>

<template>
  <AudiencePage audience="friends" />
</template>
