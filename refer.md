import '@/lib/polyfill'
import '@/lib/i18n'
import '@/lib/nativewind'
import '@/constants/global.css'
import '@/components/sheet'

import { ApolloProvider } from '@apollo/client'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { combineProviders } from 'react-combine-provider'
import { ErrorBoundary } from 'react-error-boundary'
import { SheetProvider } from 'react-native-actions-sheet'
import { ClickOutsideProvider } from 'react-native-click-outside'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { configureReanimatedLogger, ReanimatedLogLevel } from 'react-native-reanimated'

import { AnimatedSplashScreen } from '@/components/AnimatedSplashScreen'
import { ModalProvider } from '@/components/base/Modal'
import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback'
import { useNotificationObserver } from '@/hooks/useNotificationObserver'
import { useScreenTracker } from '@/hooks/useScreenTracker'
import { client } from '@/services/client'
import { ReminderProvider } from '@/stores/reminder'

configureReanimatedLogger({ level: ReanimatedLogLevel.warn, strict: false })

const CombineProvider = combineProviders([
AnimatedSplashScreen,
ReminderProvider,
SheetProvider,
ModalProvider,
[KeyboardProvider, { statusBarTranslucent: true, navigationBarTranslucent: true }],
ClickOutsideProvider,
[ApolloProvider, { client }],
[ErrorBoundary, { FallbackComponent: ErrorBoundaryFallback }],
])

export default function RootLayout() {
return (
<CombineProvider>
<Routes />
<StatusBar translucent={true} backgroundColor="transparent" />
</CombineProvider>
)
}

function Routes() {
useNotificationObserver()
useScreenTracker()

return (
<Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
<Stack.Screen name="index" />
<Stack.Screen name="(auth)" />
<Stack.Screen name="(main)" />
</Stack>
)
}

import { useCallback } from 'react'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { ActivityIndicator } from 'react-native'

import { BackgroundGradient } from '@/components/Gradient'
import { AuthStatus, useAuthStore } from '@/stores/auth'

const authenticatedStatuses = [AuthStatus.SettingUp, AuthStatus.Active]

export default function AuthLayout() {
const router = useRouter()
const isHydrated = useAuthStore(state => state.isHydrated)
const status = useAuthStore(state => state.status)
const isAuthenticated = authenticatedStatuses.includes(status)

const checkAccessible = useCallback(() => {
if (isHydrated && isAuthenticated) router.replace('/friendly')
}, [isHydrated, isAuthenticated, router])

useFocusEffect(checkAccessible)

try {
if (!isHydrated) throw new Error('Hydrating')
if (isAuthenticated) throw new Error('Already authenticated')
return <Stack />
} catch (e) {
e instanceof Error && console.log(`AuthLayout: Blocking [${e.message}]`)
return (
<BackgroundGradient className="flex-1 items-center justify-center">
<ActivityIndicator size="large" color="white" />
</BackgroundGradient>
)
}
}
import { useCallback } from 'react'
import { Stack, useFocusEffect, useRouter } from 'expo-router'
import { ActivityIndicator } from 'react-native'

import { BackgroundGradient } from '@/components/Gradient'
import SetupProvider from '@/components/SetupProvider'
import { useNewAchievementChecker } from '@/hooks/useNewAchievementChecker'
import { AuthStatus, useAuthStore } from '@/stores/auth'

export const unstable_settings = { initialRouteName: '(tabs)' }

const authenticatedStatuses = [AuthStatus.SettingUp, AuthStatus.Active]

export default function MainLayout() {
const router = useRouter()
const isHydrated = useAuthStore(state => state.isHydrated)
const status = useAuthStore(state => state.status)
const isAuthenticated = authenticatedStatuses.includes(status)

const checkAccessible = useCallback(() => {
if (isHydrated && !isAuthenticated) router.replace('/landing')
}, [isHydrated, isAuthenticated, router])

useFocusEffect(checkAccessible)

useNewAchievementChecker()

try {
if (!isHydrated) throw new Error('Hydrating')
if (!isAuthenticated) throw new Error('Without authenticated')
if (status === AuthStatus.SettingUp) throw new Error('Setting up')
// console.log('MainLayout: Ready')
return <Stack />
} catch (e) {
e instanceof Error && console.log(`MainLayout: Blocking [${e.message}]`)
return (
<SetupProvider>
<BackgroundGradient className="flex-1 items-center justify-center">
<ActivityIndicator size="large" color="white" />
</BackgroundGradient>
</SetupProvider>
)
}
}

/\*
const DUE_DATE = new Date(2025, 3, 28, 0, 0, 0) // 2025-04-28 00:00:00

function useAdvertise() {
const status = useAuthStore(state => state.status)
const { openModal } = useModal()

useEffect(() => {
const isActive = status === AuthStatus.Active
const isDue = isAfter(Date.now(), DUE_DATE)
if ([isActive, !isDue].every(Boolean)) openModal({ modal: <AdvertisingModal /> })
}, [status])
}
\*/
