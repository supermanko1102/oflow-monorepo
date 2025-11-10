# OFlow Mobile - Project Context

## Overview

OFlow is an intelligent order management system designed for small businesses in Taiwan. The mobile app allows business owners to manage orders received through LINE, with AI-powered automatic order parsing and intelligent reminders.

**Key Features:**

- Multi-provider authentication (LINE and Apple)
- Team-based order management
- AI-powered order parsing from LINE messages
- Smart reminders (7-day, 3-day, same-day)
- Auto-mode and manual-mode order handling
- Product catalog management
- Multi-industry support (goods and services)

## Tech Stack

### Core Framework

- **React Native**: 0.81.5 with new architecture enabled
- **Expo SDK**: 54.0.22
- **Expo Router**: 6.0.14 (file-based routing with typed routes)
- **TypeScript**: 5.9.2 with strict mode

### UI & Styling

- **NativeWind**: 4.2.1 (Tailwind CSS for React Native)
- **React Native Paper**: 5.14.5 (Material Design components)
- **Expo Symbols**: iOS SF Symbols support
- **React Native Reanimated**: 4.1.1 (animations)

### State Management

- **Zustand**: 5.0.8 (client state - auth, settings)
- **React Query**: 5.90.5 (server state - orders, teams, products)
- **AsyncStorage**: Persistent storage for Zustand stores

### Backend & API

- **Supabase**: 2.75.1 (Auth, Database, Edge Functions)
- **Edge Functions**: Serverless API endpoints
- **PostgreSQL**: Database with RLS (Row Level Security)

### Additional Libraries

- **date-fns**: 4.1.0 (date manipulation)
- **react-hook-form**: 7.65.0 (form handling)
- **expo-haptics**: Tactile feedback
- **expo-notifications**: Push notifications
- **expo-apple-authentication**: Apple Sign In

## Architecture Patterns

### File-Based Routing (Expo Router)

The app uses Expo Router v6 with file-based routing and route groups:

```
app/
├── _layout.tsx                 # Root layout (providers, theme)
├── (auth)/                     # Auth route group
│   ├── _layout.tsx            # Auth guard (redirect if logged in)
│   ├── index.tsx              # Login page
│   ├── line-callback.tsx      # LINE OAuth callback
│   └── apple-callback.tsx     # Apple OAuth callback
└── (main)/                     # Main app route group
    ├── _layout.tsx            # Main guard (redirect if not logged in)
    ├── (tabs)/                # Bottom tabs
    │   ├── _layout.tsx        # Tab navigation config
    │   ├── index.tsx          # Dashboard/Home
    │   ├── orders.tsx         # Orders list
    │   ├── products.tsx       # Product catalog
    │   └── settings.tsx       # Settings
    └── order/
        ├── _layout.tsx        # Stack layout
        └── [id].tsx           # Order detail (dynamic route)
```

**Route Groups Pattern:**

- `(auth)` and `(main)` are route groups (parentheses = not in URL)
- Each group has its own `_layout.tsx` handling auth guards
- **Distributed Auth Guards**: No centralized routing logic, each layout handles its own protection

### State Management Architecture

#### Client State (Zustand)

Used for UI state and user preferences that need persistence:

**`stores/useAuthStore.ts`**

- Current user session (userId, userName, tokens)
- Login state and auth provider (LINE/Apple)
- Current team selection
- Persisted to AsyncStorage
- Hydration validation against Supabase session

**`stores/useSettingsStore.ts`**

- App preferences
- Notification settings
- UI preferences

**Pattern:**

```typescript
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // State
      isLoggedIn: false,
      userId: null,
      // Actions
      login: (userId) => set({ isLoggedIn: true, userId }),
      logout: () => set({ isLoggedIn: false, userId: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => async (state) => {
        // Validate session on hydration
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (state?.isLoggedIn && !session) {
          state.logout();
        }
        state?.setHasHydrated(true);
      },
    }
  )
);
```

#### Server State (React Query)

Used for all API data with caching, refetching, and synchronization:

**Query Hooks Pattern:**

```
hooks/queries/
├── queryKeys.ts              # Centralized query key factory
├── useOrders.ts              # Order queries & mutations
├── useTeams.ts               # Team queries & mutations
├── useProducts.ts            # Product queries & mutations
├── useDashboard.ts           # Dashboard stats queries
└── useLineConnect.ts         # LINE connection queries
```

