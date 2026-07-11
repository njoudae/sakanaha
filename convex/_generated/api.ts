/* eslint-disable */
/**
 * Generated API helpers.
 *
 * This file follows Convex's generated API helper shape. Re-run
 * `npx convex codegen` after configuring a Convex deployment.
 */

import { anyApi } from "convex/server";
import type { FilterApi, FunctionReference } from "convex/server";

const fullApi = anyApi;

export const api: FilterApi<typeof fullApi, FunctionReference<any, "public">> = anyApi as any;
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;
