import { getProperties, getPublishedProperties } from "../services/propertyService";
import { getCurrentOwner, getCurrentUser } from "../services/userService";
import type { ReadOnlyDataAdapter } from "./dataAdapter";

export const localStorageDataAdapter: ReadOnlyDataAdapter = {
  kind: "localStorage",
  getCurrentOwner,
  getCurrentUser,
  getProperties,
  getPublishedProperties,
};
