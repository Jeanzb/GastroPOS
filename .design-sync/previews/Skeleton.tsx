import { Skeleton } from "@gastroai/desktop"

export function Lines() {
  return (
    <div className="flex w-72 flex-col gap-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function CardPlaceholder() {
  return (
    <div className="flex w-72 items-center gap-3 rounded-lg border border-border bg-card p-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
