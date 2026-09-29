<script setup lang="ts">
import { MAX_ASK_ME_ABOUT } from '#shared/catalog'
import BaseButton from '~/components/ui/BaseButton.vue'
import BaseCard from '~/components/ui/BaseCard.vue'
import ChipToggle from '~/components/ui/ChipToggle.vue'
import OptionGroup from '~/components/ui/OptionGroup.vue'
import TextField from '~/components/ui/TextField.vue'
import { useCatalog } from '~/composables/use-catalog'
import { injectProfileForm } from '~/composables/use-profile-form'
import type { MeetingFormat } from '~/types/domain'
import { useI18n } from 'vue-i18n'

/** The profile editor used by onboarding and account settings. */
const props = defineProps<{ sections?: ('about' | 'meeting' | 'interests')[] }>()
const form = injectProfileForm()

const { t } = useI18n()
const { languageOptions, interestOptions, departmentOptions, interestLabel } = useCatalog()
const show = (s: 'about' | 'meeting' | 'interests') => !props.sections || props.sections.includes(s)

const formats: { value: MeetingFormat; label: string; description: string }[] = [
  { value: 'in_person', label: t('catalog.formats.in_person'), description: t('profile.formatHint.in_person') },
  { value: 'online', label: t('catalog.formats.online'), description: t('profile.formatHint.online') },
  { value: 'both', label: t('catalog.formats.both'), description: t('profile.formatHint.both') },
]
</script>

<template>
  <div class="flex flex-col gap-5">
    <BaseCard v-if="show('about')">
      <h2 class="font-display text-2xl">
        {{ t('profile.about') }}
      </h2>
      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <TextField
          v-model="form.draft.firstName"
          :label="t('profile.firstName')"
          :placeholder="t('profile.firstNamePlaceholder')"
          :error="form.errors.value.firstName ? t(form.errors.value.firstName) : undefined"
          autocomplete="given-name"
          required
        />
        <TextField
          v-model="form.draft.lastName"
          :label="t('profile.lastName')"
          :placeholder="t('profile.lastNamePlaceholder')"
          autocomplete="family-name"
        />
        <TextField
          v-model="form.draft.jobTitle"
          :label="t('profile.jobTitle')"
          :placeholder="t('profile.jobTitlePlaceholder')"
          :hint="t('profile.optionalForFriends')"
          autocomplete="organization-title"
        />
        <div class="flex flex-col gap-1.5">
          <TextField
            v-model="form.draft.department"
            :label="t('profile.department')"
            :placeholder="t('profile.departmentPlaceholder')"
            list="nakavu-departments"
          />
          <datalist id="nakavu-departments">
            <option
              v-for="d in departmentOptions"
              :key="d.value"
              :value="d.label"
            />
          </datalist>
        </div>
        <TextField
          v-model="form.draft.city"
          class="sm:col-span-2"
          :label="t('profile.city')"
          :placeholder="t('profile.cityPlaceholder')"
          autocomplete="address-level2"
        />
      </div>
    </BaseCard>

    <BaseCard v-if="show('meeting')">
      <h2 class="font-display text-2xl">
        {{ t('profile.meeting') }}
      </h2>
      <p class="mt-1 text-muted">
        {{ t('profile.meetingHint') }}
      </p>
      <div class="mt-5">
        <OptionGroup
          v-model="form.draft.meetingFormat"
          :label="t('profile.meeting')"
          :options="formats"
        />
      </div>
      <h3 class="mt-7 font-sans text-base font-semibold text-fg">
        {{ t('profile.languages') }}
      </h3>
      <p
        class="mt-1 text-sm"
        :class="form.errors.value.languages ? 'text-danger' : 'text-muted'"
        :role="form.errors.value.languages ? 'alert' : undefined"
      >
        {{ form.errors.value.languages ? t(form.errors.value.languages) : t('profile.languagesHint') }}
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <ChipToggle
          v-for="l in languageOptions"
          :key="l.value"
          :label="l.label"
          :selected="form.draft.languages.includes(l.value)"
          @toggle="form.toggle('languages', l.value)"
        />
      </div>
    </BaseCard>

    <BaseCard v-if="show('interests')">
      <h2 class="font-display text-2xl">
        {{ t('profile.interests') }}
      </h2>
      <p class="mt-1 text-muted">
        {{ t('profile.interestsHint') }}
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <ChipToggle
          v-for="i in interestOptions"
          :key="i.value"
          :label="i.label"
          :selected="form.draft.interests.includes(i.value)"
          @toggle="form.toggle('interests', i.value)"
        />
        <ChipToggle
          v-for="custom in form.draft.interests.filter((x) => !interestOptions.some((o) => o.value === x))"
          :key="custom"
          :label="interestLabel(custom)"
          selected
          removable
          :remove-label="t('common.remove')"
          @toggle="form.toggle('interests', custom)"
          @remove="form.toggle('interests', custom)"
        />
      </div>
      <form
        class="mt-4 flex gap-2"
        @submit.prevent="form.addCustomInterest"
      >
        <TextField
          v-model="form.customInterest.value"
          class="flex-1"
          :placeholder="t('profile.customInterest')"
          :maxlength="40"
        />
        <BaseButton
          type="submit"
          variant="secondary"
          :disabled="!form.customInterest.value.trim()"
        >
          {{ t('profile.add') }}
        </BaseButton>
      </form>
      <div class="mt-7">
        <TextField
          v-model="form.draft.askMeAbout"
          :label="t('profile.askMeAbout')"
          :placeholder="t('profile.askPlaceholder')"
          :maxlength="MAX_ASK_ME_ABOUT"
        />
      </div>
    </BaseCard>
  </div>
</template>
