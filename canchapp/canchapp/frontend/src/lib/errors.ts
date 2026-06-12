/**
 * Convierte errores técnicos del backend en mensajes humanos en español.
 * Si no encuentra una traducción, devuelve un mensaje genérico amigable.
 *
 * Uso:
 *   try { ... } catch (err) {
 *     setError(humanizeError(err));
 *   }
 */
export function humanizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  // Auth
  if (lower.includes('credenciales') || lower.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  }
  if (lower.includes('403') || lower.includes('forbidden')) {
    return 'No tienes permiso para esta acción.';
  }

  // Validación
  if (lower.includes('whatsapp')) {
    return 'El número de WhatsApp no es válido. Debe ser un celular peruano (9 dígitos empezando por 9).';
  }
  if (lower.includes('email') && (lower.includes('exist') || lower.includes('ya existe'))) {
    return 'Ya existe una cuenta con este email.';
  }
  if (lower.includes('slug') && (lower.includes('exist') || lower.includes('ya existe'))) {
    return 'Ya hay un negocio con esa URL. Elige otra.';
  }
  if (lower.includes('password') || lower.includes('contraseña')) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }

  // Reservas
  if (lower.includes('fecha') && lower.includes('pasada')) {
    return 'No puedes reservar para una fecha pasada.';
  }
  if (lower.includes('ocupado') || lower.includes('ya reservado')) {
    return 'Ese horario ya está ocupado. Elige otro.';
  }
  if (lower.includes('bloqueado')) {
    return 'Ese horario está bloqueado por el dueño. Elige otro.';
  }
  if (lower.includes('2 horas') || lower.includes('cancelar')) {
    return 'No se puede cancelar a menos de 2 horas del inicio del partido.';
  }

  // Upload
  if (lower.includes('file too large') || lower.includes('archivo muy grande')) {
    return 'El archivo es muy grande. Máximo 5 MB.';
  }
  if (lower.includes('invalid file') || lower.includes('formato')) {
    return 'Formato no permitido. Solo JPG, PNG o WebP.';
  }

  // Red
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'No se pudo conectar. Verifica tu internet e intenta de nuevo.';
  }
  if (lower.includes('timeout')) {
    return 'La operación tardó demasiado. Intenta de nuevo.';
  }

  // Códigos HTTP genéricos
  if (lower.includes('400')) return 'Hay un dato inválido. Revisa el formulario.';
  if (lower.includes('404')) return 'No encontrado.';
  if (lower.includes('422')) return 'Algunos datos no son válidos. Revisa el formulario.';
  if (lower.includes('500')) return 'Error del servidor. Intenta de nuevo en unos minutos.';

  // Pydantic verbosity
  if (lower.includes('value is not valid') || lower.includes('field required')) {
    return 'Algunos datos no son válidos. Revisa el formulario.';
  }

  // Si el mensaje original es corto y razonable, lo usamos
  if (msg.length < 120 && !lower.includes('json') && !lower.includes('parse')) {
    return msg;
  }

  return 'Algo salió mal. Intenta de nuevo.';
}
