import { AccessControl } from 'accesscontrol';
import {
  CallbackWithoutResultAndOptionalError,
  FilterQuery,
  Model,
  ProjectionType,
  Query,
  QueryOptions,
  QueryWithHelpers,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
  HydratedDocument,
  PipelineStage,
  AggregateOptions,
  SaveOptions,
  AnyKeys,
  model,
} from 'mongoose';
import { Schema } from 'mongoose';
import { getAllowedFields, getModelName } from './utils';
import IAccessControl from './acl/IAccessControl';
import { getAccessiblePopulate } from './helper/populateHelper';
import { IQuery } from './acl/IAccess';
import { getUpdatedPath } from './helper/updateHelper';
import { accessibleAggregation } from './core/aggrigation';
import { SchemaTrees } from './SchemaTree';
import { accessibleCreate } from './helper/createHelper';
export default function MongooseAccessControl({
  grantList,
  superAdminRoleNames = ['superAdmin', 'admin', '*'],
}: {
  grantList: IAccessControl;
  superAdminRoleNames?: string[];
}) {
  const schemaTrees = new SchemaTrees();

  function getRoleAccess(
    options: QueryOptions | AggregateOptions,
    next: CallbackWithoutResultAndOptionalError
  ): { role: string; roleAccess: IQuery } | any {
    const hasRole = Object.prototype.hasOwnProperty.call(options, 'role');
    const role = options.role;
    if (!hasRole || superAdminRoleNames.includes(role)) {
      next();
      return { role: 'superAdmin', roleAccess: null };
    }
    if (!role) next(new Error('User has no role'));
    const roleAccess = grantList.getGrant(role);
    return { role, roleAccess };
  }

  return (schema: Schema) => {
    schema.statics.m1 = function(w) {
      console.log('m1', w, this);
      this['role'] = w;
      return this;
    };
    schema.statics.withAccess = function(role: String) {
      const schema = this;
      return {
        create<T>(
          doc: Array<AnyKeys<T>> | AnyKeys<T>,
          options?: SaveOptions | null | undefined
        ) {
          console.log({ doc });
          return schema.create(doc, { ...options, role });
        },

        find<ResultDoc, TQueryHelpers, TRawDocType>(
          filter: FilterQuery<TRawDocType>,
          projection?: ProjectionType<TRawDocType> | null | undefined,
          options?: QueryOptions<TRawDocType> | null | undefined
        ): QueryWithHelpers<
          Array<ResultDoc>,
          ResultDoc,
          TQueryHelpers,
          TRawDocType,
          'find'
        > {
          type f = ReturnType<typeof schema.find>;
          return schema.find(filter, projection, { ...options, role });
        },
        findOne<TQueryHelpers = {}, TRawDocType = {}, ResultDoc = {}>(
          filter: FilterQuery<TRawDocType>,
          projection?: ProjectionType<TRawDocType> | null | undefined,
          options?: QueryOptions<TRawDocType> | null | undefined
        ): Query<unknown, unknown, {}, ResultDoc, 'findById'> {
          return schema.findOne(filter, projection, { ...options, role });
        },
        findById<ResultDoc>(
          id: any,
          projection?: ProjectionType<Schema> | null | undefined,
          options?: QueryOptions<Schema> | null | undefined
        ): Query<unknown, unknown, {}, ResultDoc, 'findById'> {
          return schema.findById(id, projection, { ...options, role });
        },
        // delete queries
        deleteOne<ResultDoc>(
          filter: FilterQuery<Schema>,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'deleteOne'
        > {
          return schema.deleteOne(filter, { ...options, role });
        },
        deleteMany<ResultDoc>(
          filter: FilterQuery<Schema>,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'deleteMany'
        > {
          return schema.deleteMany(filter, { ...options, role });
        },
        // delete with return document
        findByIdAndDelete<ResultDoc>(
          id: any,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'findByIdAndDelete'
        > {
          return schema.findByIdAndDelete(id, { ...options, role }); // has no schema pre hook
        },
        findOneAndDelete<ResultDoc>(
          filter: FilterQuery<Schema>,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'findOneAndDelete'
        > {
          return schema.findOneAndDelete(filter, { ...options, role });
        },
        findOneAndRemove<ResultDoc>(
          filter: FilterQuery<Schema>,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'findOneAndRemove'
        > {
          return schema.findOneAndRemove(filter, { ...options, role });
        },
        findOneAndUpdate<ResultDoc>(
          filter?: FilterQuery<Schema>,
          update?: UpdateQuery<Schema>,
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<
          ResultDoc | null,
          ResultDoc,
          any,
          any,
          'findOneAndDelete'
        > {
          return schema.findOneAndUpdate(filter, update, { ...options, role });
        },
        updateOne<ResultDoc>(
          filter?: FilterQuery<Schema>,
          update?: UpdateQuery<Schema> | UpdateWithAggregationPipeline,
          options?: QueryOptions<Schema> | null
        ): QueryWithHelpers<
          UpdateWriteOpResult,
          ResultDoc,
          any,
          any,
          'updateOne'
        > {
          return schema.updateOne(filter, update, { ...options, role });
        },
        updateMany<ResultDoc>(
          filter?: FilterQuery<Schema>,
          update?: UpdateQuery<Schema> | UpdateWithAggregationPipeline,
          options?: QueryOptions<Schema> | null
        ): QueryWithHelpers<
          UpdateWriteOpResult,
          ResultDoc,
          any,
          any,
          'updateMany'
        > {
          return schema.updateMany(filter, update, { ...options, role });
        },
        aggregate(pipeline: PipelineStage[], options: AggregateOptions) {
          return schema.aggregate(pipeline, { ...options, role });
        },
      };
      // --END delete with return document
    };

    schema.methods.withAccess = function(
      role: String,
      mode: 'strict' | 'lazy' = 'strict'
    ) {
      const doc = this;
      return {
        save<ResultDoc>(
          options?: QueryOptions<Schema> | null | undefined
        ): QueryWithHelpers<ResultDoc | null, ResultDoc, any, any, 'save'> {
          const resource = doc.collection.modelName;
          const { roleAccess } = getRoleAccess({ role }, error => {
            if (error) throw error;
            return doc.save();
          });
          const accessibleDoc = accessibleCreate({
            doc: doc._doc,
            roleAccess,
            resource,
            mode,
          });
          doc._doc = accessibleDoc;
          return doc.save();
        },
      };
    };
    schema.pre(['find', 'findOne'], function(next) {
      const options = this.getOptions();
      const resource = getModelName(this);
      const hasRole = Object.prototype.hasOwnProperty.call(this.model, 'role');
      const role = (this.model as any).role;
      if (!hasRole || superAdminRoleNames.includes(role)) return next();
      if (!role) next(new Error('User has no role'));
      const roleAccess = grantList.getGrant(role);
      const access = getRoleAccess(options, next);
      // check if role has access to read this resource
      const readAccess = roleAccess.canRead({ resource });
      if (!readAccess.granted)
        next(new Error(role + ' has no access to read ' + resource));

      attachAccessibleReadQuery({
        query: this,
        roleAccess,
        resource,
        schemaTrees,
      });
      next();
    });

    schema.pre(['findOneAndDelete', 'findOneAndRemove'], function(next) {
      const options = this.getOptions();
      const resource = getModelName(this);
      const { role, roleAccess } = getRoleAccess(options, next);
      // check if role has access to read this resource
      const deleteAccess = roleAccess.canDelete({ resource });
      if (!deleteAccess.granted)
        next(new Error(role + ' has no access to read ' + resource));
      attachAccessibleReadQuery({
        query: this,
        roleAccess,
        resource,
        schemaTrees,
      });
      next();
    });

    schema.pre(['deleteOne', 'deleteMany'], function(next) {
      const options = this.getOptions();
      const resource = getModelName(this);
      const { role, roleAccess } = getRoleAccess(options, next);
      // check if role has access to delete this resource
      const deleteAccess = roleAccess.canDelete({ resource });
      if (!deleteAccess.granted)
        next(new Error(role + ' has no access to delete ' + resource));
      next();
    });

    schema.pre(['updateOne', 'updateMany'], function(next) {
      const options = this.getOptions();
      const resource = getModelName(this);
      const { role, roleAccess } = getRoleAccess(options, next);
      // check if role has access to delete this resource
      const updateAccess = roleAccess.canUpdate({ resource });
      if (!updateAccess.granted)
        return next(new Error(role + ' has no access to update ' + resource));
      const accessibleUpdateFields = getUpdatedPath(
        (this as any)._update,
        updateAccess.attributes,
        'lazy'
      );
      (this as any)._update = accessibleUpdateFields;
      console.log(accessibleUpdateFields);
      next();
    });
    // setup model paths
    schema.once('init', function(model: Model<any>) {
      const modelName = model.modelName;
      const collectionName = model.collection.collectionName;
      schemaTrees.addSchemaPath(collectionName, modelName, model.schema);
    });

    schema.pre('aggregate', function(next) {
      const options = this.options;
      const resource = this.model().modelName;
      const { role, roleAccess } = getRoleAccess(options, next);
      // check if role has access to delete this resource
      const readAccess = roleAccess.canRead({ resource });
      if (!readAccess.granted)
        return next(new Error(role + ' has no access to read ' + resource));

      const d = accessibleAggregation({
        pipeline: this.pipeline(),
        roleAccess,
        schemaTrees,
      });
      console.log(d);
      next();
    });
  };
}

function attachAccessibleReadQuery({
  query,
  roleAccess,
  resource,
  schemaTrees,
}: {
  query: Query<any, any>;
  roleAccess: IQuery;
  resource: string;
  schemaTrees: SchemaTrees;
}) {
  const readAccess = roleAccess.canRead({ resource: 'x' });
  const resourcePaths = schemaTrees.getSchemaPath(resource);
  const select = (query as any)._fields; // set accessed field
  const allowedPaths = readAccess.attributes;
  const permissionSelect = getAllowedFields({
    select,
    resourcePaths,
    allowedPaths: allowedPaths.rawAttributePermission,
  });
  // (query as any)._fields = null;
  const populate = (query as any)._mongooseOptions?.populate;
  if (populate) {
    const accessiblePopulate = getAccessiblePopulate({
      resource,
      populate,
      schemaTrees,
      roleAccess,
    });
    (query as any)._mongooseOptions.populate = accessiblePopulate;
  }
}
