# Administration

Apply the admin migration after the memberships and sales migrations. Sign in as an existing platform superadmin and open /admin. Create a distributor, select it, and assign the owner role to an existing Supabase Auth account by email.

Platform superadmins can see all distributors and their assigned staff. Distributor owners manage staff only in their own distributors. Owner assignment and removal are reserved for platform superadmins. Staff accounts must already exist in Supabase Auth.

The sales register remains available on the main page to assigned selling roles. Stock allocation is still configured in Supabase. Purchasing, warehouse operations, dispatch and trip management, collections, and auditing workflows need their own implementations.

## Platform dashboard

Apply the platform dashboard migration after the admin migration. Open /admin as a platform superadmin. Live platform lists organizations, Auth users, staff roles, selling stock allocations, posted sales and platform admins. Account records expose operational identity fields. Auth credentials and tokens are excluded.

Select Demo data to see the sample records installed automatically by the migration. Samples are stored separately from operational records. They do not create Auth users, grant roles or change live inventory. Switch to Live platform to manage actual distributors and staff.

Live records are paginated. Purchasing, dispatch and collections will need dashboard sections once those records exist in Dipo.
