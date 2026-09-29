<script setup lang="ts">
import { setResponseStatus, useLocalePath, useRequestEvent } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import CupMark from '~/components/ui/CupMark.vue'
import { useSeo } from '~/composables/use-seo'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()

const event = useRequestEvent()
if (event) setResponseStatus(event, 404)

useSeo({ title: 'seo.notFound.title', description: 'seo.notFound.description', noindex: true })
</script>

<template>
  <main class="grid min-h-[70dvh] place-items-center px-4 py-20 text-center">
    <div class="flex max-w-md flex-col items-center">
      <CupMark
        class="mb-6 size-20 -rotate-12"
        :steam="false"
      />
      <h1 class="text-4xl text-fg sm:text-5xl">
        {{ t('notFound.title') }}
      </h1>
      <p class="mt-3 text-muted">
        {{ t('notFound.body') }}
      </p>
      <BaseButton
        class="mt-8"
        :to="localePath('home')"
      >
        {{ t('notFound.home') }}
      </BaseButton>
    </div>
  </main>
</template>
