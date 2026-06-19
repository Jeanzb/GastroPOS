import { useMemo } from 'react';
import { toast, type ExternalToast } from 'sonner';

type AppToastOptions = Omit<ExternalToast, 'duration'> & {
  duration?: number;
};

type AppToastFn = (title: string, description?: string, options?: AppToastOptions) => string | number;

const TOAST_DURATION_MS = 2800;

function withDefaults(description?: string, options?: AppToastOptions): ExternalToast {
  return {
    duration: TOAST_DURATION_MS,
    closeButton: true,
    ...options,
    description: description ?? options?.description,
  };
}

export interface AppToastApi {
  success: AppToastFn;
  error: AppToastFn;
  warning: AppToastFn;
  info: AppToastFn;
  loading: AppToastFn;
  dismiss: (id?: string | number) => void;
  clienteRegistrado: (name?: string) => string | number;
  comandaEnviada: (tableNumber?: string, itemCount?: number) => string | number;
  empleadoSuspendido: (name: string) => string | number;
}

export function useAppToast(): AppToastApi {
  return useMemo(
    () => ({
      success: (title, description, options) =>
        toast.success(title, withDefaults(description, options)),
      error: (title, description, options) => toast.error(title, withDefaults(description, options)),
      warning: (title, description, options) =>
        toast.warning(title, withDefaults(description, options)),
      info: (title, description, options) => toast.info(title, withDefaults(description, options)),
      loading: (title, description, options) =>
        toast.loading(title, withDefaults(description, { duration: Infinity, ...options })),
      dismiss: toast.dismiss,
      clienteRegistrado: (name) =>
        toast.success(
          name ? `${name} registrado` : 'Cliente registrado',
          withDefaults('Datos listos para facturación electrónica DIAN'),
        ),
      comandaEnviada: (tableNumber, itemCount) =>
        toast.info(
          'Comanda enviada a cocina',
          withDefaults(
            tableNumber
              ? `Mesa ${tableNumber}${itemCount ? ` · ${itemCount} productos en preparación` : ''}`
              : 'Pedido enviado a preparación',
          ),
        ),
      empleadoSuspendido: (name) =>
        toast.warning(
          'Empleado suspendido',
          withDefaults(`${name} ya no puede iniciar sesión`),
        ),
    }),
    [],
  );
}
