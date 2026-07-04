import { useEffect } from "react"
import { toast } from "sonner"
import { Toaster } from "@gastroai/desktop"

export function SuccessToast() {
  useEffect(() => {
    toast.success("Orden #1042 cobrada", {
      description: "Se registró el pago de $ 17.800 en la caja.",
      duration: 100000,
    })
  }, [])
  return (
    <div style={{ minHeight: 220, position: "relative" }}>
      <Toaster position="top-center" />
    </div>
  )
}
