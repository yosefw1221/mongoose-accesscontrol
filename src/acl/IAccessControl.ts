import { AccessControl } from 'accesscontrol';
import { IAccess, IQuery, IPermission, IAttributeAccess } from './IAccess';
import { getPossibleParentKeys } from '../utils';

export default class IAccessControl implements IAccess {
  grants: AccessControl;
  constructor(grantList: AccessControl) {
    this.grants = grantList;
  }
  getGrant(role: string): IQuery {
    const grant = this.grants.can(role);
    return {
      canCreate: ({ attrs, resource, possession }: IPermission) => {
        let granted: boolean, attributes: string[];
        if (!resource)
          return { granted: false, attributes: AttributeAccess([]) };
        if (possession === 'own')
          ({ attributes, granted } = grant.createOwn(resource));
        else ({ attributes, granted } = grant.createAny(resource));

        const attributeAccess = AttributeAccess(attributes);

        if (attrs) {
          const isRequestedAttrAllowed = attributeAccess.hasAccessTo(attrs);
          return {
            granted: granted && isRequestedAttrAllowed,
            attributes: attributeAccess,
          };
        }
        return {
          granted,
          attributes: attributeAccess,
        };
      },
      canRead: ({ attrs, resource, possession }: IPermission) => {
        let granted: boolean, attributes: string[];
        if (!resource)
          return { granted: false, attributes: AttributeAccess([]) };
        if (possession === 'own')
          ({ attributes, granted } = grant.readOwn(resource));
        else ({ attributes, granted } = grant.readAny(resource));

        const attributeAccess = AttributeAccess(attributes);

        if (attrs) {
          const isRequestedAttrAllowed = attributeAccess.hasAccessTo(attrs);
          return {
            granted: granted && isRequestedAttrAllowed,
            attributes: attributeAccess,
          };
        }
        return {
          granted,
          attributes: attributeAccess,
        };
      },
      canUpdate: ({ attrs, resource, possession }: IPermission) => {
        let granted: boolean, attributes: string[];
        if (!resource)
          return {
            granted: false,
            attributes: AttributeAccess([]),
          };
        if (possession === 'own')
          ({ attributes, granted } = grant.updateOwn(resource));
        else ({ attributes, granted } = grant.updateAny(resource));

        const attributeAccess = AttributeAccess(attributes);

        if (attrs) {
          const isRequestedAttrAllowed = attributeAccess.hasAccessTo(attrs);
          return {
            granted: granted && isRequestedAttrAllowed,
            attributes: attributeAccess,
          };
        }
        return {
          granted,
          attributes: attributeAccess,
        };
      },
      canDelete: ({ attrs, resource, possession }: IPermission) => {
        let granted: boolean, attributes: string[];
        if (!resource)
          return {
            granted: false,
            attributes: AttributeAccess([]),
          };
        if (possession === 'own')
          ({ attributes, granted } = grant.deleteOwn(resource));
        else ({ attributes, granted } = grant.deleteAny(resource));

        const attributeAccess = AttributeAccess(attributes);
        if (attrs) {
          const isRequestedAttrAllowed = attributeAccess.hasAccessTo(attrs);
          return {
            granted: granted && isRequestedAttrAllowed,
            attributes: attributeAccess,
          };
        }
        return {
          granted,
          attributes: attributeAccess,
        };
      },
    };
  }
}

const AttributeAccess = (permissionAttributes: string[]): IAttributeAccess => {
  const hasAccessToAllAttribute =
    permissionAttributes?.includes('*') &&
    !permissionAttributes.some(a => a.startsWith('!'));

  const _hasAccess = (attr: string) => {
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

  return {
    rawAttributePermission: permissionAttributes,
    hasAccessToAllAttribute,
    hasAccessToRestAttribute: permissionAttributes?.includes('*'),

    getAllowedAttributes: () =>
      permissionAttributes?.filter(attr => /^(\*|!)/.test(attr)),

    getDeniedAttributes: () =>
      permissionAttributes
        ?.filter(attr => attr.startsWith('!'))
        .map(attr => attr.slice(1)),

    hasAccessTo: (attrs: string | string[]) => {
      if (hasAccessToAllAttribute) return true;
      if (permissionAttributes?.length === 0) return false;
      if (Array.isArray(attrs)) return attrs.every(attr => _hasAccess(attr));
      return _hasAccess(attrs);
    },
  };
};
