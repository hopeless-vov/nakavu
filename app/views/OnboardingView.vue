<script setup lang="ts">
import { navigateTo, useLocalePath, useRoute } from '#imports'
import ProfileFields from '~/components/ProfileFields.vue'
import ProfilePreview from '~/components/ProfilePreview.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { provideProfileForm, useProfileForm } from '~/composables/use-profile-form'
import { useSeo } from '~/composables/use-seo'
import { useSessionStore } from '~/stores/session'
import { useToastStore } from '~/stores/toast'
import { safeNext } from '~/utils/access'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const session = useSessionStore()
const toast = useToastStore()
const form = provideProfileForm(useProfileForm({ onboarding: true }))

async function finish() {
  if (!(await form.save())) return
  toast.show(t('onboarding.welcome', { name: form.draft.firstName.trim() }), 'success')
  await navigateTo(localePath(safeNext(route.query.next)))
}

useSeo({ title: 'seo.onboarding.title', description: 'seo.onboarding.description', noindex: true })
</script>

<template>
  <div class="mx-auto w-full max-w-6xl py-4">
    <PageHeader
      :eyebrow="t('onboarding.eyebrow')"
      :title="t('onboarding.title')"
      :subtitle="t('onboarding.subtitle')"
    />
    <div class="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
      <form
        novalidate
        @submit.prevent="finish"
      >
        <ProfileFields />
        <div class="mt-6 flex flex-wrap items-center gap-4">
          <BaseButton
            type="submit"
            size="lg"
            :loading="form.saving.value"
          >
            {{ t('onboarding.finish') }}
          </BaseButton>
          <p
            v-if="form.errors.value.form || Object.keys(form.errors.value).length"
            class="text-sm text-danger"
            role="alert"
          >
            {{ t(form.errors.value.form ?? 'onboarding.fixErrors') }}
          </p>
        </div>
      </form>
      <aside class="lg:sticky lg:top-8">
        <ProfilePreview
          :draft="form.draft"
          :avatar-url="session.profile?.avatarUrl"
        />
        <p class="mt-4 text-sm text-muted">
          {{ t('onboarding.privacy') }}
        </p>
      </aside>
    </div>
  </div>
</template>
