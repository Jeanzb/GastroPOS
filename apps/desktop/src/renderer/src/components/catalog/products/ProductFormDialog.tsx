import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { productFormSchema, type ProductFormValues } from '@/schemas/catalog';
import type { ProductCategoryDto, ProductDto } from '@/types/catalog';

interface ProductFormDialogProps {
  open: boolean;
  product?: ProductDto;
  products: ProductDto[];
  categories: ProductCategoryDto[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}

const NO_CATEGORY_VALUE = '__none__';
const EMPTY_INGREDIENT: ProductFormValues['recipe']['ingredients'][number] = {
  name: '',
  quantity: 1,
  unit: 'und',
};

function getDefaultValues(product?: ProductDto): ProductFormValues {
  return {
    identity: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      categoryId: product?.categoryId ?? undefined,
    },
    pricing: {
      amount: product?.priceAmount ?? 0,
      currency: product?.currency ?? 'COP',
    },
    details: {
      description: product?.description ?? '',
    },
    availability: {
      isActive: product?.isActive ?? true,
      isSellable: product?.isSellable ?? true,
      isInventoried: product?.isInventoried ?? false,
    },
    recipe: {
      ingredients: product?.isInventoried ? [{ ...EMPTY_INGREDIENT }] : [],
    },
  };
}

function renderCategoryOption(category: ProductCategoryDto) {
  return (
    <SelectItem key={category.id} value={category.id}>
      {category.name}
    </SelectItem>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currency || 'COP',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function getFieldError(errors: unknown[]): string | undefined {
  const firstError = errors[0];

  if (!firstError) {
    return undefined;
  }

  if (typeof firstError === 'string') {
    return firstError;
  }

  if (typeof firstError === 'object' && 'message' in firstError) {
    return String(firstError.message);
  }

  return 'Revisa este campo.';
}

function skuAlreadyExists(value: string, product: ProductDto | undefined, products: ProductDto[]) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return products.some(
    (item) => item.id !== product?.id && item.sku?.trim().toLowerCase() === normalized,
  );
}

function nameAlreadyExists(value: string, product: ProductDto | undefined, products: ProductDto[]) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return false;
  }

  return products.some(
    (item) => item.id !== product?.id && item.name.trim().toLowerCase() === normalized,
  );
}

