import { Model, QueryOptions, QueryWithHelpers } from 'mongoose';

export default interface IMongooseACLmethods<T> {
  withAccess: (
    role: String
  ) => {
    save<ResultDoc>(
      options?: QueryOptions<T> | null | undefined
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, any, any, 'save'>;
    remove<ResultDoc>(
      options?: QueryOptions<T> | null | undefined
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, any, any, 'remove'>;
  };
}
