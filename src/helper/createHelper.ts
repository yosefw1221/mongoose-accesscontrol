import { flatten, unflatten } from '../flat';
import { IQuery } from '../acl/IAccess';
import { AttributePermissionChecker } from '../utils';
export const accessibleCreate = ({
  doc,
  roleAccess,
  resource,
  mode,
}: {
  doc: any;
  roleAccess: IQuery;
  resource: string;
  mode: 'lazy' | 'strict';
}) => {
  const { granted, attributes: permissionAttributes } = roleAccess.canCreate({
    resource,
  });
  if (!granted) throw new Error('Forbidden');
  const { _id, ...rest } = doc;
  const createFields = flatten(rest);
  const accessibleCreateFields = {};
  const deniedUpdateFields = [];

  Object.keys(createFields).forEach(key => {
    if (permissionAttributes.hasAccessTo(key))
      return (accessibleCreateFields[key] = createFields[key]);
    return deniedUpdateFields.push(key);
  });
  if (Object.keys(accessibleCreateFields).length === 0)
    throw new Error('No accessible fields');
  if (mode === 'strict') {
    if (deniedUpdateFields.length > 0)
      throw new Error(`Cannot update fields: ${deniedUpdateFields.join(', ')}`);
  }
  return { _id, ...unflatten(accessibleCreateFields) };
};
