<script setup lang="ts">
import { useLocalePath } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import PersonCard from '~/components/ui/PersonCard.vue'
import RevealOnScroll from '~/components/ui/RevealOnScroll.vue'
import SectionHeading from '~/components/ui/SectionHeading.vue'
import { motion } from 'motion-v'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/** Shared template for /for-teams and /for-friends. Copy lives under audience.<kind>.* */
const props = defineProps<{ audience: 'teams' | 'friends' }>()

const { t } = useI18n()
const localePath = useLocalePath()
const k = (key: string) => `audience.${props.audience}.${key}`

const points = [0, 1, 2, 3]
const createTo = computed(() => localePath({ name: 'sign-in', query: { next: '/app/workspaces/new' } }))
</script>

<template>
  <div>
    <section class="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-20 sm:px-6 lg:grid-cols-2 lg:pt-20">
      <div>
        <motion.p
          class="text-xs font-semibold tracking-[.16em] text-accent-text uppercase"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
        >
          {{ t(k('eyebrow')) }}
        </motion.p>
        <motion.h1
          class="mt-4 text-5xl leading-[1.05] text-fg sm:text-6xl"
          :initial="{ opacity: 0, y: 14 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45 }"
        >
          {{ t(k('title')) }}
        </motion.h1>
        <motion.p
          class="mt-6 max-w-xl text-lg leading-relaxed text-muted"
          :initial="{ opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.1 }"
        >
          {{ t(k('subtitle')) }}
        </motion.p>
        <div class="mt-8">
          <BaseButton
            size="lg"
            :to="createTo"
          >
            {{ t(k('cta')) }}
          </BaseButton>
        </div>
      </div>
      <motion.div
        class="relative mx-auto w-full max-w-md"
        :initial="{ opacity: 0, rotate: 0, y: 20 }"
        :animate="{ opacity: 1, rotate: -2, y: 0 }"
        :transition="{ type: 'spring', stiffness: 120, damping: 16, delay: 0.15 }"
      >
        <PersonCard
          size="lg"
          :eyebrow="t(k('card.eyebrow'))"
          :name="t(k('card.name'))"
          :role="t(k('card.role'))"
          :facts="[t(k('card.fact1')), t(k('card.fact2'))]"
          :ask-label="t('person.askMeAbout')"
          :ask="t(k('card.ask'))"
          :chips="[{ label: t(k('card.shared')), shared: true }, { label: t(k('card.other')) }]"
        />
      </motion.div>
    </section>

    <section class="bg-surface-2/60 py-20">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <RevealOnScroll>
          <SectionHeading :title="t(k('why'))" />
        </RevealOnScroll>
        <div class="mt-12 grid gap-5 sm:grid-cols-2">
          <RevealOnScroll
            v-for="i in points"
            :key="i"
            :delay="(i % 2) * 0.06"
            class="rounded-2xl border border-line bg-surface p-7"
          >
            <h3 class="font-display text-2xl text-fg">
              {{ t(k(`points.${i}.title`)) }}
            </h3>
            <p class="mt-2 leading-relaxed text-muted">
              {{ t(k(`points.${i}.body`)) }}
            </p>
          </RevealOnScroll>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <RevealOnScroll>
        <h2 class="text-4xl text-fg">
          {{ t(k('closing')) }}
        </h2>
        <div class="mt-8">
          <BaseButton
            size="lg"
            :to="createTo"
          >
            {{ t(k('cta')) }}
          </BaseButton>
        </div>
      </RevealOnScroll>
    </section>
  </div>
</template>
