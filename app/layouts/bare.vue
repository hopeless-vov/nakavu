<script setup lang="ts">
import { NuxtLink } from '#components'
import { useLocalePath } from '#imports'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import BrandMark from '~/components/ui/BrandMark.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="grain relative flex min-h-dvh flex-col overflow-hidden bg-bg text-fg">
    <div
      class="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-accent-soft opacity-70 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -bottom-48 -left-40 size-[480px] rounded-full bg-sage-soft opacity-80 blur-3xl"
      aria-hidden="true"
    />
    <header class="relative z-10 flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
      <NuxtLink
        :to="localePath('home')"
        :aria-label="t('brand.name')"
      >
        <BrandMark
          :name="t('brand.name')"
          size="sm"
        />
      </NuxtLink>
      <div class="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
    <main class="relative z-10 flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
      <slot />
    </main>
  </div>
</template>
