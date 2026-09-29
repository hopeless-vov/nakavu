<script setup lang="ts">
import type { MemberRole } from '~/types/domain'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuTrigger } from 'reka-ui'
import { useI18n } from 'vue-i18n'

defineProps<{ name: string; role: MemberRole }>()
const emit = defineEmits<{ role: [role: MemberRole]; remove: [] }>()
const { t } = useI18n()

const itemClass = 'flex cursor-pointer rounded-lg px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-surface-2'
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      class="grid size-8 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
      :aria-label="t('admin.members.actions', { name })"
    >
      <span aria-hidden="true">⋯</span>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="4"
        class="z-50 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-lift"
      >
        <DropdownMenuItem
          v-if="role === 'member'"
          :class="[itemClass, 'text-fg']"
          @select="emit('role', 'admin')"
        >
          {{ t('admin.members.makeAdmin') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          v-else
          :class="[itemClass, 'text-fg']"
          @select="emit('role', 'member')"
        >
          {{ t('admin.members.makeMember') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="[itemClass, 'text-danger']"
          @select="emit('remove')"
        >
          {{ t('admin.members.remove') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
