import { PopulateOptions } from 'mongoose';
import { getAllowedFields } from '../utils';
import { IQuery } from '../acl/IAccess';
import { SchemaTrees } from '../SchemaTree';

type IPopulate = {
  [key: string]: PopulateOptions;
};
export const getAccessiblePopulate = ({
  populate,
  schemaTrees,
  resource,
  roleAccess,
  possession = 'any',
}: {
  populate: IPopulate;
  schemaTrees: SchemaTrees;
  resource: string;
  roleAccess: IQuery;
  possession?: 'any' | 'own';
}) => {
  const _populate = {};

  const getAccessedPopulate = (
    populateOption: PopulateOptions,
    ref: string
  ) => {
    const { path, select, model, populate } = populateOption;
    const modelName =
      typeof model === 'string'
        ? model
        : model?.modelName || schemaTrees.getSchemaPath(ref)[path].ref;

    const { granted: fieldGranted } = roleAccess.canRead({
      resource: ref,
      possession,
      attrs: path,
    });
    if (!fieldGranted) return null;
    const { granted: resourceGranted, attributes } = roleAccess.canRead({
      resource: modelName,
      possession,
    });
    if (!resourceGranted) return null;

    const allowedFields = getAllowedFields({
      allowedPaths: attributes.rawAttributePermission,
      select,
      resourcePaths: schemaTrees.getSchemaPath(modelName),
    });
    let deepPopulate = [];
    if (populate) {
      if (Array.isArray(populate)) {
        populate.forEach((p: PopulateOptions) => {
          const _populate = getAccessedPopulate(p, modelName);
          if (_populate) deepPopulate.push(_populate);
        });
        console.log('_populate', _populate);
      }
    }
    console.log('populate', populate);

    return {
      ...populateOption,
      path,
      select: allowedFields,
      populate: deepPopulate,
    };
  };
  Object.keys(populate).forEach(path => {
    const accessiblePopulate = getAccessedPopulate(populate[path], resource);
    if (!accessiblePopulate) return;
    _populate[path] = accessiblePopulate;
  });
  console.log(
    '=>',
    JSON.stringify({ original: populate, modified: _populate }, null, 2)
  );
  return _populate;
};
