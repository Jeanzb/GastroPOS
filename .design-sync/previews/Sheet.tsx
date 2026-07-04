import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Button,
  Input,
  Label,
} from "@gastroai/desktop"

export function OrderDetail() {
  return (
    <Sheet defaultOpen modal={false}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Detalle de la orden #1042</SheetTitle>
          <SheetDescription>Mesa 7 · abierta hace 32 min</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 px-1">
          <div className="flex justify-between text-sm">
            <span>Milanesa napolitana ×2</span>
            <span className="nums">$ 17.800</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Agua con gas ×3</span>
            <span className="nums">$ 3.600</span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="s-note">Nota interna</Label>
            <Input id="s-note" placeholder="Ej. cliente frecuente" />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline">Imprimir</Button>
          <Button>Cobrar $ 21.400</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
