import { useToast as useVueToast } from 'vue-toastification'

export const useToast = () => {
  const toast = useVueToast()

  return {
    success(message: string) {
      toast.success(message)
    },
    error(message: string | Error) {
      const errorMessage = message instanceof Error ? message.message : message
      toast.error(errorMessage)
    },
    warning(message: string) {
      toast.warning(message)
    },
    info(message: string) {
      toast.info(message)
    }
  }
} 