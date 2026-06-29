import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard, GuestGuard } from '@/components/layout/AuthGuard';
import ErrorBoundary from '@/components/ErrorBoundary';

// Onboarding
import SplashScreen  from '@/pages/onboarding/SplashScreen';
import LoginPage     from '@/pages/onboarding/LoginPage';
import OTPPage       from '@/pages/onboarding/OTPPage';
import KYCPage       from '@/pages/onboarding/KYCPage';

// Discovery
import HomePage      from '@/pages/discovery/HomePage';
import SearchPage    from '@/pages/discovery/SearchPage';

// Renter journey
import ProductDetail     from '@/pages/renter/ProductDetail';
import SelectDates       from '@/pages/renter/SelectDates';
import CheckoutPage      from '@/pages/renter/CheckoutPage';
import PaymentSuccess    from '@/pages/renter/PaymentSuccess';
import RentalTracking    from '@/pages/renter/RentalTracking';
import MyRentals         from '@/pages/renter/MyRentals';
import CalendarPage      from '@/pages/renter/CalendarPage';

// Post-rental
import ReturnPhotoUpload from '@/pages/post-rental/ReturnPhotoUpload';
import ReviewRating      from '@/pages/post-rental/ReviewRating';

// Profile
import ProfilePage   from '@/pages/profile/ProfilePage';
import EditProfile   from '@/pages/profile/EditProfile';
import SettingsPage  from '@/pages/profile/SettingsPage';
import PaymentMethods from '@/pages/profile/PaymentMethods';
import HelpSupport   from '@/pages/profile/HelpSupport';
import SavedOutfits  from '@/pages/profile/SavedOutfits';

// Notifications
import NotificationsPage from '@/pages/notifications/NotificationsPage';

// Seller
import SellerDashboard  from '@/pages/seller/SellerDashboard';
import OrderManagement  from '@/pages/seller/OrderManagement';
import SmartCalendar    from '@/pages/seller/SmartCalendar';
import ResolutionCenter from '@/pages/seller/ResolutionCenter';
import AddProduct       from '@/pages/seller/AddProduct';
import MyWallet         from '@/pages/seller/MyWallet';
import ShopOnboarding   from '@/pages/seller/ShopOnboarding';
import OrderDetail      from '@/pages/seller/OrderDetail';
import MyListings       from '@/pages/seller/MyListings';
import EditProduct      from '@/pages/seller/EditProduct';

function OAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const accessToken  = params.get('accessToken');
  const refreshToken = params.get('refreshToken');
  if (accessToken) {
    const raw = localStorage.getItem('cosaki-auth') || '{"state":{}}';
    const store = JSON.parse(raw);
    store.state.accessToken  = accessToken;
    store.state.refreshToken = refreshToken;
    localStorage.setItem('cosaki-auth', JSON.stringify(store));
  }
  return <Navigate to="/home" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen justify-center bg-gray-200">
        <Routes>
          {/* Public */}
          <Route path="/"              element={<SplashScreen />} />
          <Route path="/auth/callback" element={<OAuthCallback />} />

          {/* Guest only */}
          <Route element={<GuestGuard />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/otp"   element={<OTPPage />} />
          </Route>

          {/* Protected */}
          <Route element={<AuthGuard />}>
            {/* Onboarding */}
            <Route path="/kyc"              element={<KYCPage />} />
            <Route path="/seller/onboarding" element={<ShopOnboarding />} />

            {/* Renter main */}
            <Route path="/home"     element={<HomePage />} />
            <Route path="/search"   element={<SearchPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/settings"     element={<SettingsPage />} />
            <Route path="/payments"     element={<PaymentMethods />} />
            <Route path="/support"      element={<HelpSupport />} />
            <Route path="/saved"        element={<SavedOutfits />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/rentals"  element={<MyRentals />} />

            {/* Renter journey */}
            <Route path="/items/:id"                         element={<ProductDetail />} />
            <Route path="/items/:id/dates"                   element={<SelectDates />} />
            <Route path="/bookings/:bookingId/checkout"      element={<CheckoutPage />} />
            <Route path="/bookings/:bookingId/success"       element={<PaymentSuccess />} />
            <Route path="/bookings/:bookingId/tracking"      element={<RentalTracking />} />
            <Route path="/bookings/:bookingId/return-upload" element={<ReturnPhotoUpload />} />
            <Route path="/bookings/:bookingId/review"        element={<ReviewRating />} />

            {/* Seller */}
            <Route path="/seller/dashboard"         element={<SellerDashboard />} />
            <Route path="/seller/orders"            element={<OrderManagement />} />
            <Route path="/seller/orders/:id"        element={<OrderDetail />} />
            <Route path="/seller/calendar"          element={<SmartCalendar />} />
            <Route path="/seller/wallet"            element={<MyWallet />} />
            <Route path="/seller/items"             element={<MyListings />} />
            <Route path="/seller/items/new"         element={<AddProduct />} />
            <Route path="/seller/items/:id/edit"    element={<EditProduct />} />
            <Route path="/seller/disputes/:bookingId" element={<ResolutionCenter />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}
