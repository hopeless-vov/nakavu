<script setup lang="ts">
import { NuxtLink } from '#components'
import { useLocalePath, useRoute } from '#imports'
import AccountMenu from '~/components/AccountMenu.vue'
import BrandMark from '~/components/ui/BrandMark.vue'
import { useWorkspacesStore } from '~/stores/workspaces'
import { AnimatePresence, motion } from 'motion-v'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const workspaces = useWorkspacesStore()

onMounted(() => workspaces.load().catch(() => undefined))

const nav = computed(() => [
  { name: 'dashboard', label: t('app.nav.home'), icon: 'M4 11l8-7 8 7v9H4z M10 20v-6h4v6' },
  { name: 'history', label: t('app.nav.history'), icon: 'M12 7v5l3 2 M4 12a8 8 0 1 0 2.3-5.6L4 8.7 M4 4v4.7h4.7' },
  { name: 'workspaces', label: t('app.nav.workspaces'), icon: 'M4 5h7v7H4z M13 5h7v7h-7z M4 14h7v5H4z M13 14h7v5h-7z' },
  { name: 'account', label: t('app.nav.account'), icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0' },
])

const active = (name: string) => {
  const r = String(route.name ?? '').split('___')[0]!
  return r === name || (name === 'workspaces' && r.startsWith('workspace-'))
}
</script>

<template>
  <div class="grain min-h-dvh bg-bg text-fg">
    <header class="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink
          :to="localePath('dashboard')"
          :aria-label="t('app.nav.home')"
        >
          <BrandMark :name="t('brand.name')" />
        </NuxtLink>
        <nav
          class="hidden items-center gap-1 rounded-full border border-line bg-surface p-1 md:flex"
          :aria-label="t('app.nav.label')"
        >
          <NuxtLink
            v-for="n in nav"
            :key="n.name"
            :to="localePath(n.name)"
            class="relative rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
            :class="active(n.name) ? 'text-on-ink' : 'text-muted hover:text-fg'"
            :aria-current="active(n.name) ? 'page' : undefined"
          >
            <motion.span
              v-if="active(n.name)"
              layout-id="app-nav-pill"
              class="absolute inset-0 rounded-full bg-ink"
              :transition="{ type: 'spring', stiffness: 500, damping: 38 }"
            />
            <span class="relative">{{ n.label }}</span>
          </NuxtLink>
        </nav>
        <AccountMenu />
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pt-8 pb-28 sm:px-6 md:pb-16">
      <AnimatePresence mode="wait">
        <motion.div
          :key="String(route.name)"
          :initial="{ opacity: 0, y: 6 }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0, y: -4 }"
          :transition="{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }"
        >
          <slot />
        </motion.div>
      </AnimatePresence>
    </main>

    <!-- Mobile tab bar -->
    <nav
      class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-line bg-surface/95 p-1.5 shadow-lift backdrop-blur md:hidden"
      :aria-label="t('app.nav.label')"
    >
      <NuxtLink
        v-for="n in nav"
        :key="n.name"
        :to="localePath(n.name)"
        class="relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold"
        :class="active(n.name) ? 'text-accent-text' : 'text-muted'"
        :aria-current="active(n.name) ? 'page' : undefined"
      >
        <motion.span
          v-if="active(n.name)"
          layout-id="app-tab-pill"
          class="absolute inset-0 rounded-xl bg-accent-soft"
          :transition="{ type: 'spring', stiffness: 500, damping: 38 }"
        />
        <svg
          viewBox="0 0 24 24"
          class="relative size-5"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path :d="n.icon" /></svg>
        <span class="relative">{{ n.label }}</span>
      </NuxtLink>
    </nav>
  </div>
</template>
