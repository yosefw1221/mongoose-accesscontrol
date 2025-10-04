import {
  Aggregate,
  AggregateOptions,
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  QueryOptions,
  QueryWithHelpers,
  Schema,
  UpdateQuery,
  UpdateWithAggregationPipeline,
  UpdateWriteOpResult,
  AnyKeys,
  SaveOptions,
  Query,
} from 'mongoose';

import IMongooseACLmethods from './IMongooseACLmethods';

export default interface IMongooseACL<T>
  extends Model<T, {}, IMongooseACLmethods<T>> {
  m1: (s: any) => string;
  withAccess: (
    role: String
  ) => {
    // create: (doc: AnyKeys<T> | T) => QueryWithHelpers<T, T, 'create'>;
    create: (
      docs: Array<AnyKeys<T>> | AnyKeys<T>,
      options?: SaveOptions
    ) => Promise<Array<AnyKeys<T>> | AnyKeys<T>>;
    // create<DocContents = AnyKeys<TRawDocType>>(...docs: Array<TRawDocType | DocContents>): Promise<ResultDoc[]>;
    find: (
      filter: FilterQuery<T>,
      projection?: ProjectionType<T> | null | undefined,
      options?: QueryOptions<T> | null | undefined
    ) => ReturnType<Query<T[], T, {}>['exec']>;
    findOne: (
      filter: FilterQuery<T>,
      projection?: ProjectionType<T> | null | undefined,
      options?: QueryOptions<T> | null | undefined
    ) => ReturnType<Query<T | null, T, {}>['find']>;
    findById: (
      id: any,
      projection?: ProjectionType<T> | null | undefined,
      options?: QueryOptions<T> | null | undefined
    ) => QueryWithHelpers<Array<T>, T, 'findById'>;
    // delete queries
    deleteOne: (
      filter: FilterQuery<T>,
      options?: QueryOptions<T> | null | undefined
    ) => QueryWithHelpers<Array<T>, T, 'deleteOne'>;

    deleteMany<ResultDoc>(
      filter: FilterQuery<Schema>,
      options?: QueryOptions<Schema> | null | undefined
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, any, any, 'deleteMany'>;
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
    >;
    findOneAndDelete<ResultDoc>(
      filter: FilterQuery<Schema>,
      options?: QueryOptions<Schema> | null | undefined
    ): QueryWithHelpers<
      ResultDoc | null,
      ResultDoc,
      any,
      any,
      'findOneAndDelete'
    >;
    findOneAndRemove<ResultDoc>(
      filter: FilterQuery<Schema>,
      options?: QueryOptions<Schema> | null | undefined
    ): QueryWithHelpers<
      ResultDoc | null,
      ResultDoc,
      any,
      any,
      'findOneAndRemove'
    >;
    findOneAndUpdate<ResultDoc>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T>,
      options?: QueryOptions<T> | null
    ): QueryWithHelpers<
      ResultDoc | null,
      ResultDoc,
      any,
      any,
      'findOneAndDelete'
    >;
    updateOne<ResultDoc>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
      options?: QueryOptions<T> | null
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, any, any, 'updateOne'>;
    updateMany<ResultDoc>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
      options?: QueryOptions<T> | null
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, any, any, 'updateMany'>;
    aggregate(
      pipeline: PipelineStage[],
      options?: AggregateOptions
    ): Aggregate<any[]>;
  };
}
