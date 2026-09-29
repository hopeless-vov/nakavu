<script setup lang="ts">
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import ProfileFields from '~/components/ProfileFields.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import BaseModal from '~/components/ui/BaseModal.vue'
import LogoPicker from '~/components/ui/LogoPicker.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SelectField from '~/components/ui/SelectField.vue'
import SettingRow from '~/components/ui/SettingRow.vue'
import TextField from '~/components/ui/TextField.vue'
import ToggleSwitch from '~/components/ui/ToggleSwitch.vue'
import { NOTIFICATIONS, useAccount } from '~/composables/use-account'
import { provideProfileForm, useProfileForm } from '~/composables/use-profile-form'
import { useSeo } from '~/composables/use-seo'
import { useToastStore } from '~/stores/toast'
import { timeZones } from '~/utils/invites'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToastStore()
const form = provideProfileForm(useProfileForm())
const account = useAccount()
const { session, newEmail, emailError, emailSent, deleteOpen, deleteText, deleting, canDelete } = account

const photo = ref<File | null>(null)
async function onPhoto(file: File | null) {
  photo.value = file
  await account.uploadAvatar(file)
}

async function saveProfile() {
  if (await form.save()) toast.show(t('account.toast.saved'), 'success')
}

const name = computed(() => [session.profile?.firstName, session.profile?.lastName].filter(Boolean).join(' ') || session.email)
const zones = computed(() => timeZones(session.profile?.timezone ?? 'Europe/Amsterdam').map((z) => ({ value: z, label: z.replace(/_/g, ' ') })))
const timezone = computed({
  get: () => session.profile?.timezone ?? 'Europe/Amsterdam',
  set: (v: string) => void account.setPreference('timezone', v),
})
const notifications = computed(() =>
  NOTIFICATIONS.map((key) => ({
    key,
    title: t(`account.notifications.${key}.title`),
    body: t(`account.notifications.${key}.body`),
    value: session.profile?.[key] ?? false,
  })),
)

useSeo({ title: 'seo.account.title', description: 'seo.account.description', noindex: true })
</script>

<template>
  <div class="max-w-3xl">
    <PageHeader :title="t('account.title')" />

    <BaseCard class="mb-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <LogoPicker
          :model-value="photo"
          :name="name"
          :current="session.profile?.avatarUrl"
          :label="t('account.photo')"
          :hint="session.email"
          :max-bytes="1048576"
          :too-big-label="t('workspaceForm.errors.logo')"
          @update:model-value="onPhoto"
        />
      </div>
    </BaseCard>

    <form
      novalidate
      @submit.prevent="saveProfile"
    >
      <ProfileFields />
      <div class="mt-5 flex flex-wrap items-center gap-3">
        <BaseButton
          type="submit"
          :loading="form.saving.value"
          :disabled="!form.dirty.value"
        >
          {{ t('account.saveProfile') }}
        </BaseButton>
        <BaseButton
          v-if="form.dirty.value"
          variant="ghost"
          @click="form.reset"
        >
          {{ t('account.discard') }}
        </BaseButton>
        <p
          v-if="form.errors.value.form"
          class="text-sm text-danger"
          role="alert"
        >
          {{ t(form.errors.value.form) }}
        </p>
      </div>
    </form>

    <BaseCard class="mt-8">
      <h2 class="font-display text-2xl">
        {{ t('account.preferences') }}
      </h2>
      <div class="divide-y divide-line">
        <SettingRow :title="t('language.label')">
          <LanguageSwitcher />
        </SettingRow>
        <SettingRow :title="t('theme.toggle')">
          <ThemeToggle />
        </SettingRow>
        <div class="py-4">
          <SelectField
            v-model="timezone"
            :label="t('account.timezone')"
            :options="zones"
          />
        </div>
      </div>
    </BaseCard>

    <BaseCard class="mt-5">
      <h2 class="font-display text-2xl">
        {{ t('account.email.title') }}
      </h2>
      <p class="mt-1 text-muted">
        {{ t('account.email.current', { email: session.email }) }}
      </p>
      <form
        class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start"
        novalidate
        @submit.prevent="account.changeEmail"
      >
        <TextField
          v-model="newEmail"
          class="flex-1"
          type="email"
          :placeholder="t('account.email.placeholder')"
          :error="emailError ? t(emailError) : undefined"
          :hint="emailSent ? t('account.email.sent') : undefined"
        />
        <BaseButton
          type="submit"
          variant="secondary"
        >
          {{ t('account.email.change') }}
        </BaseButton>
      </form>
    </BaseCard>

    <BaseCard class="mt-5">
      <h2 class="font-display text-2xl">
        {{ t('account.notifications.title') }}
      </h2>
      <div class="divide-y divide-line">
        <SettingRow
          v-for="n in notifications"
          :key="n.key"
          :title="n.title"
          :description="n.body"
        >
          <ToggleSwitch
            :model-value="n.value"
            :label="n.title"
            @update:model-value="account.setPreference(n.key, $event)"
          />
        </SettingRow>
      </div>
    </BaseCard>

    <BaseCard
      tone="muted"
      class="mt-8"
    >
      <SettingRow
        :title="t('account.delete.title')"
        :description="t('account.delete.body')"
      >
        <BaseButton
          variant="danger"
          size="sm"
          @click="deleteOpen = true"
        >
          {{ t('account.delete.button') }}
        </BaseButton>
      </SettingRow>
    </BaseCard>

    <BaseModal
      v-model:open="deleteOpen"
      :title="t('account.delete.confirmTitle')"
      :description="t('account.delete.confirmBody', { word: t('account.delete.word') })"
    >
      <TextField
        v-model="deleteText"
        :label="t('account.delete.typeLabel')"
        :placeholder="t('account.delete.word')"
      />
      <template #actions>
        <BaseButton
          variant="secondary"
          @click="deleteOpen = false"
        >
          {{ t('account.delete.keep') }}
        </BaseButton>
        <BaseButton
          variant="danger"
          :disabled="!canDelete"
          :loading="deleting"
          @click="account.deleteAccount"
        >
          {{ t('account.delete.confirm') }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
