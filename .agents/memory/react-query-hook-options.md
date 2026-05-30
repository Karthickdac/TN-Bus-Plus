---
name: React Query hook options
description: Orval-generated React Query hooks in tnbus-web need an explicit queryKey when passing query options.
---

When calling an Orval-generated query hook (e.g. `useGetBusLocation`, `useGetFleetLocations`) and you pass any `query` options such as `enabled` or `refetchInterval`, you must also pass `queryKey` using the generated key helper, e.g.:

```ts
useGetBusLocation(busId, {
  query: { enabled: !!busId, refetchInterval: 4000, queryKey: getGetBusLocationQueryKey(busId) },
});
```

**Why:** the installed `@tanstack/react-query` typings make `UseQueryOptions` require `queryKey`; omitting it raises `TS2741: Property 'queryKey' is missing`. Some pre-existing pages (BusDetail, PNR) omit it and already fail typecheck — match the working pattern in SavedRoutes/Profile that includes the key helper instead.

**How to apply:** any new generated-hook call that customizes query behavior should import the matching `getXxxQueryKey` from `@workspace/api-client-react` and pass it.
