import { ComponentProps } from "react"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

// react-resizable-panels v4 renamed PanelGroup→Group, PanelResizeHandle→Separator,
// and replaced the `direction` prop with `orientation`. We preserve the shadcn
// external API (callers still pass `direction="horizontal"|"vertical"`) and
// translate to v4 internally. We also keep emitting `data-panel-group-direction`
// on the group so existing CSS selectors continue to work.
//
// On the handle, v4's Separator emits `aria-orientation` describing the
// separator's *own* orientation, which is perpendicular to the group it sits
// in: a vertically-stacked group has horizontal separators, and a horizontal
// group has vertical separators. The shadcn handle's stacked-layout styling
// (h-px / w-full bar) therefore applies when `aria-orientation=horizontal`
// (i.e. when the parent group is vertical), which mirrors the v3 selector
// `data-[panel-group-direction=vertical]` exactly.

type PanelGroupDirection = "horizontal" | "vertical"

function ResizablePanelGroup({
  className,
  direction,
  ...props
}: Omit<ComponentProps<typeof ResizablePrimitive.Group>, "orientation"> & {
  direction: PanelGroupDirection
}) {
  return (
    <ResizablePrimitive.Group
      data-slot="resizable-panel-group"
      data-panel-group-direction={direction}
      orientation={direction}
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel({
  ...props
}: ComponentProps<typeof ResizablePrimitive.Panel>) {
  return <ResizablePrimitive.Panel data-slot="resizable-panel" {...props} />
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) {
  return (
    <ResizablePrimitive.Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
