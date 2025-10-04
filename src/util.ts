export const sanitizeSelect = (
  select: string | { [key: string]: number }
): { [key: string]: number } => {
  if (typeof select === 'string') {
    return select
      .split(' ')
      .reduce((acc: { [key: string]: number }, path: string) => {
        acc[path.replace(/^-/, '')] = /^-/.test(path) ? 0 : 1;
        return acc;
      }, {});
  }
  if (typeof select === 'object') {
    return Object.entries(select).reduce(
      (acc: { [key: string]: number }, [path, value]: [string, number]) => {
        acc[path.replace(/^-/, '')] = /^-/.test(path) ? 0 : value;
        return acc;
      },
      {}
    );
  }
  return select;
};

export const fixPathCollision = (paths: object) => {
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
  Object.keys(paths).forEach(key => {
    if (key.includes('.')) collisionPath.push(...getParentPath(key));
  });
  return Object.keys(paths).filter(path => !collisionPath.includes(path));
}
