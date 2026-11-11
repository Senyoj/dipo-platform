# Administration

Apply the admin migration after the memberships and sales migrations. Sign in as an existing platform superadmin and open /admin. Create a distributor, select it, and assign the owner role to an existing Supabase Auth account by email.

Platform superadmins can see all distributors and their assigned staff. Distributor owners manage staff only in their own distributors. Owner assignment and removal are reserved for platform superadmins. Staff accounts must already exist in Supabase Auth.

The sales register remains available on the main page to assigned selling roles. Stock allocation is still configured in Supabase. Purchasing, warehouse operations, dispatch and trip management, collections, and auditing workflows need their own implementations.
