<script setup lang="ts">
import { isWeekly } from '#shared/schedule'
import BaseCard from '~/components/ui/BaseCard.vue'
import ChipToggle from '~/components/ui/ChipToggle.vue'
import LogoPicker from '~/components/ui/LogoPicker.vue'
import OptionGroup from '~/components/ui/OptionGroup.vue'
import SelectField from '~/components/ui/SelectField.vue'
import TextField from '~/components/ui/TextField.vue'
import { injectWorkspaceForm } from '~/composables/use-workspace-form'
import type { Cadence } from '~/types/domain'
import { timeZones } from '~/utils/invites'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

/** Name, kind, logo, domains, group size and schedule — used by create and admin settings. */
defineProps<{ logoUrl?: string | null }>()
const form = injectWorkspaceForm()
const { t, locale } = useI18n()
const draft = form.draft

const kinds = computed(() => (['work', 'friends'] as const).map((value) => ({ value, label: t(`workspaceForm.kind.${value}`), description: t(`workspaceForm.kind.${value}Hint`) })))
const sizes = computed(() => ([2, 3] as const).map((value) => ({ value, label: t(`workspaceForm.size.${value}`), description: t(`workspaceForm.size.${value}Hint`) })))
const cadences = computed(() =>
  (['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly'] as Cadence[]).map((value) => ({ value, label: t(`cadence.${value}`), description: t(`cadence.${value}Hint`) })),
)
const dayOptions = computed(() => {
  if (isWeekly(draft.cadence)) {
    const fmt = new Intl.DateTimeFormat(locale.value, { weekday: 'long' })
    // 5 Jan 2026 is a Monday → ISO weekday 1.
    return Array.from({ length: 7 }, (_, i) => ({ value: String(i + 1), label: fmt.format(new Date(2026, 0, 5 + i)) }))
  }
  return Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: t('workspaceForm.dayOfMonth', { day: i + 1 }) }))
})
const hourOptions = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))
const zones = computed(() => timeZones(draft.timezone).map((z) => ({ value: z, label: z.replace(/_/g, ' ') })))

const anchorDay = computed({ get: () => String(draft.anchorDay), set: (v: string) => (draft.anchorDay = Number(v)) })
const roundHour = computed({ get: () => String(draft.roundHour), set: (v: string) => (draft.roundHour = Number(v)) })
</script>

<template>
  <div class="flex flex-col gap-5">
    <BaseCard>
      <h2 class="font-display text-2xl">
        {{ t('workspaceForm.details') }}
      </h2>
      <div class="mt-5 flex flex-col gap-5">
        <TextField
          v-model="draft.name"
          :label="t('workspaceForm.name')"
          :placeholder="t('workspaceForm.namePlaceholder')"
          :error="form.errors.value.name ? t(form.errors.value.name) : undefined"
          :maxlength="80"
          required
        />
        <OptionGroup
          v-model="draft.kind"
          :label="t('workspaceForm.kind.label')"
          :options="kinds"
          :columns="2"
        />
        <LogoPicker
          v-model="form.logo.value"
          :name="draft.name || t('workspaceForm.namePlaceholder')"
          :current="logoUrl"
          :label="t('workspaceForm.logo')"
          :hint="t('workspaceForm.logoHint')"
          :max-bytes="1048576"
          :too-big-label="t('workspaceForm.errors.logo')"
        />
        <div v-if="draft.kind === 'work'">
          <p class="text-sm font-semibold text-fg">
            {{ t('workspaceForm.domains') }}
          </p>
          <p class="mt-0.5 text-sm text-muted">
            {{ t('workspaceForm.domainsHint') }}
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <ChipToggle
              v-for="d in draft.allowedDomains"
              :key="d"
              :label="`@${d}`"
              selected
              removable
              :remove-label="t('common.remove')"
              @remove="form.removeDomain(d)"
              @toggle="form.removeDomain(d)"
            />
          </div>
          <TextField
            v-model="form.domainInput.value"
            class="mt-3"
            :placeholder="t('workspaceForm.domainPlaceholder')"
            :error="form.errors.value.domain ? t(form.errors.value.domain) : undefined"
            @enter.prevent="form.addDomain"
          />
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <h2 class="font-display text-2xl">
        {{ t('workspaceForm.matching') }}
      </h2>
      <p class="mt-4 mb-2 text-sm font-semibold text-fg">
        {{ t('workspaceForm.size.label') }}
      </p>
      <OptionGroup
        v-model="draft.groupSize"
        :label="t('workspaceForm.size.label')"
        :options="sizes"
        :columns="2"
      />
      <p class="mt-6 mb-2 text-sm font-semibold text-fg">
        {{ t('workspaceForm.cadence') }}
      </p>
      <OptionGroup
        v-model="draft.cadence"
        :label="t('workspaceForm.cadence')"
        :options="cadences"
      />
      <div class="mt-5 grid gap-4 sm:grid-cols-3">
        <SelectField
          v-model="anchorDay"
          :label="t(isWeekly(draft.cadence) ? 'workspaceForm.weekday' : 'workspaceForm.day')"
          :options="dayOptions"
        />
        <SelectField
          v-model="roundHour"
          :label="t('workspaceForm.hour')"
          :options="hourOptions"
        />
        <SelectField
          v-model="draft.timezone"
          :label="t('workspaceForm.timezone')"
          :options="zones"
        />
      </div>
    </BaseCard>
  </div>
</template>
