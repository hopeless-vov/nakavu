<script setup lang="ts">
import { NuxtLink } from '#components'
import { useLocalePath } from '#imports'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import BrandMark from '~/components/ui/BrandMark.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const columns = [
  { title: 'site.footer.product', links: [['for-teams', 'site.nav.teams'], ['for-friends', 'site.nav.friends'], ['faq', 'site.nav.faq']] },
  { title: 'site.footer.company', links: [['privacy', 'site.footer.privacy'], ['terms', 'site.footer.terms']] },
] as const
</script>

<template>
  <footer class="border-t border-line">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
      <div>
        <BrandMark :name="t('brand.name')" />
        <p class="mt-4 max-w-xs text-muted">
          {{ t('site.footer.blurb') }}
        </p>
        <div class="mt-5">
          <LanguageSwitcher />
        </div>
      </div>
      <nav
        v-for="col in columns"
        :key="col.title"
        :aria-label="t(col.title)"
      >
        <p class="text-xs font-semibold tracking-[.14em] text-muted uppercase">
          {{ t(col.title) }}
        </p>
        <ul class="mt-4 space-y-2.5">
          <li
            v-for="[name, label] in col.links"
            :key="name"
          >
            <NuxtLink
              :to="localePath(name)"
              class="text-fg transition-colors hover:text-accent"
            >
              {{ t(label) }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-line">
      <p class="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
        {{ t('site.footer.copyright', { year }) }}
      </p>
    </div>
  </footer>
</template>
