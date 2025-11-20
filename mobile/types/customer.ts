/**
 * Customer Types
 * 顧客相關的類型定義
 */

export interface Customer {
  id: string;
  team_id: string;
  name: string;
  phone: string | null;
  line_user_id: string | null;
  email: string | null;
  total_orders: number;
  total_spent: number;
  notes: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_order_at: string | null;
}

export interface CustomerFilters {
  search?: string;
  tag?: string;
  sortBy?: "updated_at" | "total_spent" | "total_orders";
  sortOrder?: "asc" | "desc";
}
