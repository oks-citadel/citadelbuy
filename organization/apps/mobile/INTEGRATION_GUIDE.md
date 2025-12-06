# Mobile App Integration Guide

## Quick Integration Steps

This guide provides the exact code changes needed to integrate the new ProfileEditScreen and TrackOrderScreen into your React Native mobile app.

## Step 1: Update Auth Store

**File:** `src/stores/auth-store.ts`

### Add fields to User interface:
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  // Add these new fields:
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
}
```

### Add setUser method to AuthState interface:
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => Promise<void>; // ✨ ADD THIS
}
```

### Implement setUser in the store:
```typescript
export const useAuthStore = create<AuthState>((set, get) => ({
  // ... existing state

  // ... existing methods

  // Add this method before clearError:
  setUser: async (user: User) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  clearError: () => set({ error: null }),
}));
```

## Step 2: Update Navigation Types

**File:** `src/navigation/RootNavigator.tsx`

### Add import statements (after existing account imports):
```typescript
// Account Screens
import AccountScreen from '../screens/account/AccountScreen';
import OrdersScreen from '../screens/account/OrdersScreen';
import OrderDetailScreen from '../screens/account/OrderDetailScreen';
import WishlistScreen from '../screens/account/WishlistScreen';
import AddressesScreen from '../screens/account/AddressesScreen';
import SettingsScreen from '../screens/account/SettingsScreen';
import NotificationsScreen from '../screens/account/NotificationsScreen';
import ProfileEditScreen from '../screens/account/ProfileEditScreen'; // ✨ ADD THIS
import TrackOrderScreen from '../screens/account/TrackOrderScreen'; // ✨ ADD THIS
```

### Update AccountStackParamList type:
```typescript
export type AccountStackParamList = {
  AccountMain: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Wishlist: undefined;
  Addresses: undefined;
  Settings: undefined;
  Notifications: undefined;
  MyReviews: undefined;
  ProfileEdit: undefined; // ✨ ADD THIS
  TrackOrder: { orderId: string }; // ✨ ADD THIS
};
```

### Add screens to AccountNavigator function:
```typescript
function AccountNavigator() {
  return (
    <AccountStack.Navigator>
      <AccountStack.Screen
        name="AccountMain"
        component={AccountScreen}
        options={{ title: 'My Account' }}
      />
      {/* ✨ ADD THIS - Place after AccountMain */}
      <AccountStack.Screen
        name="ProfileEdit"
        component={ProfileEditScreen}
        options={{ title: 'Edit Profile' }}
      />
      <AccountStack.Screen name="Orders" component={OrdersScreen} />
      <AccountStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
      {/* ✨ ADD THIS - Place after OrderDetail */}
      <AccountStack.Screen
        name="TrackOrder"
        component={TrackOrderScreen}
        options={{ title: 'Track Order' }}
      />
      <AccountStack.Screen name="Wishlist" component={WishlistScreen} />
      <AccountStack.Screen name="Addresses" component={AddressesScreen} />
      <AccountStack.Screen name="Settings" component={SettingsScreen} />
      <AccountStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <AccountStack.Screen
        name="MyReviews"
        component={MyReviewsScreen}
        options={{ title: 'My Reviews' }}
      />
    </AccountStack.Navigator>
  );
}
```

## Step 3: Link Profile Edit Navigation

**File:** `src/screens/account/AccountScreen.tsx`

### Update the profile section to be clickable:
```typescript
// Find this code (around line 86-101):
<View style={styles.header}>
  <TouchableOpacity style={styles.profileSection}> {/* Change View to TouchableOpacity */}
    {/* existing profile content */}
  </TouchableOpacity>
</View>

// Replace with:
<View style={styles.header}>
  <TouchableOpacity
    style={styles.profileSection}
    onPress={() => navigation.navigate('ProfileEdit')} // ✨ ADD THIS
  >
    <View style={styles.avatar}>
      {user?.avatar ? (
        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
      ) : (
        <Text style={styles.avatarText}>
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      )}
    </View>
    <View style={styles.profileInfo}>
      <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
      <Text style={styles.profileEmail}>{user?.email || 'guest@example.com'}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
  </TouchableOpacity>
  {/* Rest of header content */}
</View>
```

## Step 4: Link Track Order Navigation

**Option A: From OrdersScreen.tsx**

