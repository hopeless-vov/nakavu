<script setup lang="ts">
import PersonCard from '~/components/ui/PersonCard.vue'
import { useCatalog } from '~/composables/use-catalog'
import type { ProfileDraft } from '~/composables/use-profile-form'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/** "What your match sees" — a live PersonCard from the profile draft. */
const props = defineProps<{ draft: ProfileDraft; avatarUrl?: string | null }>()

const { t } = useI18n()
const { interestLabel, roleLine, facts } = useCatalog()

const name = computed(() => `${props.draft.firstName} ${props.draft.lastName}`.trim() || t('profile.preview.name'))
const role = computed(() => roleLine(props.draft) || t('profile.preview.role'))
const chips = computed(() =>
  props.draft.interests.length ? props.draft.interests.map((i) => ({ label: interestLabel(i) })) : [{ label: t('profile.preview.interests') }],
)
</script>

<template>
  <div>
    <p class="mb-3 flex items-center gap-2 text-xs font-semibold tracking-[.14em] text-muted uppercase">
      <span class="size-1.5 animate-pulse rounded-full bg-sage" />
      {{ t('profile.preview.label') }}
    </p>
    <PersonCard
      :name="name"
      :role="role"
      :avatar-url="avatarUrl"
      :facts="facts(draft)"
      :chips="chips"
      :ask-label="t('person.askMeAbout')"
      :ask="draft.askMeAbout || t('profile.preview.ask')"
    />
  </div>
</template>
