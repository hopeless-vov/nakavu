<script setup lang="ts">
import { navigateTo, useLocalePath } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StepIndicator from '~/components/ui/StepIndicator.vue'
import WorkspaceFormFields from '~/components/WorkspaceFormFields.vue'
import { useSeo } from '~/composables/use-seo'
import { provideWorkspaceForm, useWorkspaceForm } from '~/composables/use-workspace-form'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const form = provideWorkspaceForm(useWorkspaceForm())
const { draft, upcoming } = form

const fmt = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: draft.timezone }))

async function submit() {
  const ws = await form.create()
  if (ws) await navigateTo(localePath({ name: 'workspace-invite', params: { slug: ws.slug } }))
}

useSeo({ title: 'seo.createWorkspace.title', description: 'seo.createWorkspace.description', noindex: true })
</script>

<template>
  <div>
    <StepIndicator
      :steps="[t('workspaceForm.stepDetails'), t('workspaceForm.stepInvite')]"
      :current="0"
    />
    <PageHeader
      :title="t('workspaceForm.createTitle')"
      :subtitle="t('workspaceForm.createSubtitle')"
    />
    <form
      class="grid items-start gap-8 lg:grid-cols-[1fr_340px]"
      novalidate
      @submit.prevent="submit"
    >
      <div>
        <WorkspaceFormFields />
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <BaseButton
            type="submit"
            size="lg"
            :loading="form.saving.value"
          >
            {{ t('workspaceForm.create') }}
          </BaseButton>
          <BaseButton
            variant="ghost"
            :to="localePath('dashboard')"
          >
            {{ t('common.cancel') }}
          </BaseButton>
          <p
            v-if="form.errors.value.form"
            class="text-sm text-danger"
            role="alert"
          >
            {{ t(form.errors.value.form) }}
          </p>
        </div>
      </div>
      <aside class="lg:sticky lg:top-24">
        <BaseCard tone="muted">
          <p class="text-xs font-semibold tracking-[.14em] text-muted uppercase">
            {{ t('workspaceForm.summary') }}
          </p>
          <p class="mt-3 font-display text-2xl text-fg">
            {{ draft.name.trim() || t('workspaceForm.namePlaceholder') }}
          </p>
          <ul class="mt-4 space-y-2 text-sm text-muted">
            <li>{{ t(`workspaceForm.summarySize.${draft.groupSize}`) }}</li>
            <li>{{ t(`cadence.${draft.cadence}`) }}</li>
            <li>
              {{ draft.allowedDomains.length ? t('workspaceForm.summaryDomains', { domains: draft.allowedDomains.map((d) => `@${d}`).join(', ') }) : t('workspaceForm.summaryOpen') }}
            </li>
          </ul>
          <p class="mt-5 text-xs font-semibold tracking-[.14em] text-muted uppercase">
            {{ t('workspaceForm.upcoming') }}
          </p>
          <ol class="mt-2 space-y-1.5">
            <li
              v-for="(d, i) in upcoming"
              :key="d.toISOString()"
              class="flex items-center gap-2 text-sm"
              :class="i === 0 ? 'font-semibold text-fg' : 'text-muted'"
            >
              <span
                class="size-1.5 rounded-full"
                :class="i === 0 ? 'bg-accent' : 'bg-line'"
              />
              {{ fmt.format(d) }}
            </li>
          </ol>
        </BaseCard>
      </aside>
    </form>
  </div>
</template>
