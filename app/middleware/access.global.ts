import { defineNuxtRouteMiddleware, navigateTo, useNuxtApp } from '#imports'
import type { RouteAccess } from '~/router/routes'
import { useSessionStore } from '~/stores/session'
import { decideAccess } from '~/utils/access'

export default defineNuxtRouteMiddleware(async (to) => {
  const access = to.meta.access as RouteAccess | undefined
  // Sessions live in the browser; the server only renders public pages.
  if (import.meta.server || !access || access === 'public') return

  const session = useSessionStore()
  await session.init()

  const decision = decideAccess(access, session, to.fullPath)
  if (decision.allow) return

  const localePath = useNuxtApp().$localePath as (route: object | string) => string
  return navigateTo(localePath({ name: decision.to, query: decision.next ? { next: decision.next } : undefined }))
})
