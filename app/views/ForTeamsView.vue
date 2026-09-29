<script setup lang="ts">
import AudiencePage from '~/components/AudiencePage.vue'
import { useSeo } from '~/composables/use-seo'

useSeo({ title: 'seo.teams.title', description: 'seo.teams.description' })
</script>

<template>
  <AudiencePage audience="teams" />
</template>
