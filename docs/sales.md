# Sign-in and sales

Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY before building. Apply the migrations in timestamp order. Use Supabase Auth to provision test staff and assign their memberships as a database administrator. A platform administrator row enables platform role visibility. It does not confer selling authority. Cashiers sell counter stock, drivers sell van stock, and owners, operations managers and sales staff may use both with stock assigned.

Seed selling_stock with the tenant, operator, location, SKU, channel, display label, starting quantity and integer price in pesewas. Allocate independent physical stock per operator and use a single device per allocation until device assignment is implemented. Inventory intake, allocation management, payments, historical sale review and admin management screens are pending.

Sign in online and load allocated stock before going offline. Once the service worker controls the page, reload online to populate the application shell cache before testing a cold offline launch. Use a modern HTTPS browser with IndexedDB and Web Locks. Offline sessions require cached authorization on the same browser profile. The server rechecks permissions on sync.

The register saves one SKU per sale locally and syncs when online, on focus or on demand. The SQL function accepts several lines, checks role and allocation price, and updates stock and the sale in one transaction. A repeated identical event returns its original ID. A failed event remains on the device and is reported. Resolve the first blocked event before later events can sync.

Verify in staging with a cashier, driver, auditor and separate tenant. Check sign-in, role restrictions, a queued sale during a network outage, reconnect, duplicate retry, insufficient stock, and a sale attempt from a different account. Do not clear browser storage while sales are queued.
