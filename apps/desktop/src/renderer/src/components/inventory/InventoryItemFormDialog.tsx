import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { SI_UNITS, getUnit, normalizeUnitCode, type UnitDimension } from '@/lib/units';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  inventoryItemFormSchema,
  type InventoryItemFormInput,
  type InventoryItemFormValues,
} from '@/schemas/inventory';
import type { InventoryCategoryDto } from '@/types/inventory';
import type { ProductDto } from '@/types/catalog';

const NO_PRODUCT_LINK = 'NO_PRODUCT_LINK';

const DIMENSION_LABEL: Record<UnitDimension, string> = {
  MASS: 'peso',
  VOLUME: 'volumen',
  COUNT: 'conteo',
};

interface InventoryItemFormDialogProps {
  branchId: string | null | undefined;
  isSubmitting: boolean;
  open: boolean;
  categories: InventoryCategoryDto[];
  products: ProductDto[];
  categoriesLoading?: boolean;
  productsLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
}

function defaultValues(branchId?: string | null): InventoryItemFormInput {
  return {
    branchId: branchId ?? '',
    categoryId: '',
    name: '',
    baseUnitCode: 'und',
    baseUnitName: 'Unidad',
    productId: null,
    initialStock: 0,
    initialUnitCost: 0,
    minimumStock: 0,
    allowNegativeStock: false,
  };
}

export function InventoryItemFormDialog({
  branchId,
  isSubmitting,
  open,
  categories,
  products,
  categoriesLoading = false,
  productsLoading = false,
  onOpenChange,
  onSubmit,
}: InventoryItemFormDialogProps) {
  const form = useForm<InventoryItemFormInput, unknown, InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: defaultValues(branchId),
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues(branchId));
    }
  }, [branchId, form, open]);

  const onFormSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    form.reset(defaultValues(branchId));
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl" data-cy="inventory-item-dialog">
        <DialogHeader>
          <DialogTitle>Nuevo insumo</DialogTitle>
          <DialogDescription>
            Crea el insumo maestro y su saldo inicial en la sede activa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onFormSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-cy="inventory-item-category">
                          <SelectValue placeholder="Selecciona categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.skuPrefix})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input
                    data-cy="inventory-item-sku-auto"
                    value="Generacion automatica"
                    disabled
                  />
                </FormControl>
                <FormDescription>Se asigna al guardar, por ejemplo CAR-0001.</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
                        data-cy="inventory-item-name"
                        placeholder="Carne molida"
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto enlazado</FormLabel>
                    <Select
                      value={field.value ?? NO_PRODUCT_LINK}
                      onValueChange={(value) =>
                        field.onChange(value === NO_PRODUCT_LINK ? null : value)
                      }
                      disabled={productsLoading}
                    >
                      <FormControl>
                        <SelectTrigger data-cy="inventory-item-product-link">
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_PRODUCT_LINK}>Sin producto enlazado</SelectItem>
                        {products.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                            disabled={Boolean(product.inventoryLink)}
                          >
                            {product.name}
                            {product.sku ? ` (${product.sku})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Se usa como consumo 1:1 si el producto no tiene receta.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseUnitCode"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Unidad base</FormLabel>
                    <Select
                      value={normalizeUnitCode(field.value)}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('baseUnitName', getUnit(value)?.name ?? value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-cy="inventory-item-unit-code">
                          <SelectValue placeholder="Selecciona unidad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SI_UNITS.map((unit) => (
                          <SelectItem key={unit.code} value={unit.code}>
                            {unit.name} ({unit.code}) · {DIMENSION_LABEL[unit.dimension]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Todo el stock se mueve en esta unidad: peso (g, kg, lb), volumen (ml, L) o
                      conteo (und).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock inicial</FormLabel>
                    <FormControl>
                      <Input
                        data-cy="inventory-item-initial-stock"
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="initialUnitCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo inicial</FormLabel>
                    <FormControl>
                      <MoneyInput
                        data-cy="inventory-item-initial-cost"
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minimumStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock minimo</FormLabel>
                    <FormControl>
                      <Input
                        data-cy="inventory-item-minimum-stock"
                        type="number"
                        min={0}
                        step={1}
                        value={field.value}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allowNegativeStock"
                render={({ field }) => (
                  <FormItem className="flex min-h-[74px] items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <FormLabel>Permitir negativo</FormLabel>
                      <FormDescription>Excepcion puntual para este insumo.</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !branchId || categoriesLoading || categories.length === 0}
                data-cy="inventory-item-submit"
              >
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Crear insumo
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
