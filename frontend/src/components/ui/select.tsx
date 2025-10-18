import * as React from "react"

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Select = ({ value, defaultValue, onValueChange, children }: SelectProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const [open, setOpen] = React.useState(false)
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange || setInternalValue

  return (
    <SelectContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, open, setOpen }}>
      {children}
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectTrigger must be used within Select")

  return (
    <button
      ref={ref}
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className || ''}`}
      onClick={() => context.setOpen(!context.open)}
      {...props}
    >
      {children}
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 opacity-50"
      >
        <path
          d="m4.93179 5.43179c0.20081-0.20081 0.52632-0.20081 0.72713 0l2.84208 2.84208 2.8421-2.84208c0.2008-0.20081 0.5263-0.20081 0.7271 0 0.2008 0.20081 0.2008 0.52632 0 0.72713l-3.2056 3.20563c-0.2008 0.2008-0.5263 0.2008-0.7271 0l-3.20563-3.20563c-0.20081-0.20081-0.20081-0.52632 0-0.72713z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </button>
  )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectValue must be used within Select")

  return (
    <span ref={ref} className={className} {...props}>
      {context.value || placeholder}
    </span>
  )
})
SelectValue.displayName = "SelectValue"

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error("SelectContent must be used within Select")

  if (!context.open) return null

  return (
    <div
      ref={ref}
      className={`relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md ${className || ''}`}
      {...props}
    >
      <div className="p-1">
        {children}
      </div>
    </div>
  )
})
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectItem must be used within Select")

    return (
      <div
        ref={ref}
        className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground ${className || ''}`}
        onClick={() => {
          context.onValueChange(value)
          context.setOpen(false)
        }}
        {...props}
      >
        {context.value === value && (
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
            >
              <path
                d="m11.4669 3.72684c0.2634 0.26336 0.2634 0.69061 0 0.95397l-6.44444 6.44444c-0.26336 0.2634-0.69061 0.2634-0.95397 0l-2.77778-2.7778c-0.26336-0.2633-0.26336-0.6906 0-0.9539 0.26336-0.2634 0.69061-0.2634 0.95397 0l2.30079 2.3008 5.96825-5.96826c0.2634-0.26336 0.6906-0.26336 0.954 0z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
        {children}
      </div>
    )
  }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }