"use client";
import { supabase } from "@/lib/supabaseClient";
import { useQuery } from "@tanstack/react-query";

function DashboardPage() {
  const sessionQuery = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return data.session;
    },
  });

  if (sessionQuery.isPending) {
    return <div className="p-4 text-neutral-700">載入中...</div>;
  }

  if (sessionQuery.isError) {
    return (
      <div className="p-4 text-red-600">
        無法取得登入資訊：{sessionQuery.error.message}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="text-sm text-neutral-600">已登入</div>
      <pre className="mt-2 rounded-lg bg-neutral-100 p-3 text-xs text-neutral-800">
        {JSON.stringify(sessionQuery.data, null, 2)}
      </pre>
    </div>
  );
}

export default DashboardPage;
