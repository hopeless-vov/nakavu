<script setup lang="ts">
import type { Provider } from '@supabase/supabase-js'
import { useLocalePath, useRuntimeConfig } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import CupMark from '~/components/ui/CupMark.vue'
import OtpInput from '~/components/ui/OtpInput.vue'
import TextField from '~/components/ui/TextField.vue'
import { useSeo } from '~/composables/use-seo'
import { useSignIn } from '~/composables/use-sign-in'
import { useSessionStore } from '~/stores/session'
import { AnimatePresence, motion } from 'motion-v'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const session = useSessionStore()
const localePath = useLocalePath()
const { step, email, code, error, busy, cooldown, next, sendEmail, resend, verify, changeEmail } = useSignIn()

const providers = computed(() =>
  String(useRuntimeConfig().public.authProviders ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter((p): p is 'azure' | 'google' => p === 'azure' || p === 'google'),
)
const oauthError = ref('')

async function withProvider(provider: Provider) {
  oauthError.value = ''
  try {
    await session.signInWithProvider(provider, `${window.location.origin}${localePath('auth-confirm')}?next=${encodeURIComponent(next.value)}`)
  } catch {
    oauthError.value = 'common.somethingWrong'
  }
}

const intent = computed(() => (next.value.includes('/workspaces/new') ? 'create' : next.value.startsWith('/join') ? 'join' : 'default'))

useSeo({ title: 'seo.signIn.title', description: 'seo.signIn.description', noindex: true })
</script>

<template>
  <BaseCard
    padding="lg"
    class="w-full max-w-[440px]"
  >
    <AnimatePresence
      mode="wait"
      :initial="false"
    >
      <motion.div
        v-if="step === 'email'"
        key="email"
        :initial="{ opacity: 0, x: -16 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: -16 }"
        :transition="{ duration: 0.22 }"
      >
        <CupMark class="mb-5 size-11" />
        <h1 class="text-3xl leading-tight">
          {{ t(`auth.signIn.title.${intent}`) }}
        </h1>
        <p class="mt-2 text-muted">
          {{ t('auth.signIn.subtitle') }}
        </p>
        <form
          class="mt-7 flex flex-col gap-4"
          novalidate
          @submit.prevent="sendEmail"
        >
          <TextField
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            :label="t('auth.signIn.emailLabel')"
            :placeholder="t('auth.signIn.emailPlaceholder')"
            :error="error ? t(error) : undefined"
            :hint="t('auth.signIn.emailHint')"
            required
          />
          <BaseButton
            type="submit"
            size="lg"
            block
            :loading="busy"
          >
            {{ t('auth.signIn.send') }}
          </BaseButton>
        </form>
        <template v-if="providers.length">
          <div class="my-5 flex items-center gap-3 text-xs font-semibold tracking-wider text-muted uppercase">
            <span class="h-px flex-1 bg-line" />
            {{ t('auth.signIn.or') }}
            <span class="h-px flex-1 bg-line" />
          </div>
          <div class="flex flex-col gap-2">
            <BaseButton
              v-for="p in providers"
              :key="p"
              variant="secondary"
              block
              @click="withProvider(p)"
            >
              {{ t(`auth.signIn.provider.${p}`) }}
            </BaseButton>
          </div>
          <p
            v-if="oauthError"
            class="mt-3 text-sm text-danger"
            role="alert"
          >
            {{ t(oauthError) }}
          </p>
        </template>
      </motion.div>

      <motion.div
        v-else
        key="code"
        :initial="{ opacity: 0, x: 16 }"
        :animate="{ opacity: 1, x: 0 }"
        :exit="{ opacity: 0, x: 16 }"
        :transition="{ duration: 0.22 }"
        class="text-center"
      >
        <div class="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-sage-soft text-sage-text">
          <svg
            viewBox="0 0 24 24"
            class="size-7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2.5"
            />
            <path d="m4 7 8 6 8-6" />
          </svg>
        </div>
        <h1 class="text-3xl leading-tight">
          {{ t('auth.code.title') }}
        </h1>
        <i18n-t
          keypath="auth.code.subtitle"
          tag="p"
          class="mt-2 text-muted"
          scope="global"
        >
          <template #email>
            <strong class="text-fg">{{ email }}</strong>
          </template>
        </i18n-t>
        <form
          class="mt-7"
          @submit.prevent="verify()"
        >
          <OtpInput
            v-model="code"
            :label="t('auth.code.label')"
            :invalid="!!error"
            :disabled="busy"
            @complete="verify"
          />
          <p
            v-if="error"
            class="mt-3 text-sm text-danger"
            role="alert"
          >
            {{ t(error) }}
          </p>
          <BaseButton
            type="submit"
            size="lg"
            block
            class="mt-5"
            :loading="busy"
          >
            {{ t('auth.code.submit') }}
          </BaseButton>
        </form>
        <p class="mt-4 text-sm text-muted">
          {{ t('auth.code.linkHint') }}
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-1">
          <BaseButton
            variant="ghost"
            size="sm"
            :disabled="cooldown > 0"
            @click="resend"
          >
            {{ cooldown > 0 ? t('auth.code.resendIn', { seconds: cooldown }) : t('auth.code.resend') }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            @click="changeEmail"
          >
            {{ t('auth.code.changeEmail') }}
          </BaseButton>
        </div>
      </motion.div>
    </AnimatePresence>
  </BaseCard>
</template>
