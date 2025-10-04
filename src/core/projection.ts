import { SchemaPath } from '../SchemaTree';
import { IAttributeAccess } from '../acl/IAccess';
import { sanitizeSelect } from '../util';

/**
 * Generates a projection object based on the given attributes access and schema path.
 * The projection object determines which attributes are allowed or denied in the final result.
 * @param attributesAccess - An object that provides information about the attributes access permissions.
 * @returns An object with two methods: `getAllowedProjection` and `getAllowedSelectProjection`.
 */
export const projection = (attributesAccess: IAttributeAccess) => {
  const {
    getAllowedAttributes,
    getDeniedAttributes,
    hasAccessTo,
    hasAccessToAllAttribute,
    hasAccessToRestAttribute,
  } = attributesAccess;

  const deniedAttributes = getDeniedAttributes();
  const allowedAttributes = getAllowedAttributes();

  const deniedProjection: Record<string, 0> = deniedAttributes.reduce(
    (acc, attr) => ({ ...acc, [attr]: 0 }),
    {}
  );

  const allowedProjection: Record<string, 1> = allowedAttributes.reduce(
    (acc, attr) => ({ ...acc, [attr]: 1 }),
    {}
  );

  /**
   * Returns a projection object that determines which attributes are allowed in the final result.
   * @returns A projection object or `*` to allow all attributes.
   */
  const getAllowedProjection = (): Record<string, 0 | 1> | '*' => {
    if (hasAccessToAllAttribute) return '*';
    if (hasAccessToRestAttribute) return deniedProjection;
    if (allowedProjection) return allowedProjection;
    if (deniedProjection) return deniedProjection;
    return { _id: 0, __unknown: 1 };
  };

  /**
   * Returns a projection object based on the allowed paths and attributes in the `select` object.
   * @param select - The select object representing the desired attributes.
   * @returns A projection object based on the allowed paths and attributes in the `select` object.
   */
  const getAllowedSelectProjection = (
    select: Record<string, 0 | 1>,
    allowedPath: SchemaPath
  ) => {
    if (hasAccessToAllAttribute) return select;
    if (!select) {
      if (hasAccessToRestAttribute) return deniedProjection;
      if (allowedProjection) return allowedProjection;
      return { _id: 0, __unknown: 1 };
    }
    const _select = sanitizeSelect(select);
    const isInclusionProjection = Object.keys(_select)
      .filter(k => k !== '_id')
      .every(k => _select[k] === 1);

    const projection = {
      _id: _select['_id'] ?? hasAccessTo('_id') ? 1 : 0,
    };
    if (isInclusionProjection) {
      for (const path in _select) {
        if (hasAccessTo(path)) {
          projection[path] = 1;
        }
      }
      return projection;
    }
    if (hasAccessToRestAttribute) {
      const allowedPath = Object.keys(_select).reduce((acc, path) => {
        if (hasAccessTo(path)) {
          acc[path] = 0;
        }
        return acc;
      }, {});
      return {
        ...projection,
        ...allowedPath,
        ...deniedProjection,
      };
    }

    return Object.fromEntries(
      allowedAttributes
        .filter(p => !Object.prototype.hasOwnProperty.call(_select, p))
        .map(p => [p, 1])
    );
  };

  return {
    getAllowedProjection,
    getAllowedSelectProjection,
  };
};
