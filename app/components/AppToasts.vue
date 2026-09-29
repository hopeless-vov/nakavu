<script setup lang="ts">
import ToastStack from '~/components/ui/ToastStack.vue'
import { useToastStore } from '~/stores/toast'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toasts = useToastStore()
</script>

<template>
  <ToastStack
    :toasts="toasts.toasts"
    :dismiss-label="t('common.close')"
    @dismiss="toasts.dismiss"
  />
</template>
