import { ukrainianPlural } from '../app/utils/plural'

export default () => ({
  legacy: false,
  fallbackLocale: 'en',
  pluralRules: { uk: ukrainianPlural },
})
