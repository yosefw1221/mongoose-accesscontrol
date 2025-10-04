import { HydratedDocument, Model, QueryWithHelpers } from 'mongoose';

export interface AccessibleRecordModel<
  T,
  TQueryHelpers = {},
  TMethods = {},
  TVirtuals = {}
>
  extends Model<
    T,
    TQueryHelpers,
    TMethods &
      AccessibleRecordQueryHelpers<T, TQueryHelpers, TMethods, TVirtuals>,
    TVirtuals
  > {
  m1: GetAccessibleRecords<
    HydratedDocument<T, TMethods, TVirtuals>,
    TQueryHelpers,
    TMethods,
    TVirtuals
  >;
}

export type AccessibleRecordQueryHelpers<
  T,
  TQueryHelpers = {},
  TMethods = {},
  TVirtuals = {}
> = {
  m2: () => void;
};

type GetAccessibleRecords<T, TQueryHelpers, TMethods, TVirtuals> = <
  U extends {}
>(
  ability: U,
  action?: any
) => QueryWithHelpers<
  Array<T>,
  T,
  AccessibleRecordQueryHelpers<T, TQueryHelpers, TMethods, TVirtuals>
>;
