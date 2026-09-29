<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core'
import { ClientOnly, NuxtLink } from '#components'
import { useLocalePath, useRoute } from '#imports'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BrandMark from '~/components/ui/BrandMark.vue'
import { useSessionStore } from '~/stores/session'
import { AnimatePresence, motion } from 'motion-v'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const session = useSessionStore()
const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 8)
const open = ref(false)

watch(() => route.fullPath, () => (open.value = false))
onMounted(() => session.init().catch(() => undefined))

const links = computed(() => [
  { to: localePath('for-teams'), label: t('site.nav.teams') },
  { to: localePath('for-friends'), label: t('site.nav.friends') },
  { to: localePath('faq'), label: t('site.nav.faq') },
])
</script>

<template>
  <header
    class="sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300"
    :class="scrolled || open ? 'border-b border-line bg-bg/85 backdrop-blur-md' : 'border-b border-transparent'"
  >
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <NuxtLink
        :to="localePath('home')"
        :aria-label="t('brand.name')"
      >
        <BrandMark :name="t('brand.name')" />
      </NuxtLink>

      <nav
        class="hidden items-center gap-1 md:flex"
        :aria-label="t('site.nav.label')"
      >
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="rounded-full px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          active-class="text-fg"
        >
          {{ l.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2">
        <div class="hidden items-center gap-1 lg:flex">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <ClientOnly>
          <BaseButton
            v-if="session.isSignedIn"
            size="sm"
            :to="localePath('dashboard')"
          >
            {{ t('site.openApp') }}
          </BaseButton>
          <template v-else>
            <BaseButton
              variant="ghost"
              size="sm"
              class="hidden sm:inline-flex"
              :to="localePath('sign-in')"
            >
              {{ t('site.signIn') }}
            </BaseButton>
            <BaseButton
              size="sm"
              :to="localePath({ name: 'sign-in', query: { next: '/app/workspaces/new' } })"
            >
              <span class="sm:hidden">{{ t('site.start') }}</span>
              <span class="hidden sm:inline">{{ t('site.createWorkspace') }}</span>
            </BaseButton>
          </template>
          <template #fallback>
            <BaseButton
              size="sm"
              :to="localePath('sign-in')"
            >
              {{ t('site.signIn') }}
            </BaseButton>
          </template>
        </ClientOnly>
        <button
          type="button"
          class="grid size-9 place-items-center rounded-full text-fg hover:bg-surface-2 md:hidden"
          :aria-expanded="open"
          :aria-label="t('site.nav.menu')"
          @click="open = !open"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path :d="open ? 'M6 6l12 12M18 6 6 18' : 'M4 8h16M4 16h16'" />
          </svg>
        </button>
      </div>
    </div>

    <AnimatePresence>
      <motion.nav
        v-if="open"
        class="overflow-hidden border-t border-line md:hidden"
        :aria-label="t('site.nav.label')"
        :initial="{ height: 0, opacity: 0 }"
        :animate="{ height: 'auto', opacity: 1 }"
        :exit="{ height: 0, opacity: 0 }"
        :transition="{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="flex flex-col gap-1 px-4 py-4">
          <NuxtLink
            v-for="l in links"
            :key="l.to"
            :to="l.to"
            class="rounded-lg px-3 py-3 font-medium text-fg hover:bg-surface-2"
          >
            {{ l.label }}
          </NuxtLink>
          <NuxtLink
            :to="localePath('sign-in')"
            class="rounded-lg px-3 py-3 font-medium text-fg hover:bg-surface-2"
          >
            {{ t('site.signIn') }}
          </NuxtLink>
          <div class="mt-2 flex items-center justify-between px-3">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </motion.nav>
    </AnimatePresence>
  </header>
</template>