**Query Keys Factory:**

```typescript
// hooks/queries/queryKeys.ts
export const queryKeys = {
  orders: {
    all: ["orders"] as const,
    lists: () => [...queryKeys.orders.all, "list"] as const,
    list: (teamId: string, filters?: OrderFilters) =>
      [...queryKeys.orders.lists(), teamId, filters] as const,
    detail: (orderId: string) =>
      [...queryKeys.orders.all, "detail", orderId] as const,
  },
  teams: {
    all: ["teams"] as const,
    list: () => [...queryKeys.teams.all, "list"] as const,
    members: (teamId: string) =>
      [...queryKeys.teams.all, "members", teamId] as const,
  },
};
```

**Custom Hook Pattern:**

```typescript
// hooks/queries/useOrders.ts
export function useOrders(teamId: string, filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(teamId, filters),
    queryFn: () => orderService.getOrders(teamId, filters),
    enabled: !!teamId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: (_, variables) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.lists(),
      });
    },
  });
}
```

### API Communication Pattern

#### ApiClient Class

Centralized HTTP client with automatic authentication and error handling:

**`lib/apiClient.ts`**

```typescript
export class ApiClient {
  constructor(private baseUrl: string) {}

  async call<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    action: string,
    params?: Record<string, string>,
    body?: any
  ): Promise<T> {
    // 1. Get access token from Supabase session
    const accessToken = await this.getAccessToken();

    // 2. Build URL with query params
    const url = this.buildUrl(action, params);

    // 3. Fetch with timeout
    const response = await this.fetchWithTimeout(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // 4. Handle errors
    if (!response.ok) {
      await this.handleErrorResponse(response);
    }

    // 5. Parse and return
    return await response.json();
  }
}
```

**Features:**

- Automatic access token injection
- Unified error handling (ApiError types)
- Request timeout (30s default)
- Retry mechanism (RetryableApiClient)

#### Service Layer

Services wrap Edge Functions and provide type-safe API access:

**Pattern:**

```typescript
// services/orderService.ts
import { ApiClient } from "@/lib/apiClient";
import { config } from "@/lib/config";
import type { Order, CreateOrderInput } from "@/types/order";

const orderApi = new ApiClient(
  config.supabase.url + "/functions/v1/order-operations"
);

export async function getOrders(
  teamId: string,
  filters?: OrderFilters
): Promise<Order[]> {
  const response = await orderApi.call<{ data: Order[] }>("GET", "list", {
    team_id: teamId,
    ...filters,
  });
  return response.data;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const response = await orderApi.call<{ data: Order }>(
    "POST",
    "create",
    undefined,
    input
  );
  return response.data;
}
```

**Service Files:**

- `orderService.ts` - Order CRUD operations
- `teamService.ts` - Team management
- `productService.ts` - Product catalog
- `dashboardService.ts` - Dashboard stats
- `lineLoginService.ts` - LINE OAuth flow
- `appleLoginService.ts` - Apple Sign In flow
- `authService.ts` - Account deletion

### Authentication Flow

#### Multi-Provider Support

OFlow supports two authentication providers:

1. **LINE Login** (Primary for Taiwan market)
   - OAuth 2.0 flow via Expo Auth Session
   - Redirects to Edge Function: `auth-line-callback`
   - Stores LINE user ID and display name
2. **Apple Sign In** (iOS requirement)
   - Native Apple Authentication module
   - Redirects to Edge Function: `auth-apple-callback`
   - Stores Apple user ID

**Login Flow:**

```
1. User clicks "Login with LINE/Apple"
2. Expo Auth Session opens OAuth URL
3. User authorizes in LINE/Apple
4. Callback redirected to Edge Function
5. Edge Function:
   - Validates token
   - Creates/updates user in database
   - Creates Supabase auth session
   - Returns session token
6. App receives session token
7. Supabase client stores session
8. Zustand store updates login state
9. Router redirects to main app
```

**Session Management:**

```typescript
// On app launch
supabase.auth.onAuthStateChange((event, session) => {
  if (!session && useAuthStore.getState().isLoggedIn) {
    // Session expired, logout
    useAuthStore.getState().logout();
  }
});

// On hydration
onRehydrateStorage: () => async (state) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (state?.isLoggedIn && !session) {
    // Mismatch: store says logged in but no session
    state.logout();
  }
  state?.setHasHydrated(true);
};
```

### Type System

