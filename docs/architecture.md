# Dipo architecture

This initial foundation contains the membership migration and offline sale outbox.

## Access

Platform superadmins live in a separate table. Tenant staff may have several roles. The initial migration grants authenticated users read-only access to their own memberships. Privileged role assignment and business operations still need server-side authorization and audit logging.

## Offline sales

Record each sale under a device-generated UUID. Persist it before acknowledging capture. Upload pending records for the authenticated organization and operator when connectivity returns, on app launch, and when the app returns to the foreground. A server acknowledgement is required before deleting an event. A production sync endpoint and conflict review UI remain to be implemented.

Allocate stock to each van or offline register before it starts selling. Two disconnected devices cannot safely promise the same last item. The server must validate the allocation and sale prices, apply stock movements and payments in one transaction, and enforce uniqueness on the tenant and event UUID. Keep rejected or disputed sales visible until staff resolve them.

## Planned modules

Purchasing, receiving, inventory, pricing, orders, point of sale, outlets, dispatch, delivery, returns, collections, reconciliation, organization administration, and platform administration.

## Typography

Use licensed Mosvita web assets. Confirm the publisher's terms for web embedding, offline caching, and repository distribution before committing font files.
