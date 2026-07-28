import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DefinitionNode,
  GraphQLInterfaceType,
  GraphQLSchema,
  Kind,
  buildASTSchema,
  extendSchema,
  parse,
} from "graphql";

const EXTENSION_KINDS: ReadonlySet<string> = new Set([
  Kind.SCHEMA_EXTENSION,
  Kind.SCALAR_TYPE_EXTENSION,
  Kind.OBJECT_TYPE_EXTENSION,
  Kind.INTERFACE_TYPE_EXTENSION,
  Kind.UNION_TYPE_EXTENSION,
  Kind.ENUM_TYPE_EXTENSION,
  Kind.INPUT_OBJECT_TYPE_EXTENSION,
]);

const collectGraphqlsFiles = (dir: string): string[] =>
  readdirSync(dir)
    .map((entry) => join(dir, entry))
    .flatMap((entryPath) => {
      if (statSync(entryPath).isDirectory()) {
        return collectGraphqlsFiles(entryPath);
      }
      return entryPath.endsWith(".graphqls") ? [entryPath] : [];
    })
    .sort();

/**
 * Builds an executable schema from the `.graphqls` files in the
 * schema.miyamo.today submodule, so the mock never drifts from the real API.
 */
export const loadBlogApiSchema = (schemaDir: string): GraphQLSchema => {
  if (!existsSync(schemaDir)) {
    throw new Error(
      `schema directory not found: ${schemaDir}\n` +
        "run `git submodule update --init` to fetch schema.miyamo.today"
    );
  }
  const files = collectGraphqlsFiles(schemaDir);
  if (files.length === 0) {
    throw new Error(`no .graphqls files found under: ${schemaDir}`);
  }
  const document = parse(files.map((f) => readFileSync(f, "utf-8")).join("\n"));

  const baseDefinitions: DefinitionNode[] = [];
  const extensionDefinitions: DefinitionNode[] = [];
  for (const definition of document.definitions) {
    if (!EXTENSION_KINDS.has(definition.kind)) {
      baseDefinitions.push(definition);
      continue;
    }
    // The base schema already declares query/mutation, so re-declaring them
    // via `extend schema` would fail; every other extension is applied as-is.
    if (definition.kind !== Kind.SCHEMA_EXTENSION) {
      extensionDefinitions.push(definition);
    }
  }

  let schema = buildASTSchema(
    { kind: Kind.DOCUMENT, definitions: baseDefinitions },
    { assumeValidSDL: true }
  );
  if (extensionDefinitions.length > 0) {
    schema = extendSchema(
      schema,
      { kind: Kind.DOCUMENT, definitions: extensionDefinitions },
      { assumeValidSDL: true }
    );
  }

  const node = schema.getType("Node");
  if (node instanceof GraphQLInterfaceType) {
    node.resolveType = (value: { __typename?: string }) => value?.__typename;
  }
  return schema;
};
