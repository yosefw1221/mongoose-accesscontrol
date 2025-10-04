export type IPermission = {
  resource: string;
  attrs?: string[] | string;
  possession?: 'any' | 'own';
};
export type IGrant = {
  granted: boolean;
  attributes?: IAttributeAccess;
  possession?: 'any' | 'own';
  // condition?: object;
};

export interface IAttributeAccess {
  hasAccessToAllAttribute: boolean;
  hasAccessToRestAttribute: boolean;
  getAllowedAttributes(): string[];
  getDeniedAttributes(): string[];
  hasAccessTo(attribute: string | string[]): boolean;
  rawAttributePermission:string[];
}

export type IQuery = {
  canCreate: (permission: IPermission) => IGrant;
  canRead: (permission: IPermission) => IGrant;
  canUpdate: (permission: IPermission) => IGrant;
  canDelete: (permission: IPermission) => IGrant;
};

export interface IAccess {
  getGrant(role: string): IQuery;
}
