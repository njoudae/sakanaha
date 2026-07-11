/* eslint-disable */
/**
 * Generated data model types.
 *
 * This file follows Convex's dynamic generated type shape. Re-run
 * `npx convex codegen` after configuring a Convex deployment.
 */

import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  SystemTableNames,
  TableNamesInDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";
import schema from "../schema.js";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export type TableNames = TableNamesInDataModel<DataModel>;

export type Doc<TableName extends TableNames> = DocumentByName<DataModel, TableName>;

export type Id<TableName extends TableNames | SystemTableNames> = GenericId<TableName>;
