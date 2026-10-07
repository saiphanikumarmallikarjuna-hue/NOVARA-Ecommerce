# NOVARA Ecommerce - Updated Version

## Added features
- Cash on Delivery (COD)
- UPI checkout flow
- Debit/Credit card checkout validation (demo flow)
- Customer order history / previous orders
- Stock-aware Add to Bag and quantity controls
- Backend transaction-level stock validation
- Automatic stock reduction after successful order
- Admin Edit Product feature
- Existing Admin Delete Product feature retained
- Existing login, registration and admin dashboard retained

## Important payment note
UPI and card checkout in this student project are **demo payment flows**. Card number/CVV are validated but never stored. For real online payments, connect a payment gateway such as Razorpay or Stripe and verify the gateway response on the server before marking an order as paid.

## Run
1. Open the project folder in PowerShell.
2. Run `npm install` if `node_modules` is not present.
3. Make sure MySQL is running and the database is `novara_store`.
4. Keep the existing tables (`users`, `products`, `orders`, `order_items`).
5. Run `npm start`.
6. Open `http://localhost:3000`.
7. Admin: open `http://localhost:3000/admin.html` and use the credentials in `.env`.

On first startup, the server attempts to add the new payment columns to the existing `orders` table. If those columns already exist, nothing is changed.


## Bug fixes and improvements
- Fixed the Orders modal close button and overlay behavior.
- Added independent scrolling for previous orders and the shopping bag.
- Prevented the page behind checkout/orders from scrolling while a panel is open.
- Added responsive payment and order-history scrolling for desktop and mobile.
- Added UPI format validation.
- Added 16-digit Luhn card validation and future expiry validation.
- Added server-side payment validation as a second safety check.
- Prevented duplicate product IDs in a manipulated cart request from bypassing stock checks.
- Prevented double-clicking the Place Order button from submitting twice.
- Added card number formatting, expiry formatting, and CVV input restrictions.
- Explicitly sets new orders to Pending status.
- Added `novara_store.sql` for creating the required database/tables from scratch.

## Payment clarification
COD is an actual order method in this local project. UPI and card are **demo/simulated payment flows**: the project does not connect to a bank or payment gateway and does not charge real money. To accept real payments, a gateway such as Razorpay or Stripe must be integrated with server-side signature/payment verification.
