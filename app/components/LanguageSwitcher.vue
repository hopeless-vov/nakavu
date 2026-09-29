<script setup lang="ts">
import { navigateTo, useSwitchLocalePath } from '#imports'
import SegmentedControl from '~/components/ui/SegmentedControl.vue'
import { useSessionStore } from '~/stores/session'
import type { Locale } from '~/types/domain'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t, locale, locales } = useI18n()
const switchLocalePath = useSwitchLocalePath()
const session = useSessionStore()

const options = computed(() =>
  (locales.value as { code: Locale; name: string }[]).map((l) => ({ value: l.code, label: l.code.toUpperCase(), title: l.name })),
)

const current = computed({
  get: () => locale.value as Locale,
  set: async (code: Locale) => {
    await navigateTo(switchLocalePath(code))
    // Remember it for emails too.
    if (session.isSignedIn && session.profile?.locale !== code) void session.updateProfile({ locale: code }).catch(() => undefined)
  },
})
</script>

<template>
  <SegmentedControl
    v-model="current"
    :label="t('language.label')"
    :options="options"
    size="sm"
  />
</template>
