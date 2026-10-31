import { unstable_rethrow } from "next/navigation"

import { apiError, logServerError } from "@/lib/api/errors"

/**
 * Envolve um route handler: erro nao tratado vira 500 no formato padrao, com
 * log seguro, em vez da pagina de erro do Next.
 */
export function withApiErrors<Args extends unknown[]>(
  scope: string,
  handler: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (error) {
      unstable_rethrow(error)
      logServerError(scope, error)
      return apiError("INTERNAL", "Erro inesperado. Tente novamente.")
    }
  }
}
