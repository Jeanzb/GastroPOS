import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from "@gastroai/desktop"

export function EditProduct() {
  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Actualizá el precio y la disponibilidad en la carta.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-name">Nombre</Label>
            <Input id="d-name" defaultValue="Milanesa napolitana" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="d-price">Precio</Label>
            <Input id="d-price" defaultValue="$ 8.900" className="nums" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost">Cancelar</Button>
          <Button>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
