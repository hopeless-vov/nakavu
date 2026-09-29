<script setup lang="ts">
import BaseButton from '~/components/ui/BaseButton.vue'
import BeanBurst from '~/components/ui/BeanBurst.vue'
import FeedbackPicker from '~/components/ui/FeedbackPicker.vue'
import MatchReveal from '~/components/ui/MatchReveal.vue'
import PersonCard from '~/components/ui/PersonCard.vue'
import StatusPill from '~/components/ui/StatusPill.vue'
import { useMatchCard } from '~/composables/use-match-card'
import type { Match, MatchFeedback } from '~/types/domain'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ match: Match; decoys: string[] }>()
const { t } = useI18n()
const card = useMatchCard(() => props.match)
const { partners, starters, month, emailHref, firstNames } = card

const revealing = ref(card.isNew.value && partners.value.length > 0)
const celebrate = ref(0)

function revealed() {
  revealing.value = false
  card.markSeen()
}

const feedbackOptions = computed(() =>
  (['met', 'not_yet', 'skipped'] as const).map((value) => ({ value, label: t(`match.feedback.${value}`) })),
)

async function onFeedback(value: MatchFeedback) {
  await card.setFeedback(value)
  if (value === 'met') celebrate.value++
}
</script>

<template>
  <article class="relative overflow-hidden rounded-[28px] border border-line bg-surface shadow-soft">
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
      <p class="font-display text-xl text-fg">
        {{ t('match.title', { month }) }}
      </p>
      <StatusPill tone="ink">
        {{ match.workspaceName }}
      </StatusPill>
    </header>

    <AnimatePresence mode="wait">
      <MatchReveal
        v-if="revealing"
        key="reveal"
        :decoys="decoys"
        :name="partners[0]!.name"
        :avatar-url="partners[0]!.avatarUrl"
        :label="t('match.revealing')"
        @done="revealed"
      />
      <motion.div
        v-else
        key="card"
        class="p-5 sm:p-7"
        :initial="{ opacity: 0, y: 10 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.3 }"
      >
        <div
          class="grid gap-4"
          :class="{ 'md:grid-cols-2': partners.length > 1 }"
        >
          <PersonCard
            v-for="p in partners"
            :key="p.id"
            class="border-0 bg-transparent p-0 shadow-none sm:p-0"
            :size="partners.length > 1 ? 'md' : 'lg'"
            :name="p.name"
            :role="p.role"
            :avatar-url="p.avatarUrl"
            :facts="p.facts"
            :chips="p.chips"
            :ask-label="t('person.askMeAbout')"
            :ask="p.askMeAbout"
          />
        </div>

        <section
          v-if="starters.length"
          class="mt-7"
        >
          <h3 class="text-xs font-semibold tracking-[.14em] text-muted uppercase">
            {{ t('match.starters') }}
          </h3>
          <ol class="mt-3 space-y-2">
            <li
              v-for="(s, i) in starters"
              :key="i"
              class="flex gap-3 rounded-lg bg-surface-2 px-4 py-3 text-fg"
            >
              <span class="font-display text-lg text-accent">{{ i + 1 }}</span>
              <span>{{ s }}</span>
            </li>
          </ol>
        </section>

        <div class="mt-7 flex flex-wrap gap-2">
          <BaseButton :href="emailHref">
            {{ t('match.emailButton', { names: firstNames }) }}
          </BaseButton>
          <BaseButton
            variant="secondary"
            @click="card.addToCalendar"
          >
            {{ t('match.calendar.button') }}
          </BaseButton>
        </div>

        <div class="relative mt-6 border-t border-line pt-5">
          <FeedbackPicker
            :label="t('match.feedback.label')"
            :value="match.myFeedback"
            :options="feedbackOptions"
            @select="onFeedback"
          />
          <BeanBurst
            v-if="celebrate"
            :key="celebrate"
            class="absolute top-8 left-24"
            :count="14"
            :distance="90"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  </article>
</template>
