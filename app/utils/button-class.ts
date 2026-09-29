import { tv, type VariantProps } from 'tailwind-variants'

export const buttonClass = tv({
  base: [
    'inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-[transform,background-color,box-shadow,border-color,color] duration-200 ease-out-soft',
    'hover:-translate-y-px active:translate-y-0 active:scale-[.98]',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  ],
  variants: {
    variant: {
      primary: 'bg-accent text-on-accent shadow-soft hover:bg-accent-strong hover:shadow-lift',
      secondary: 'border border-line bg-surface text-fg hover:bg-surface-2',
      ghost: 'text-muted hover:bg-surface-2 hover:text-fg',
      soft: 'bg-accent-soft text-accent-text hover:brightness-95',
      danger: 'border border-danger text-danger hover:bg-danger-soft',
      ink: 'bg-ink text-on-ink hover:opacity-90',
    },
    size: {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-5 text-[15px]',
      lg: 'h-13 px-7 text-base',
    },
    block: { true: 'w-full' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
})

type ButtonVariants = VariantProps<typeof buttonClass>
export type ButtonVariant = NonNullable<ButtonVariants['variant']>
export type ButtonSize = NonNullable<ButtonVariants['size']>
