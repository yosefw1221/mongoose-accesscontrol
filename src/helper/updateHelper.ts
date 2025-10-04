import { flatten, unflatten } from '../flat';
import { AttributePermissionChecker } from '../utils';
export const getUpdatedPath = (
  _update: any,
  permissionAttributes: Array<string>,
  mode = 'lazy'
) => {
  const rawUpdate = flatten(_update);
  const operatorsRegex = /(\$([a-z]+)?\.)|(\.\$$)|(\.\$\[.*?\])/g;
  const hasWildcard = permissionAttributes.includes('*');
  const accessibleUpdateFields = {};
  const deniedUpdateFields = [];

  const hasPermissionToUpdate = AttributePermissionChecker(permissionAttributes);

  Object.keys(rawUpdate).forEach(k => {
    const key = k.replace(operatorsRegex, '');
    console.log({ key });
    if (hasPermissionToUpdate(key))
      return (accessibleUpdateFields[k] = rawUpdate[k]);
    return deniedUpdateFields.push(key);
  });
  if (Object.keys(accessibleUpdateFields).length === 0)
    throw new Error('No accessible fields');
  if (mode === 'strict') {
    if (deniedUpdateFields.length > 0)
      throw new Error(`Cannot update fields: ${deniedUpdateFields.join(', ')}`);
  }
  return unflatten(accessibleUpdateFields);
};
