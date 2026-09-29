<script setup lang="ts">
import { useLocalePath } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import CupMark from '~/components/ui/CupMark.vue'
import { useAuthConfirm } from '~/composables/use-auth-confirm'
import { useSeo } from '~/composables/use-seo'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const { state, error, type, next, confirm } = useAuthConfirm()

useSeo({ title: 'seo.confirm.title', description: 'seo.confirm.description', noindex: true })
</script>

<template>
  <BaseCard
    padding="lg"
    class="w-full max-w-[440px] text-center"
  >
    <CupMark class="mx-auto mb-5 size-14" />
    <template v-if="state === 'ready' || state === 'working'">
      <h1 class="text-3xl leading-tight">
        {{ t(type === 'email_change' ? 'auth.confirm.emailChangeTitle' : 'auth.confirm.title') }}
      </h1>
      <p class="mt-2 text-muted">
        {{ t('auth.confirm.subtitle') }}
      </p>
      <BaseButton
        size="lg"
        block
        class="mt-7"
        :loading="state === 'working'"
        @click="confirm"
      >
        {{ t(type === 'email_change' ? 'auth.confirm.emailChangeButton' : 'auth.confirm.button') }}
      </BaseButton>
    </template>
    <template v-else>
      <h1 class="text-3xl leading-tight">
        {{ t('auth.confirm.errorTitle') }}
      </h1>
      <p
        class="mt-2 text-muted"
        role="alert"
      >
        {{ t(error || 'errors.linkInvalid') }}
      </p>
      <BaseButton
        size="lg"
        block
        class="mt-7"
        :to="localePath({ name: 'sign-in', query: { next } })"
      >
        {{ t('auth.confirm.retry') }}
      </BaseButton>
    </template>
  </BaseCard>
</template>
