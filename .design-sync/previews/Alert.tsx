import { Alert, AlertDescription, AlertTitle } from "@gastroai/desktop"
import { TriangleAlert, Info } from "lucide-react"

export function Informative() {
  return (
    <Alert className="max-w-md">
      <Info />
      <AlertTitle>Cierre de caja pendiente</AlertTitle>
      <AlertDescription>
        El turno mañana no registró arqueo. Completá el cierre antes de abrir la
        próxima caja.
      </AlertDescription>
    </Alert>
  )
}

export function Destructive() {
  return (
    <Alert variant="destructive" className="max-w-md">
      <TriangleAlert />
      <AlertTitle>Stock insuficiente</AlertTitle>
      <AlertDescription>
        Faltan 6 unidades de “Milanesa napolitana” para cubrir las órdenes
        activas.
      </AlertDescription>
    </Alert>
  )
}