export function ProductFormDialog({
  open,
  product,
  products,
  categories,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: ProductFormDialogProps) {
  const mode = product ? 'edit' : 'create';
  const form = useForm({
    defaultValues: getDefaultValues(product),
    validators: {
      onSubmit: productFormSchema,
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value);
      form.reset(getDefaultValues());
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(getDefaultValues(product));
    }
  }, [form, open, product]);

  const submitLabel = mode === 'create' ? 'Crear producto' : 'Guardar cambios';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo producto' : 'Editar producto'}</DialogTitle>
          <DialogDescription>
            Configura identidad, precio, disponibilidad y receta operativa del producto.
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1 lg:grid-cols-[minmax(0,1fr)_260px]"
        >
          <div className="space-y-5">
            <section className="rounded-lg border border-border/80 bg-background p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Identidad del producto</h3>
                <p className="text-xs text-muted-foreground">
                  Datos visibles para POS, cocina y reportes operativos.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <form.Field
                  name="identity.name"
                  validators={{
                    onChange: ({ value }) =>
                      value.trim().length < 2
                        ? 'El nombre debe tener al menos 2 caracteres'
                        : undefined,
                    onChangeAsyncDebounceMs: 350,
                    onChangeAsync: async ({ value }) =>
                      nameAlreadyExists(value, product, products)
                        ? 'Ya existe un producto con ese nombre en la lista cargada.'
                        : undefined,
                  }}
                >
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-name';

                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          Nombre
                        </label>
                        <Input
                          id={inputId}
                          placeholder="Bandeja paisa"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${inputId}-error` : undefined}
                        />
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="identity.sku"
                  validators={{
                    onChange: ({ value }) =>
                      (value ?? '').trim().length > 64 ? 'El SKU es demasiado largo' : undefined,
                    onChangeAsyncDebounceMs: 350,
                    onChangeAsync: async ({ value }) =>
                      skuAlreadyExists(value ?? '', product, products)
                        ? 'Ese SKU ya esta asignado a otro producto cargado.'
                        : undefined,
                  }}
                >
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-sku';

                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          SKU
                        </label>
                        <Input
                          id={inputId}
                          placeholder="MENU-001"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${inputId}-error` : undefined}
                        />
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Validacion local con debounce para evitar duplicados visibles.
                          </p>
                        )}
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field name="identity.categoryId">
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-category';

                    return (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          Categoria
                        </label>
                        <Select
                          value={field.state.value ?? NO_CATEGORY_VALUE}
                          onValueChange={(value) =>
                            field.handleChange(value === NO_CATEGORY_VALUE ? undefined : value)
                          }
                        >
                          <SelectTrigger
                            id={inputId}
                            className="w-full"
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? `${inputId}-error` : undefined}
                          >
                            <SelectValue placeholder="Sin categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_CATEGORY_VALUE}>Sin categoria</SelectItem>
                            {categories.map(renderCategoryOption)}
                          </SelectContent>
                        </Select>
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field name="details.description">
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-description';

                    return (
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          Descripcion
                        </label>
                        <Textarea
                          id={inputId}
                          placeholder="Notas internas del producto"
                          className="min-h-24"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${inputId}-error` : undefined}
                        />
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>
              </div>
            </section>

            <section className="rounded-lg border border-border/80 bg-background p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Precio operativo</h3>
                <p className="text-xs text-muted-foreground">
                  El backend conserva el total como fuente de verdad al vender.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_120px]">
                <form.Field name="pricing.amount">
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-price';

                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          Precio
                        </label>
                        <MoneyInput
                          id={inputId}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(amount) => field.handleChange(amount)}
                          placeholder="0"
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${inputId}-error` : `${inputId}-help`}
                        />
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : (
                          <p id={`${inputId}-help`} className="text-xs text-muted-foreground">
                            Para COP se guarda en pesos enteros.
                          </p>
                        )}
                      </div>
                    );
                  }}
                </form.Field>

                <form.Field name="pricing.currency">
                  {(field) => {
                    const error = getFieldError(field.state.meta.errors);
                    const inputId = 'product-currency';

                    return (
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor={inputId}>
                          Moneda
                        </label>
                        <Input
                          id={inputId}
                          maxLength={3}
                          placeholder="COP"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) => field.handleChange(event.target.value.toUpperCase())}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? `${inputId}-error` : undefined}
                        />
                        {error ? (
                          <p id={`${inputId}-error`} className="text-xs text-destructive">
                            {error}
                          </p>
                        ) : null}
                      </div>
                    );
                  }}
                </form.Field>
              </div>
            </section>

            <section className="rounded-lg border border-border/80 bg-background p-4">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">Disponibilidad</h3>
                <p className="text-xs text-muted-foreground">
                  Controla si el producto opera en POS, inventario o ambos.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  {
                    name: 'availability.isActive' as const,
                    label: 'Activo',
                    description: 'Visible para operar.',
                  },
                  {
                    name: 'availability.isSellable' as const,
                    label: 'Vendible',
                    description: 'Aparece en POS.',
                  },
                  {
                    name: 'availability.isInventoried' as const,
                    label: 'Inventariable',
                    description: 'Consume stock.',
                  },
                ].map((toggle) => (
                  <form.Field key={toggle.name} name={toggle.name}>
                    {(field) => {
                      const inputId = `product-${toggle.name.replaceAll('.', '-')}`;

                      return (
                        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-3">
                          <div>
                            <label className="text-sm font-medium" htmlFor={inputId}>
                              {toggle.label}
                            </label>
                            <p className="text-xs text-muted-foreground">{toggle.description}</p>
                          </div>
                          <Switch
                            id={inputId}
                            checked={field.state.value}
                            onCheckedChange={(checked) => field.handleChange(checked)}
                          />
                        </div>
                      );
                    }}
                  </form.Field>
                ))}
              </div>
            </section>

            <form.Subscribe selector={(state) => state.values.availability.isInventoried}>
              {(isInventoried) =>
                isInventoried ? (
                  <section className="rounded-lg border border-border/80 bg-background p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Receta base</h3>
                        <p className="text-xs text-muted-foreground">
                          Insumos que luego pueden alimentar consumo de inventario.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="bg-background"
                        onClick={() =>
                          form.pushFieldValue('recipe.ingredients', { ...EMPTY_INGREDIENT })
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Insumo
                      </Button>
                    </div>

                    <form.Field name="recipe.ingredients" mode="array">
                      {(field) => (
                        <div className="space-y-3">
                          {field.state.value.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm text-muted-foreground">
                              Agrega al menos un insumo si este producto debe descontar inventario.
                            </div>
                          ) : null}

                          {field.state.value.map((_ingredient, index) => (
                            <div
                              key={`ingredient-${index}`}
                              className="grid gap-3 rounded-lg border border-border bg-surface-muted p-3 md:grid-cols-[1fr_110px_100px_auto]"
                            >
                              <form.Field name={`recipe.ingredients[${index}].name`}>
                                {(ingredientField) => {
                                  const error = getFieldError(ingredientField.state.meta.errors);
                                  const inputId = `ingredient-${index}-name`;

                                  return (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium" htmlFor={inputId}>
                                        Insumo
                                      </label>
                                      <Input
                                        id={inputId}
                                        placeholder="Carne molida"
                                        value={ingredientField.state.value}
                                        onBlur={ingredientField.handleBlur}
                                        onChange={(event) =>
                                          ingredientField.handleChange(event.target.value)
                                        }
                                        aria-invalid={Boolean(error)}
                                        aria-describedby={error ? `${inputId}-error` : undefined}
                                      />
                                      {error ? (
                                        <p
                                          id={`${inputId}-error`}
                                          className="text-xs text-destructive"
                                        >
                                          {error}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              </form.Field>

                              <form.Field name={`recipe.ingredients[${index}].quantity`}>
                                {(quantityField) => {
                                  const error = getFieldError(quantityField.state.meta.errors);
                                  const inputId = `ingredient-${index}-quantity`;

                                  return (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium" htmlFor={inputId}>
                                        Cantidad
                                      </label>
                                      <Input
                                        id={inputId}
                                        type="number"
                                        min={0.01}
                                        step={0.01}
                                        value={quantityField.state.value}
                                        onBlur={quantityField.handleBlur}
                                        onChange={(event) =>
                                          quantityField.handleChange(Number(event.target.value))
                                        }
                                        aria-invalid={Boolean(error)}
                                        aria-describedby={error ? `${inputId}-error` : undefined}
                                      />
                                      {error ? (
                                        <p
                                          id={`${inputId}-error`}
                                          className="text-xs text-destructive"
                                        >
                                          {error}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              </form.Field>

                              <form.Field name={`recipe.ingredients[${index}].unit`}>
                                {(unitField) => {
                                  const error = getFieldError(unitField.state.meta.errors);
                                  const inputId = `ingredient-${index}-unit`;

                                  return (
                                    <div className="space-y-2">
                                      <label className="text-xs font-medium" htmlFor={inputId}>
                                        Unidad
                                      </label>
                                      <Input
                                        id={inputId}
                                        placeholder="g"
                                        value={unitField.state.value}
                                        onBlur={unitField.handleBlur}
                                        onChange={(event) =>
                                          unitField.handleChange(event.target.value)
                                        }
                                        aria-invalid={Boolean(error)}
                                        aria-describedby={error ? `${inputId}-error` : undefined}
                                      />
                                      {error ? (
                                        <p
                                          id={`${inputId}-error`}
                                          className="text-xs text-destructive"
                                        >
                                          {error}
                                        </p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              </form.Field>

                              <div className="flex items-end justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Quitar insumo ${index + 1}`}
                                  onClick={() => {
                                    void form.removeFieldValue('recipe.ingredients', index);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </form.Field>
                  </section>
                ) : null
              }
            </form.Subscribe>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
            <form.Subscribe
              selector={(state) => ({
                name: state.values.identity.name,
                price: state.values.pricing.amount,
                currency: state.values.pricing.currency,
                active: state.values.availability.isActive,
                sellable: state.values.availability.isSellable,
                inventoried: state.values.availability.isInventoried,
                ingredientCount: state.values.recipe.ingredients.length,
              })}
            >
              {(summary) => (
                <section className="rounded-lg border border-border bg-surface-muted p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Vista POS
                  </p>
                  <div className="mt-3 rounded-lg border border-border bg-background p-3">
                    <p className="line-clamp-2 text-sm font-semibold">
                      {summary.name.trim() || 'Producto sin nombre'}
                    </p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatCurrency(summary.price, summary.currency)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          summary.active
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {summary.active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          summary.sellable
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {summary.sellable ? 'POS' : 'No POS'}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          summary.inventoried
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {summary.inventoried ? `${summary.ingredientCount} insumos` : 'Sin receta'}
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </form.Subscribe>

            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
                isValidating: state.isValidating,
              })}
            >
              {(state) => (
                <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-background"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!state.canSubmit || state.isSubmitting || isSubmitting}
                  >
                    {state.isSubmitting || isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {state.isValidating ? 'Validando...' : submitLabel}
                  </Button>
                </DialogFooter>
              )}
            </form.Subscribe>
          </aside>
        </form>
      </DialogContent>
    </Dialog>
  );
}