#### Comprehensive TypeScript Types

**`types/api.ts`** - API error handling

```typescript
export enum ApiErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SERVER_ERROR = "SERVER_ERROR",
  TIMEOUT = "TIMEOUT",
  BUSINESS_LOGIC_ERROR = "BUSINESS_LOGIC_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    public statusCode: number,
    message: string
  ) {
    super(message);
  }

  isNetworkError(): boolean {
    return this.code === ApiErrorCode.NETWORK_ERROR;
  }

  isAuthError(): boolean {
    return [ApiErrorCode.UNAUTHORIZED, ApiErrorCode.FORBIDDEN].includes(
      this.code
    );
  }
}
```

**`types/order.ts`** - Order domain types

```typescript
export interface Order {
  id: string;
  team_id: string;
  customer_name: string;
  customer_line_id?: string | null;
  order_number: string;
  status: OrderStatus;
  pickup_date: string;
  pickup_time?: string | null;
  total_amount: number;
  notes?: string | null;
  is_auto_mode: boolean;
  line_conversation_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface CreateOrderInput {
  team_id: string;
  customer_name: string;
  pickup_date: string;
  items: OrderItemInput[];
}
```

**`types/team.ts`** - Team domain types
**`types/product.ts`** - Product domain types

#### Supabase Database Types

**`lib/supabase.ts`** includes database type definitions:

```typescript
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          /* ... */
        };
        Insert: {
          /* ... */
        };
        Update: {
          /* ... */
        };
      };
      teams: {
        /* ... */
      };
      orders: {
        /* ... */
      };
      // ...
    };
  };
};
```

## Project Structure Deep Dive

### Core Configuration (`lib/`)

**`lib/config.ts`**

- Centralized app configuration
- Environment variable access via Expo Constants
- Supabase URL and keys
- LINE channel ID

**`lib/supabase.ts`**

- Supabase client initialization
- AsyncStorage for session persistence
- Database type definitions

**`lib/queryClient.ts`**

- React Query client configuration
- Default query options (staleTime, retry, etc.)
- Query cache settings

**`lib/apiClient.ts`**

- ApiClient and RetryableApiClient classes
- HTTP request abstraction
- Error handling utilities

### Components Organization

```
components/
├── OrderCard.tsx              # Order list item
├── StatusBadge.tsx            # Status indicator
├── EmptyState.tsx             # Empty list placeholder
├── LoadingState.tsx           # Loading spinner
├── Toast.tsx                  # Toast notification system
├── BottomSheet.tsx            # Bottom sheet modal
├── ProductFormModal.tsx       # Product create/edit form
├── ui/                        # Generic UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   └── Card.tsx
├── orders/                    # Order-specific components
│   ├── OrderFilters.tsx
│   └── OrderItemsList.tsx
├── settings/                  # Settings-specific components
│   ├── ProfileSection.tsx
│   ├── TeamSection.tsx
│   └── NotificationSettings.tsx
└── team/                      # Team-specific components
    ├── TeamList.tsx
    ├── MemberList.tsx
    └── InviteCodeModal.tsx
```

### Utilities (`utils/`)

**`utils/timeHelpers.ts`**

- Date formatting functions
- Time zone handling
- Relative time display ("2 hours ago")

**`utils/notificationService.ts`**

- Push notification handling
- Local notification scheduling
- Notification permissions

## Key Dependencies

### Expo Modules

- `expo-router` - File-based routing
- `expo-auth-session` - OAuth flows
- `expo-apple-authentication` - Apple Sign In
- `expo-notifications` - Push notifications
- `expo-haptics` - Tactile feedback
- `expo-constants` - Environment variables
- `expo-updates` - OTA updates

### UI Libraries

- `react-native-paper` - Material Design components
- `nativewind` - Tailwind CSS
- `@expo/vector-icons` - Icon sets
- `react-native-svg` - SVG support

### Data Management

- `@tanstack/react-query` - Server state
- `zustand` - Client state
- `@react-native-async-storage/async-storage` - Storage

### Forms & Validation

- `react-hook-form` - Form handling
- `date-fns` - Date manipulation

## Build Configuration

### Expo Config (`app.config.js`)

