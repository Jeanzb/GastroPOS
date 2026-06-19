const API_MESSAGE_ES: Record<string, string> = {
  'This table account is already closed.': 'La cuenta de la mesa ya está cerrada.',
  'Cash payments require an open cash session for this branch.':
    'Los pagos en efectivo requieren una caja abierta en esta sede.',
  'Supplier was not found.': 'No se encontró el proveedor.',
  'Customer was not found.': 'No se encontró el cliente.',
  'Purchase was not found.': 'No se encontró la compra.',
  'One or more purchase products do not belong to this tenant.':
    'Uno o más productos de la compra no pertenecen a este negocio.',
  'The referenced product category does not exist.':
    'La categoría de producto referenciada no existe.',
  'Product was not found.': 'No se encontró el producto.',
  'Product category was not found.': 'No se encontró la categoría.',
  'Fiscal provider configuration is required before testing.':
    'Debes configurar el proveedor fiscal antes de probar la conexión.',
  'Invoice numbering range start must be lower than or equal to end.':
    'El rango de numeración debe iniciar en un valor menor o igual al final.',
  'Invoice resolution start date must be before the end date.':
    'La fecha inicial de la resolución debe ser anterior a la final.',
  'Fiscal provider configuration was not found.':
    'No se encontró la configuración del proveedor fiscal.',
  'This branch already has an open cash session.': 'Esta sede ya tiene una caja abierta.',
  'There is no open cash session for this branch.': 'No hay una caja abierta en esta sede.',
  'The cash session is already closed.': 'La caja ya está cerrada.',
  'Cash session was not found.': 'No se encontró la sesión de caja.',
  'Branch was not found for this tenant.': 'No se encontró la sede para este negocio.',
  'Branch was not found.': 'No se encontró la sede.',
  'Employee was not found.': 'No se encontró el empleado.',
  'You cannot disable or delete your own employee account.':
    'No puedes desactivar ni eliminar tu propia cuenta de empleado.',
  'Tenant slug is required for this user.':
    'Se requiere el identificador del negocio para este usuario.',
  'Invalid refresh token.': 'La sesión expiró. Inicia sesión nuevamente.',
  'Invalid credentials.': 'Correo o contraseña incorrectos.',
  'Request failed': 'No se pudo completar la solicitud.',
};

const API_CODE_ES: Record<string, string> = {
  UNAUTHORIZED: 'No tienes autorización para esta acción.',
  FORBIDDEN: 'No tienes permisos para esta acción.',
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  CONFLICT: 'La operación entra en conflicto con el estado actual.',
  VALIDATION_ERROR: 'Revisa los datos ingresados.',
  BAD_REQUEST: 'Revisa los datos ingresados.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado.',
};

/** Translates a backend error (code + English message) into a Spanish message for the UI. */
export function localizeApiError(code: string, message: string): string {
  const exact = API_MESSAGE_ES[message];
  if (exact) {
    return exact;
  }
  if (/already exists/i.test(message)) {
    return 'Ya existe un registro con esos datos.';
  }
  if (/was not found/i.test(message)) {
    return 'No se encontró el recurso solicitado.';
  }
  const byCode = API_CODE_ES[code];
  if (byCode) {
    return byCode;
  }
  return message;
}