Add track button functionality:
```typescript
// Find the track button (around line 150-155):
{item.status === 'shipped' && (
  <TouchableOpacity
    style={styles.trackButton}
    onPress={() => navigation.navigate('TrackOrder', { orderId: item.id })} // ✨ ADD onPress
  >
    <Ionicons name="location-outline" size={16} color="#6366f1" />
    <Text style={styles.trackButtonText}>Track Order</Text>
  </TouchableOpacity>
)}
```

**Option B: From OrderDetailScreen.tsx**

Add track link to header:
```typescript
// Add after the status section (around line 125):
<View style={styles.sectionHeader}>
  <Text style={styles.sectionTitle}>Order Tracking</Text>
  <TouchableOpacity
    onPress={() => navigation.navigate('TrackOrder', { orderId: orderId })} // ✨ ADD THIS
  >
    <Text style={styles.trackLink}>View Map</Text> {/* ✨ CHANGE TEXT */}
  </TouchableOpacity>
</View>
```

## Step 5: Install Required Dependencies

If you haven't already installed these dependencies, run:

```bash
# For maps functionality
npm install react-native-maps

# For image picker
npx expo install expo-image-picker

# For camera
npx expo install expo-camera
```

## Step 6: Update app.json (for iOS/Android permissions)

**File:** `app.json`

Add permissions for camera and photo library:

```json
{
  "expo": {
    "name": "CitadelBuy",
    "slug": "citadelbuy-mobile",
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "The app needs access to your photos to update your profile picture.",
          "cameraPermission": "The app needs access to your camera to take profile pictures."
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "The app needs access to your camera to take profile pictures.",
        "NSPhotoLibraryUsageDescription": "The app needs access to your photos to update your profile picture."
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

## Step 7: Test the Integration

### Test Profile Edit:
1. Open the app
2. Navigate to Account tab
3. Tap on profile section at the top
4. Should navigate to Profile Edit screen
5. Test photo upload (camera and library)
6. Fill in form fields
7. Tap Save
8. Should return to Account screen with updated data

### Test Track Order:
1. Navigate to Orders screen
2. Find an order with "Shipped" status
3. Tap "Track Order" button
4. Should navigate to Track Order screen
5. Verify map displays (if available)
6. Check timeline shows tracking events
7. Test "Track on [Carrier]" button
8. Test pull-to-refresh

## Troubleshooting

### Map not showing:
- Ensure `react-native-maps` is installed
- Check Google Maps API key is configured (Android)
- Check Apple Maps is enabled (iOS)

### Image picker not working:
- Verify permissions are granted
- Check app.json has correct permissions
- Test on physical device (camera won't work on simulator)

### Navigation errors:
- Ensure all imports are correct
- Check navigation types match exactly
- Verify screen names in navigator match ParamList

### TypeScript errors:
- Run `npx tsc --noEmit` to check types
- Ensure all interfaces are exported/imported correctly
- Check navigation prop types match

## Verification Checklist

- [ ] Auth store updated with User fields and setUser method
- [ ] Navigation types updated with new screens
- [ ] ProfileEditScreen imported in RootNavigator
- [ ] TrackOrderScreen imported in RootNavigator
- [ ] Screens added to AccountNavigator
- [ ] Profile section in AccountScreen is clickable
- [ ] Track button in OrdersScreen navigates correctly
- [ ] Dependencies installed (maps, image-picker, camera)
- [ ] Permissions configured in app.json
- [ ] App builds without errors
- [ ] Navigation works on device/simulator
- [ ] Forms validate and submit correctly
- [ ] Images can be selected/captured
- [ ] Maps display tracking information

## Additional Notes

### Mock Data
Both new screens use mock data by default. To connect to real APIs:
- ProfileEditScreen: Update `profileApi.updateProfile()` endpoint
- TrackOrderScreen: Update `ordersApi.trackOrder()` endpoint

### Styling
Both screens follow the existing design system:
- Colors match the app's color palette
- Spacing is consistent
- Typography follows guidelines
- Components are reusable

### Future Enhancements
- Add date picker for date of birth
- Add photo cropping functionality
- Add real-time map updates via WebSocket
- Add notifications for tracking updates
- Add offline support for profile data
- Add profile photo compression

---

**Need Help?**
If you encounter any issues during integration, check:
1. Console logs for error messages
2. TypeScript compiler output
3. Metro bundler logs
4. React Navigation documentation

**Integration Time:** Approximately 30-45 minutes
**Difficulty:** Intermediate