```javascript
module.exports = {
  expo: {
    name: "OFlow",
    slug: "mobile",
    version: "1.0.1",
    scheme: "oflow",
    newArchEnabled: true, // React Native new architecture
    ios: {
      bundleIdentifier: "com.oflow.app",
      associatedDomains: ["applinks:oflow-website.vercel.app"],
    },
    android: {
      package: "com.oflow.app",
    },
    plugins: ["expo-router", "expo-apple-authentication"],
    experiments: {
      typedRoutes: true, // Type-safe routing
      reactCompiler: true, // React Compiler
    },
  },
};
```

### EAS Build (`eas.json`)

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

## Environment Variables

Required in `.env` or Expo environment:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_LINE_CHANNEL_ID=xxx
```

Access via:

```typescript
import Constants from "expo-constants";

const config = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl,
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey,
  lineChannelId: Constants.expoConfig?.extra?.lineChannelId,
};
```

## Backend Integration

### Supabase Edge Functions

The mobile app communicates with these Edge Functions:

1. **`order-operations`** - Order CRUD
   - Actions: list, get, create, update, delete
2. **`product-operations`** - Product CRUD
   - Actions: list, get, create, update, delete
3. **`team-operations`** - Team management
   - Actions: list, create, join, leave, delete, get_invite_code, update_auto_mode
4. **`auth-line-callback`** - LINE OAuth callback
   - Handles LINE login flow
5. **`auth-apple-callback`** - Apple OAuth callback
   - Handles Apple Sign In flow
6. **`delete-account`** - Account deletion
   - Permanently deletes user and their data

### Database Schema

Key tables:

- `users` - User profiles (LINE/Apple)
- `teams` - Business teams
- `team_members` - Team membership
- `orders` - Order records
- `order_items` - Order line items
- `products` - Product catalog
- `conversations` - LINE conversations
- `messages` - LINE messages

**Row Level Security (RLS):**
All tables have RLS policies ensuring users can only access data they own or are members of.

## Development Workflow

### Running the App

```bash
# Start development server
cd mobile
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android

# Build for production
eas build --platform ios --profile production
```

### Debugging

- Use React Query DevTools (enabled in dev mode)
- Console logs are namespaced (e.g., `[AuthStore]`, `[API Client]`)
- Use Expo Dev Tools for network inspection
- Flipper for advanced debugging

### Common Tasks

**Adding a new API endpoint:**

1. Add function to service (e.g., `orderService.ts`)
2. Create React Query hook (e.g., `useOrders.ts`)
3. Add query key to `queryKeys.ts`
4. Use hook in component

**Adding a new route:**

1. Create file in `app/` directory
2. Add to navigation type (auto-generated with typed routes)
3. Navigate using `router.push()` or `<Link>`

**Adding a new Zustand store:**

1. Create store in `stores/`
2. Add persist middleware if needed
3. Use in components with `useStoreName()`

## Performance Considerations

### React Query Cache

- Orders: 2 minutes stale time
- Teams: 5 minutes stale time
- Dashboard: 1 minute stale time
- Products: 5 minutes stale time

### Optimizations

- Lazy loading for heavy components
- FlatList for long lists with `keyExtractor`
- Image optimization with expo-image
- Memoization for expensive calculations
- React Compiler for automatic optimizations

## Security

### Authentication

- OAuth 2.0 for LINE and Apple
- JWT tokens stored in AsyncStorage
- Session validation on hydration
- Automatic logout on session expiry

### API Security

- All requests require authentication
- Row Level Security on database
- CORS configured for mobile origin
- Rate limiting on Edge Functions

## Known Limitations

1. **Offline Support**: Currently requires network connection
2. **Image Upload**: Not yet implemented
3. **Multi-language**: Only Traditional Chinese for now
4. **Push Notifications**: Configured but not fully integrated

## Future Enhancements

- [ ] Offline mode with sync queue
- [ ] Image upload for orders and products
- [ ] Multi-language support (English, Japanese)
- [ ] Advanced analytics dashboard
- [ ] Export orders to CSV/Excel
- [ ] Calendar view for orders
- [ ] Customer management CRM features

## Related Documentation

- `IMPLEMENTATION.md` - Initial implementation guide
- `APPLE_SIGNIN_SETUP.md` - Apple Sign In setup guide
- `../supabase/DATABASE_SCHEMA.md` - Database schema
- `../BACKEND_AUTH_SETUP.md` - Backend auth configuration

## Contact & Support

For technical questions or issues, refer to:

- Supabase documentation: https://supabase.com/docs
- Expo documentation: https://docs.expo.dev
- React Query documentation: https://tanstack.com/query
