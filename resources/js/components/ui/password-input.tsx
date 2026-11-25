import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, "type">

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false)
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña"

  return (
    <div className={cn("relative", className)}>
      <Input
        type={visible ? "text" : "password"}
        className="pr-9"
        {...props}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Alcanzable con Tab: mostrar la contrasena es una funcion mas del
              formulario y debe poder activarse sin mouse (WCAG 2.1.1). Se deja
              el contorno de foco nativo en lugar de suprimirlo (WCAG 2.4.7). */}
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={label}
            aria-pressed={visible}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-gray-600 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export { PasswordInput }
