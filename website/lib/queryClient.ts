import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance so we can clear or hydrate caches outside of React components.
export const queryClient = new QueryClient();
