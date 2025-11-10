// 配送設定相關類型定義

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
