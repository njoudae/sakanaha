/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as agents from "../agents.js";
import type * as auth from "../auth.js";
import type * as authSecurity from "../authSecurity.js";
import type * as bookings from "../bookings.js";
import type * as bootstrap from "../bootstrap.js";
import type * as business from "../business.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as interests from "../interests.js";
import type * as lib_authorization from "../lib/authorization.js";
import type * as lib_businessEvents from "../lib/businessEvents.js";
import type * as maps from "../maps.js";
import type * as mapsCache from "../mapsCache.js";
import type * as mapsHealth from "../mapsHealth.js";
import type * as mapsUsage from "../mapsUsage.js";
import type * as media from "../media.js";
import type * as mediaCleanup from "../mediaCleanup.js";
import type * as mediaState from "../mediaState.js";
import type * as mediaSupport from "../mediaSupport.js";
import type * as notificationDelivery from "../notificationDelivery.js";
import type * as notificationState from "../notificationState.js";
import type * as notificationSupport from "../notificationSupport.js";
import type * as notifications from "../notifications.js";
import type * as observability from "../observability.js";
import type * as observabilitySupport from "../observabilitySupport.js";
import type * as payments from "../payments.js";
import type * as properties from "../properties.js";
import type * as propertyLocations from "../propertyLocations.js";
import type * as roommates from "../roommates.js";
import type * as seed from "../seed.js";
import type * as sms from "../sms.js";
import type * as smsHealth from "../smsHealth.js";
import type * as smsState from "../smsState.js";
import type * as submissions from "../submissions.js";
import type * as universities from "../universities.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";
import type * as validators from "../validators.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  agents: typeof agents;
  auth: typeof auth;
  authSecurity: typeof authSecurity;
  bookings: typeof bookings;
  bootstrap: typeof bootstrap;
  business: typeof business;
  crons: typeof crons;
  http: typeof http;
  identity: typeof identity;
  interests: typeof interests;
  "lib/authorization": typeof lib_authorization;
  "lib/businessEvents": typeof lib_businessEvents;
  maps: typeof maps;
  mapsCache: typeof mapsCache;
  mapsHealth: typeof mapsHealth;
  mapsUsage: typeof mapsUsage;
  media: typeof media;
  mediaCleanup: typeof mediaCleanup;
  mediaState: typeof mediaState;
  mediaSupport: typeof mediaSupport;
  notificationDelivery: typeof notificationDelivery;
  notificationState: typeof notificationState;
  notificationSupport: typeof notificationSupport;
  notifications: typeof notifications;
  observability: typeof observability;
  observabilitySupport: typeof observabilitySupport;
  payments: typeof payments;
  properties: typeof properties;
  propertyLocations: typeof propertyLocations;
  roommates: typeof roommates;
  seed: typeof seed;
  sms: typeof sms;
  smsHealth: typeof smsHealth;
  smsState: typeof smsState;
  submissions: typeof submissions;
  universities: typeof universities;
  userProfiles: typeof userProfiles;
  users: typeof users;
  validators: typeof validators;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {};
