import { Schema, SchemaType } from 'mongoose';

/**
 * Represents a collection of schema path.
 */
export class SchemaTrees {
  private modelTree: Map<string, SchemaPath>;
  private collectionToModel: Map<string, string>;

  /**
   * Creates an instance of SchemaTrees.
   * Initializes the modelTree and collectionToModel maps.
   */
  constructor() {
    this.modelTree = new Map();
    this.collectionToModel = new Map();
  }

  /**
   * Adds a schema path to the modelTree map and the mapping between collection name and model name to the collectionToModel map.
   * @param collectionName - The name of the collection.
   * @param modelName - The name of the model.
   * @param schemaPaths - The schema paths to be added.
   */
  addSchemaPath(
    collectionName: string,
    modelName: string,
    schema: Schema
  ): void {
    const schemaPath = this.readSchemaPath(schema);
    this.modelTree.set(modelName, schemaPath);
    this.collectionToModel.set(collectionName, modelName);
  }

  /**
   * Retrieves the schema paths from the modelTree map based on the given model name.
   * @param modelName - The name of the mongoose model.
   * @returns The schema paths associated with the model name.
   */
  getSchemaPath(modelName: string): SchemaPath | undefined {
    return this.modelTree.get(modelName);
  }

  /**
   * Retrieves the schema path from the modelTree map based on the given collection name.
   * @param collectionName - The name of the collection.
   * @returns The schema path associated with the collection name.
   */
  getSchemaPathFromCollectionName(
    collectionName: string
  ): SchemaPath | undefined {
    const modelName = this.collectionToModel.get(collectionName);
    return this.modelTree.get(modelName);
  }

  /**
   * Retrieves the model name from the collectionToModel map based on the given collection name.
   * @param collectionName - The name of the collection.
   * @returns The model name associated with the collection name.
   */
  getModelName(collectionName: string): string | undefined {
    return this.collectionToModel.get(collectionName);
  }

  private readSchemaPath = (
    schema: Schema,
    _pre: String = '',
    paths: SchemaPath = {}
  ) => {
    schema.eachPath((path, schemaType) => {
      if (path.match(/\./)) {
        const [pathName] = path.split('.');
        paths[pathName] = {
          instance: 'Embedded',
        };
      }
      if (schemaType.instance === 'Embedded') {
        paths = {
          ...paths,
          [schemaType.path]: {
            instance: schemaType.instance,
          },
          ...this.readSchemaPath(
            schemaType.schema,
            `${_pre}${schemaType.path}.`
          ),
        };
      } else if (schemaType.instance === 'Array') {
        const innerType = (schemaType as any).$embeddedSchemaType as SchemaType;
        switch (innerType.instance) {
          case 'DocumentArrayElement':
            paths = {
              ...paths,
              [schemaType.path]: {
                instance: schemaType.instance,
                type: innerType.instance,
              },
              ...this.readSchemaPath(
                innerType.schema,
                `${_pre}${schemaType.path}.`
              ),
            };
            break;
          default:
            paths[schemaType.path] = {
              instance: schemaType.instance,
              type: innerType.instance,
              ...(innerType.options.ref && { ref: innerType.options.ref }),
            };
        }
      } else
        paths[`${_pre}${path}`] = {
          instance: schemaType.instance,
          ...(schemaType.options.ref && { ref: schemaType.options.ref }),
        };
    });
    return paths;
  };
}

export type SchemaPath = {
  [key: string]: {
    path?: string;
    instance: string;
    ref?: string;
    type?: string;
  };
};
