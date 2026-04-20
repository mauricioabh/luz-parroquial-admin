/**
 * Error translation utility
 * Converts Supabase and system errors into user-friendly, pastoral messages
 */

export interface ErrorContext {
  action?: string // e.g., "submitting prayer intention", "loading profile"
  resource?: string // e.g., "prayer intention", "Mass intention"
}

/**
 * Translate Supabase errors to user-friendly messages
 */
export function translateError(error: unknown, context?: ErrorContext): string {
  // Handle string errors directly
  if (typeof error === 'string') {
    return error
  }

  // Handle Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Authentication errors
    if (message.includes('not authenticated') || message.includes('unauthorized')) {
      return 'Necesitas iniciar sesión para continuar. Por favor inicia sesión e intenta nuevamente.'
    }

    if (message.includes('session expired') || message.includes('token expired')) {
      return 'Tu sesión ha expirado. Por favor inicia sesión nuevamente para continuar.'
    }

    // Permission errors
    if (message.includes('permission denied') || message.includes('forbidden')) {
      return "Esta acción es gestionada por la oficina parroquial. Si crees que deberías tener acceso, por favor contacta a tu administrador parroquial."
    }

    if (message.includes('locked') || message.includes('access is locked')) {
      return 'El acceso a tu cuenta ha sido restringido temporalmente. Por favor contacta a tu administrador parroquial para obtener ayuda.'
    }

    if (message.includes('parish is disabled') || message.includes('parish disabled')) {
      return 'El acceso parroquial no está disponible actualmente. Por favor contacta a tu administrador parroquial.'
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      const resource = context?.resource || 'elemento'
      return `El ${resource} que buscas no pudo ser encontrado. Puede haber sido eliminado o puede que no tengas acceso a él.`
    }

    // Validation errors
    if (message.includes('required') || message.includes('missing')) {
      return 'Por favor completa todos los campos requeridos e intenta nuevamente.'
    }

    if (message.includes('invalid') && message.includes('email')) {
      return 'Por favor ingresa una dirección de correo electrónico válida.'
    }

    if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
      return 'La contraseña debe tener al menos 8 caracteres. Por favor elige una contraseña más fuerte.'
    }

    if (message.includes('already exists') || message.includes('duplicate')) {
      if (message.includes('email') || message.includes('user')) {
        return 'Ya existe una cuenta con este correo electrónico. Por favor inicia sesión o usa una dirección de correo diferente.'
      }
      return 'Este elemento ya existe. Por favor verifica e intenta nuevamente.'
    }

    // Network/connection errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'No se pudo conectar al servidor. Por favor verifica tu conexión a internet e intenta nuevamente.'
    }

    if (message.includes('timeout')) {
      return 'La solicitud tardó demasiado en completarse. Por favor verifica tu conexión e intenta nuevamente.'
    }

    // Supabase Auth specific errors
    if (message.includes('invalid login credentials') || message.includes('email not confirmed')) {
      return 'Correo electrónico o contraseña inválidos. Por favor verifica tus credenciales e intenta nuevamente.'
    }

    if (message.includes('email rate limit') || message.includes('too many emails')) {
      return 'Demasiados intentos de inicio de sesión. Por favor espera unos minutos e intenta nuevamente.'
    }

    if (message.includes('email not found') || message.includes('user not found')) {
      return 'No se encontró una cuenta con esta dirección de correo electrónico. Por favor verifica tu correo o registra una nueva cuenta.'
    }

    if (message.includes('email provider') || message.includes('email disabled')) {
      return 'La autenticación por correo electrónico no está disponible. Por favor contacta al soporte para obtener ayuda.'
    }

    // Database errors (generic)
    if (message.includes('database') || message.includes('sql') || message.includes('relation')) {
      return 'Encontramos un problema al procesar tu solicitud. Por favor intenta nuevamente en un momento.'
    }

    // RLS policy errors (these should be caught but just in case)
    if (message.includes('row-level security') || message.includes('policy')) {
      return "Esta acción es gestionada por la oficina parroquial. Por favor contacta a tu administrador parroquial si necesitas acceso."
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 'Demasiadas solicitudes. Por favor espera un momento e intenta nuevamente.'
    }

    // Specific Supabase RPC errors
    if (message.includes('user must be authenticated')) {
      return 'Necesitas iniciar sesión para continuar. Por favor inicia sesión e intenta nuevamente.'
    }

    if (message.includes('user profile not found')) {
      return 'No se pudo cargar la información de tu cuenta. Por favor cierra sesión e inicia sesión nuevamente.'
    }

    if (message.includes('not assigned to a parish')) {
      return 'Tu cuenta no está asociada con una parroquia. Por favor contacta a tu administrador parroquial.'
    }

    // Date validation
    if (message.includes('cannot be in the past')) {
      return 'La fecha no puede estar en el pasado. Por favor selecciona una fecha futura.'
    }

    // Generic fallback
    return context?.action 
      ? `No se pudo ${context.action}. Por favor intenta nuevamente. Si el problema persiste, contacta a tu administrador parroquial.`
      : 'Algo salió mal. Por favor intenta nuevamente. Si el problema persiste, contacta a tu administrador parroquial.'
  }

  // Handle unknown error types
  return context?.action
    ? `No se pudo ${context.action}. Por favor intenta nuevamente.`
    : 'Ocurrió un error inesperado. Por favor intenta nuevamente.'
}

/**
 * Get recovery steps for common errors
 */
export function getRecoverySteps(error: unknown): string[] {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  const steps: string[] = []

  if (message.includes('not authenticated') || message.includes('session')) {
    steps.push('Cierra sesión e inicia sesión nuevamente')
    steps.push('Limpia la caché y las cookies de tu navegador')
  } else if (message.includes('network') || message.includes('connection')) {
    steps.push('Verifica tu conexión a internet')
    steps.push('Intenta actualizar la página')
    steps.push('Espera un momento e intenta nuevamente')
  } else if (message.includes('permission') || message.includes('locked')) {
    steps.push('Contacta a tu administrador parroquial')
    steps.push('Verifica el estado de tu cuenta')
  } else {
    steps.push('Actualiza la página e intenta nuevamente')
    steps.push('Contacta al soporte si el problema persiste')
  }

  return steps
}

/**
 * Format error for display with recovery steps
 */
export function formatError(error: unknown, context?: ErrorContext): {
  message: string
  recoverySteps?: string[]
  showContactSupport?: boolean
} {
  const message = translateError(error, context)
  const recoverySteps = getRecoverySteps(error)
  
  return {
    message,
    recoverySteps,
    showContactSupport: true
  }
}

