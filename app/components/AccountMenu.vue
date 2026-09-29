<script setup lang="ts">
import { navigateTo, useLocalePath } from '#imports'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import ThemeToggle from '~/components/ThemeToggle.vue'
import AvatarBadge from '~/components/ui/AvatarBadge.vue'
import { useMatchesStore } from '~/stores/matches'
import { useSessionStore } from '~/stores/session'
import { useWorkspacesStore } from '~/stores/workspaces'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuPortal, DropdownMenuRoot, DropdownMenuSeparator, DropdownMenuTrigger } from 'reka-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const localePath = useLocalePath()
const session = useSessionStore()
const workspaces = useWorkspacesStore()
const matches = useMatchesStore()

const name = computed(() => [session.profile?.firstName, session.profile?.lastName].filter(Boolean).join(' ') || session.email)

async function signOut() {
  await session.signOut().catch(() => undefined)
  workspaces.$reset()
  matches.$reset()
  await navigateTo(localePath('home'))
}

const itemClass = 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-fg outline-none data-[highlighted]:bg-surface-2'
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      class="rounded-full transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-accent/20"
      :aria-label="t('app.menu.open')"
    >
      <AvatarBadge
        :name="name"
        :src="session.profile?.avatarUrl"
        size="md"
      />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="8"
        class="z-50 w-72 rounded-2xl border border-line bg-surface p-2 shadow-lift data-[state=open]:animate-pop"
      >
        <div class="px-3 pt-2 pb-3">
          <p class="truncate font-semibold text-fg">
            {{ name }}
          </p>
          <p class="truncate text-sm text-muted">
            {{ session.email }}
          </p>
        </div>
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <DropdownMenuItem
          :class="itemClass"
          @select="navigateTo(localePath('account'))"
        >
          {{ t('app.menu.account') }}
        </DropdownMenuItem>
        <DropdownMenuItem
          :class="itemClass"
          @select="navigateTo(localePath('workspace-new'))"
        >
          {{ t('app.menu.newWorkspace') }}
        </DropdownMenuItem>
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <div class="flex items-center justify-between px-3 py-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator class="my-1 h-px bg-line" />
        <DropdownMenuItem
          :class="itemClass"
          @select="signOut"
        >
          {{ t('app.menu.signOut') }}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
