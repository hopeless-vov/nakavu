<script setup lang="ts">
import { useLocalePath, useRoute } from '#imports'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import CopyField from '~/components/ui/CopyField.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import StepIndicator from '~/components/ui/StepIndicator.vue'
import TextField from '~/components/ui/TextField.vue'
import TwoCups from '~/components/ui/TwoCups.vue'
import { useInvites } from '~/composables/use-invites'
import { useSeo } from '~/composables/use-seo'
import { useWorkspacesStore } from '~/stores/workspaces'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const store = useWorkspacesStore()
const workspace = computed(() => store.bySlug(String(route.params.slug)))
const inv = useInvites(workspace)
const { link, copied, emailsText, parsed, pending, sending, error, sentCount } = inv

const firstRound = computed(() =>
  workspace.value ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long' }).format(new Date(workspace.value.nextRoundAt)) : '',
)
const isAdmin = computed(() => workspace.value && workspace.value.role !== 'member')

onMounted(async () => {
  await store.load().catch(() => undefined)
  if (isAdmin.value) await inv.loadPending().catch(() => undefined)
})

useSeo({ title: 'seo.invite.title', description: 'seo.invite.description', noindex: true })
</script>

<template>
  <div v-if="workspace">
    <StepIndicator
      v-if="route.query.new !== undefined || workspace.memberCount <= 1"
      :steps="[t('workspaceForm.stepDetails'), t('workspaceForm.stepInvite')]"
      :current="1"
    />
    <div class="mx-auto mb-2 w-40">
      <TwoCups />
    </div>
    <PageHeader
      :title="t('invite.title', { name: workspace.name })"
      :subtitle="t('invite.subtitle', { date: firstRound })"
    />
    <div class="grid items-start gap-6 lg:grid-cols-2">
      <BaseCard>
        <CopyField
          :label="t('invite.link')"
          :value="link"
          :copy-label="t('invite.copy')"
          :copied-label="t('invite.copied')"
          :copied="copied"
          @copy="inv.copyLink"
        />
        <div class="mt-4 flex flex-wrap gap-2">
          <BaseButton
            variant="secondary"
            size="sm"
            @click="inv.share(workspace.name, t('invite.shareText', { name: workspace.name }))"
          >
            {{ t('invite.share') }}
          </BaseButton>
          <BaseButton
            v-if="isAdmin"
            variant="ghost"
            size="sm"
            @click="inv.rotate"
          >
            {{ t('invite.rotate') }}
          </BaseButton>
        </div>
        <p
          v-if="workspace.allowedDomains.length"
          class="mt-4 text-sm text-muted"
        >
          {{ t('invite.domainsNote', { domains: workspace.allowedDomains.map((d) => `@${d}`).join(', ') }) }}
        </p>
      </BaseCard>

      <BaseCard v-if="isAdmin">
        <form @submit.prevent="inv.send">
          <TextField
            v-model="emailsText"
            multiline
            :rows="4"
            :label="t('invite.byEmail')"
            :placeholder="t('invite.emailsPlaceholder')"
            :hint="parsed.valid.length ? t('invite.count', { count: parsed.valid.length }, parsed.valid.length) : t('invite.emailsHint')"
            :error="error ? t(error) : parsed.invalid.length ? t('invite.errors.invalid', { list: parsed.invalid.join(', ') }) : undefined"
          />
          <BaseButton
            type="submit"
            class="mt-4"
            :loading="sending"
            :disabled="!parsed.valid.length"
          >
            {{ t('invite.send') }}
          </BaseButton>
          <p
            v-if="sentCount"
            class="mt-3 text-sm text-sage-text"
            role="status"
          >
            {{ t('invite.sent', { count: sentCount }, sentCount) }}
          </p>
        </form>
        <div
          v-if="pending.length"
          class="mt-6 border-t border-line pt-4"
        >
          <p class="text-sm font-semibold text-fg">
            {{ t('invite.pending') }}
          </p>
          <ul class="mt-2 divide-y divide-line">
            <li
              v-for="i in pending"
              :key="i.id"
              class="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span class="truncate text-fg">{{ i.email }}</span>
              <BaseButton
                variant="ghost"
                size="sm"
                @click="inv.revoke(i.id)"
              >
                {{ t('invite.revoke') }}
              </BaseButton>
            </li>
          </ul>
        </div>
      </BaseCard>
    </div>
    <div class="mt-8 flex flex-wrap gap-2">
      <BaseButton
        v-if="isAdmin"
        variant="secondary"
        :to="localePath({ name: 'workspace-admin', params: { slug: workspace.slug } })"
      >
        {{ t('invite.toAdmin') }}
      </BaseButton>
      <BaseButton
        variant="ghost"
        :to="localePath('dashboard')"
      >
        {{ t('invite.toDashboard') }}
      </BaseButton>
    </div>
  </div>
  <EmptyState
    v-else-if="store.loaded"
    :title="t('errors.notFound')"
  >
    <BaseButton :to="localePath('dashboard')">
      {{ t('invite.toDashboard') }}
    </BaseButton>
  </EmptyState>
</template>
