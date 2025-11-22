// 配送設定相關類型定義

export type DeliveryMethod =
  | "pickup"
  | "meetup"
  | "convenience_store"
  | "black_cat";

export interface StorePickupSettings {
  enabled: boolean;
  address: string | null;
  business_hours: string | null;
}

export interface MeetupSettings {
  enabled: boolean;
  available_areas: string[];
  note: string | null;
}

export interface PickupSettings {
  store_pickup: StorePickupSettings;
  meetup: MeetupSettings;
}

export interface DeliverySettings {
  pickup_settings: PickupSettings;
  enable_convenience_store: boolean;
  enable_black_cat: boolean;
}

// 預設值
export const defaultPickupSettings: PickupSettings = {
  store_pickup: {
    enabled: false,
    address: null,
    business_hours: null,
  },
  meetup: {
    enabled: false,
    available_areas: [],
    note: null,
  },
};

export const defaultDeliverySettings: DeliverySettings = {
  pickup_settings: defaultPickupSettings,
  enable_convenience_store: true,
  enable_black_cat: true,
};

export const deliveryMethodLabels: Record<DeliveryMethod, string> = {
  pickup: "店取",
  meetup: "面交",
  convenience_store: "超商",
  black_cat: "宅配",
};
