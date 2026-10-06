import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}) {
  return (
    (<div
      className={cn("animate-pulse rounded-md bg-foreground/[0.06]", className)}
      {...props} />)
  );
}

export { Skeleton }
