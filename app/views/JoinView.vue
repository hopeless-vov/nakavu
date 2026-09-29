<script setup lang="ts">
import { useLocalePath } from '#imports'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import CupMark from '~/components/ui/CupMark.vue'
import { useJoin } from '~/composables/use-join'
import { useSeo } from '~/composables/use-seo'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { preview, state, error, allowedHint, domainMismatch, signInTo, session, join } = useJoin()

const next = computed(() =>
  preview.value ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(new Date(preview.value.nextRoundAt)) : '',
)
const domains = computed(() => preview.value?.allowedDomains.map((d) => `@${d}`).join(', ') ?? '')

useSeo({ title: 'seo.join.title', description: 'seo.join.description', noindex: true })
</script>

<template>
  <BaseCard
    padding="lg"
    class="w-full max-w-[460px] text-center"
  >
    <div
      v-if="state === 'loading'"
      class="py-10"
      aria-busy="true"
    >
      <CupMark class="mx-auto size-12 animate-pulse" />
    </div>

    <template v-else-if="state === 'missing'">
      <CupMark
        class="mx-auto mb-5 size-14"
        :steam="false"
      />
      <h1 class="text-3xl">
        {{ t('join.missingTitle') }}
      </h1>
      <p class="mt-2 text-muted">
        {{ t('join.missingBody') }}
      </p>
      <BaseButton
        class="mt-7"
        :to="localePath('home')"
      >
        {{ t('notFound.home') }}
      </BaseButton>
    </template>

    <template v-else-if="preview">
      <AvatarBadge
        class="mx-auto"
        :name="preview.name"
        :src="preview.logoUrl"
        size="xl"
        square
      />
      <p class="mt-5 text-sm font-semibold tracking-[.14em] text-muted uppercase">
        {{ t(`join.kind.${preview.kind}`) }}
      </p>
      <h1 class="mt-1 text-3xl leading-tight">
        {{ t('join.title', { name: preview.name }) }}
      </h1>
      <p class="mt-2 text-muted">
        {{ t('join.meta', { count: preview.memberCount, date: next }, preview.memberCount) }}
      </p>
      <p
        v-if="preview.allowedDomains.length && !preview.invitedEmail"
        class="mt-3 text-sm text-muted"
      >
        {{ t('join.domains', { domains }) }}
      </p>

      <p
        v-if="error"
        class="mt-5 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger"
        role="alert"
      >
        {{ t(error) }} <span v-if="allowedHint">{{ allowedHint }}</span>
      </p>
      <p
        v-else-if="domainMismatch"
        class="mt-5 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent-text"
        role="alert"
      >
        {{ t('join.mismatch', { email: session.email, domains }) }}
      </p>

      <BaseButton
        v-if="session.isSignedIn"
        size="lg"
        block
        class="mt-7"
        :loading="state === 'joining'"
        :disabled="domainMismatch"
        @click="join"
      >
        {{ t('join.join', { name: preview.name }) }}
      </BaseButton>
      <BaseButton
        v-else
        size="lg"
        block
        class="mt-7"
        :to="signInTo"
      >
        {{ t('join.signIn') }}
      </BaseButton>
      <p class="mt-4 text-sm text-muted">
        {{ t('join.note') }}
      </p>
    </template>
  </BaseCard>
</template>
