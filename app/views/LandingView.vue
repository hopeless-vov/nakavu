<script setup lang="ts">
import { useLocalePath } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import FaqList from '~/components/ui/FaqList.vue'
import FeatureCard from '~/components/ui/FeatureCard.vue'
import RevealOnScroll from '~/components/ui/RevealOnScroll.vue'
import RouletteReel from '~/components/ui/RouletteReel.vue'
import SectionHeading from '~/components/ui/SectionHeading.vue'
import TwoCups from '~/components/ui/TwoCups.vue'
import { useSeo } from '~/composables/use-seo'
import { useSiteUrl } from '~/composables/use-site-url'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const siteUrl = useSiteUrl()

const createTo = computed(() => localePath({ name: 'sign-in', query: { next: '/app/workspaces/new' } }))

const pairs = computed(() =>
  [0, 1, 2, 3].map((i) => ({
    a: { name: t(`landing.reel.${i}.a`), team: t(`landing.reel.${i}.aTeam`) },
    b: { name: t(`landing.reel.${i}.b`), team: t(`landing.reel.${i}.bTeam`) },
    caption: t(`landing.reel.${i}.caption`),
  })),
)

const steps = [0, 1, 2]
const features = [
  { key: 'smart', tone: 'accent', icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2' },
  { key: 'rhythm', tone: 'sage', icon: 'M4 7h16M4 7v12h16V7M8 3v4M16 3v4M8 12h3v3H8z' },
  { key: 'skip', tone: 'teal', icon: 'M6 5v14M18 5 9 12l9 7z' },
  { key: 'many', tone: 'plum', icon: 'M4 6h7v7H4zM13 11h7v7h-7zM13 4h4M4 17h4' },
  { key: 'starters', tone: 'accent', icon: 'M4 5h16v10H9l-5 4z' },
  { key: 'private', tone: 'sage', icon: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z' },
] as const

const faqs = computed(() => [0, 1, 2, 3].map((i) => ({ question: t(`faq.items.${i}.q`), answer: t(`faq.items.${i}.a`) })))

useSeo({
  title: 'seo.home.title',
  description: 'seo.home.description',
  jsonLd: {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Nakavu',
        url: siteUrl,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        inLanguage: ['uk', 'en', 'nl'],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
      { '@type': 'Organization', name: 'Nakavu', url: siteUrl, logo: `${siteUrl}/favicon.svg` },
    ],
  },
})
</script>

<template>
  <div class="overflow-x-clip">
    <!-- Hero -->
    <section class="relative">
      <div
        class="pointer-events-none absolute -top-32 right-[-10%] size-[640px] rounded-full bg-accent-soft opacity-60 blur-3xl"
        aria-hidden="true"
      />
      <div class="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
        <div>
          <p class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted animate-rise">
            <span class="size-2 animate-pulse rounded-full bg-sage" />
            {{ t('landing.hero.eyebrow') }}
          </p>
          <h1 class="mt-6 text-[44px] leading-[1.02] text-fg sm:text-6xl lg:text-[72px] animate-rise [animation-delay:60ms]">
            <i18n-t
              keypath="landing.hero.title"
              scope="global"
            >
              <template #never>
                <em>{{ t('landing.hero.never') }}</em>
              </template>
            </i18n-t>
          </h1>
          <p class="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl animate-rise [animation-delay:140ms]">
            {{ t('landing.hero.subtitle') }}
          </p>
          <div class="mt-9 flex flex-wrap gap-3 animate-rise [animation-delay:220ms]">
            <BaseButton
              size="lg"
              :to="createTo"
            >
              {{ t('landing.hero.create') }}
            </BaseButton>
            <BaseButton
              size="lg"
              variant="secondary"
              :to="localePath('sign-in')"
            >
              {{ t('landing.hero.join') }}
            </BaseButton>
          </div>
          <p class="mt-5 text-sm text-muted">
            {{ t('landing.hero.note') }}
          </p>
        </div>

        <div class="relative mx-auto w-full max-w-[520px] animate-pop [animation-delay:120ms]">
          <div class="rounded-[36px] border border-line bg-surface-2 p-6 pb-24 sm:p-10 sm:pb-28">
            <TwoCups />
          </div>
          <div class="absolute inset-x-4 -bottom-8 sm:inset-x-10">
            <RouletteReel :pairs="pairs" />
          </div>
        </div>
      </div>
    </section>

    <!-- Who it's for -->
    <section class="border-y border-line bg-surface/60">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-7 text-muted sm:px-6">
        <span class="text-sm font-semibold tracking-[.14em] uppercase">{{ t('landing.for.label') }}</span>
        <span
          v-for="i in 4"
          :key="i"
          class="font-display text-xl text-fg/80 italic"
        >{{ t(`landing.for.items.${i - 1}`) }}</span>
      </div>
    </section>

    <!-- How it works -->
    <section class="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <RevealOnScroll>
        <SectionHeading
          :eyebrow="t('landing.how.eyebrow')"
          :title="t('landing.how.title')"
          :subtitle="t('landing.how.subtitle')"
        />
      </RevealOnScroll>
      <ol class="mt-14 grid gap-5 md:grid-cols-3">
        <RevealOnScroll
          v-for="i in steps"
          :key="i"
          as="li"
          :delay="i * 0.08"
          class="relative rounded-2xl border border-line bg-surface p-7"
        >
          <span class="font-display text-6xl leading-none text-accent/25">{{ i + 1 }}</span>
          <h3 class="mt-4 font-display text-2xl text-fg">
            {{ t(`landing.how.steps.${i}.title`) }}
          </h3>
          <p class="mt-2 leading-relaxed text-muted">
            {{ t(`landing.how.steps.${i}.body`) }}
          </p>
        </RevealOnScroll>
      </ol>
    </section>

    <!-- Features -->
    <section class="bg-surface-2/60 py-24">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <RevealOnScroll>
          <SectionHeading
            :eyebrow="t('landing.features.eyebrow')"
            :title="t('landing.features.title')"
            align="center"
          />
        </RevealOnScroll>
        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <RevealOnScroll
            v-for="(f, i) in features"
            :key="f.key"
            :delay="(i % 3) * 0.06"
          >
            <FeatureCard
              :title="t(`landing.features.items.${f.key}.title`)"
              :body="t(`landing.features.items.${f.key}.body`)"
              :tone="f.tone"
            >
              <template #icon>
                <svg
                  viewBox="0 0 24 24"
                  class="size-6"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                ><path :d="f.icon" /></svg>
              </template>
            </FeatureCard>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <!-- Audiences -->
    <section class="mx-auto grid max-w-6xl gap-5 px-4 py-24 sm:px-6 md:grid-cols-2">
      <RevealOnScroll
        v-for="(a, i) in (['teams', 'friends'] as const)"
        :key="a"
        :delay="i * 0.08"
      >
        <div
          class="flex h-full flex-col rounded-[32px] p-8 sm:p-10"
          :class="a === 'teams' ? 'bg-ink text-on-ink' : 'bg-accent-soft text-accent-text'"
        >
          <p class="text-xs font-semibold tracking-[.16em] uppercase opacity-70">
            {{ t(`landing.audience.${a}.eyebrow`) }}
          </p>
          <h3 class="mt-3 font-display text-3xl sm:text-4xl">
            {{ t(`landing.audience.${a}.title`) }}
          </h3>
          <p class="mt-3 max-w-md opacity-80">
            {{ t(`landing.audience.${a}.body`) }}
          </p>
          <div class="mt-auto pt-8">
            <BaseButton
              :variant="a === 'teams' ? 'primary' : 'ink'"
              :to="localePath(a === 'teams' ? 'for-teams' : 'for-friends')"
            >
              {{ t(`landing.audience.${a}.cta`) }}
            </BaseButton>
          </div>
        </div>
      </RevealOnScroll>
    </section>

    <!-- FAQ -->
    <section class="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
      <RevealOnScroll>
        <SectionHeading
          :title="t('faq.title')"
          align="center"
        />
        <div class="mt-10">
          <FaqList :items="faqs" />
        </div>
        <p class="mt-6 text-center">
          <BaseButton
            variant="ghost"
            :to="localePath('faq')"
          >
            {{ t('faq.more') }}
          </BaseButton>
        </p>
      </RevealOnScroll>
    </section>

    <!-- CTA -->
    <section class="px-4 pb-24 sm:px-6">
      <RevealOnScroll>
        <div class="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-accent px-6 py-16 text-center text-on-accent sm:px-12">
          <div
            class="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-on-accent/10"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full bg-on-accent/10"
            aria-hidden="true"
          />
          <h2
            :key="locale"
            class="relative mx-auto max-w-2xl text-4xl leading-tight sm:text-5xl"
          >
            {{ t('landing.cta.title') }}
          </h2>
          <p class="relative mx-auto mt-4 max-w-lg text-lg opacity-85">
            {{ t('landing.cta.body') }}
          </p>
          <div class="relative mt-9 flex flex-wrap justify-center gap-3">
            <BaseButton
              size="lg"
              variant="ink"
              :to="createTo"
            >
              {{ t('landing.hero.create') }}
            </BaseButton>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  </div>
</template>
