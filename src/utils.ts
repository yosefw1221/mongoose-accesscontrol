export const getModelName = (query: any) => {
  return query?._collection?.collection.modelName;
};

const sanitizeSelect = (
  populate: string | { [key: string]: number }
): { [key: string]: number } => {
  if (typeof populate === 'string') {
    return populate.split(' ').reduce((acc: any, path: string) => {
      acc[path.replace('-', '')] = path.startsWith('-') ? 0 : 1;
      return acc;
    }, {});
  } else {
    return Object.keys(populate).reduce((acc: any, path: string) => {
      acc[path.replace('-', '')] = populate[path];
      return acc;
    }, {});
  }
};

const fixPathCollision = (paths: string[]) => {
  const collisionPath = [];
  const getParentPath = (nestedPath: string) => {
    const _paths = nestedPath.split('.');
    return _paths.reduce((acc: any, path: string, index: number) => {
      if (acc.length === 0) acc.push(path);
      else if (_paths.length - 1 !== index)
        acc.push(`${acc[index - 1]}.${path}`);
      return acc;
    }, []);
  };
  paths.forEach(key => {
    if (key.includes('.')) collisionPath.push(...getParentPath(key));
  });
  return paths.filter(path => !collisionPath.includes(path));
};

const getAllowedPath = (attrAccess, allPath) => {
  if (attrAccess === '*' && attrAccess.length === 1) return allPath;
  const accessPaths = attrAccess.filter(path => path !== '*');
  if (attrAccess.includes('*'))
    return allPath.filter(path => !accessPaths.includes(`!${path}`));
  return accessPaths.filter(path => !path.startsWith('!'));
};

export const getAllowedFields = ({
  select,
  allowedPaths,
  resourcePaths,
}: {
  allowedPaths: Array<string>;
  select: string | { [key: string]: number };
  resourcePaths: any;
}) => {
  const allowedPath = getAllowedPath(allowedPaths, Object.keys(resourcePaths));
  const isAllAttrAllowed = allowedPaths[0] === '*' && allowedPaths.length === 1;
  if (isAllAttrAllowed) {
    return select;
  }
  if (allowedPath.length === 0) return { _id: 0, __: 1 }; // remove all select if no allowed path
  if (!select) return sanitizeSelect(allowedPath.join(' '));
  const _select = sanitizeSelect(select);
  const isExclusionSelect = Object.keys(_select)
    .filter(k => k !== '_id')
    .every(k => _select[k] === 0);
  let allowedSelectPath = [];
  if (isExclusionSelect) {
    const pathChildMatch = Object.keys(_select)
      .map(p => `${p}\..*`)
      .join('|');
    const selectPathChild = allowedPath.filter(path =>
      path.match(new RegExp(pathChildMatch))
    );
    allowedSelectPath = fixPathCollision(
      allowedPath.filter(
        path => _select[path] !== 0 && !selectPathChild.includes(path)
      )
    );
  } else {
    allowedSelectPath = Object.keys(_select).filter(path =>
      allowedPath.includes(path)
    );
  }
  return allowedSelectPath.reduce(
    (acc: any, path: string) => {
      acc[path] = 1;
      return acc;
    },
    { _v: 1, _id: allowedPath.includes('_id') ? 1 : 0 }
  );
};

export const AttributePermissionChecker = (
  permissionAttributes: Array<string>
) => {
  return (attr: string) => {
    const paths = getPossibleParentKeys(attr);
    const hasWildcard = permissionAttributes.includes('*');
    if (hasWildcard)
      return paths.every(path => !permissionAttributes.includes(`!${path}`));
    const hasDeniedPath = paths.some(path =>
      permissionAttributes.includes(`!${path}`)
    );
    if (hasDeniedPath) return false;
    return paths.some(path => permissionAttributes.includes(path));
  };
};

export const getPossibleParentKeys = (key: string) => {
  const paths = key.split('.').filter(p => p.match(/\D/));
  return paths.map((_, i) => paths.slice(0, i + 1).join('.'));
};
