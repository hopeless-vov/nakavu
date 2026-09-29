<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <main class="grid min-h-dvh place-items-center">
    <h1 class="font-display text-5xl">
      {{ t('notFound.title') }}
    </h1>
  </main>
</template>
