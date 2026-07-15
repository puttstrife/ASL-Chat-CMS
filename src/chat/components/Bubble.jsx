import { cva } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../shared/lib/utils.js';

// Official shadcn "Bubble" component (registry: new-york-v4/ui/bubble),
// ported to JSX. `radix-ui` Slot.Root → @radix-ui/react-slot Slot.
export function BubbleGroup({ className, ...props }) {
  return <div data-slot="bubble-group" className={cn('flex min-w-0 flex-col gap-2', className)} {...props} />;
}

const bubbleVariants = cva(
  'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full',
  {
    variants: {
      variant: {
        default:
          '*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary/80',
        secondary:
          '*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground',
        muted:
          '*:data-[slot=bubble-content]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:bg-white/12',
        tinted:
          '*:data-[slot=bubble-content]:bg-[color-mix(in_oklch,var(--primary),#080910_72%)] *:data-[slot=bubble-content]:text-foreground',
        outline:
          '*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background',
        ghost:
          'border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0',
        destructive:
          '*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export function Bubble({ variant = 'default', align = 'start', className, ...props }) {
  return (
    <div
      data-slot="bubble"
      data-variant={variant}
      data-align={align}
      className={cn(bubbleVariants({ variant }), 'bubble-in', className)}
      {...props}
    />
  );
}

export function BubbleContent({ asChild = false, className, ...props }) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      data-slot="bubble-content"
      className={cn(
        'font-sans w-fit max-w-full min-w-0 overflow-hidden rounded-2xl border border-transparent px-4 py-2.5 text-[20px] leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end',
        className
      )}
      {...props}
    />
  );
}

const bubbleReactionsVariants = cva(
  'absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-sm ring-3 ring-card has-[button]:p-0',
  {
    variants: {
      side: { top: 'top-0 -translate-y-3/4', bottom: 'bottom-0 translate-y-3/4' },
      align: { start: 'left-3', end: 'right-3' },
    },
    defaultVariants: { side: 'bottom', align: 'end' },
  }
);

export function BubbleReactions({ side = 'bottom', align = 'end', className, ...props }) {
  return <div data-slot="bubble-reactions" data-align={align} data-side={side} className={cn(bubbleReactionsVariants({ side, align }), className)} {...props} />;
}
