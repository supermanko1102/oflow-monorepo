import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as accountService from "@/services/accountService";

/**
 * 刪除個人帳號
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountService.deleteAccount,
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
