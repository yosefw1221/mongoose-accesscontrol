import { PipelineStage } from 'mongoose';
import { IQuery } from '../acl/IAccess';
import { SchemaTrees } from '../SchemaTree';

export const accessibleAggregation = ({
  pipeline,
  roleAccess,
  schemaTrees,
}: {
  pipeline: PipelineStage[];
  roleAccess: IQuery;
  schemaTrees: SchemaTrees;
}) => {
  return accessiblePipeline(schemaTrees, roleAccess, pipeline);
};

const accessiblePipeline = (
  schemaTrees: SchemaTrees,
  roleAccess: IQuery,
  stages: PipelineStage[]
) => {
  if (!Array.isArray(stages)) return null;
  const newPipeline = [];
  stages.forEach(stage => {
    const stageName = Object.keys(stage)[0];
    if (stageName === '$lookup') {
      const lookup = accessibleLookup(
        schemaTrees,
        roleAccess,
        stage['$lookup']
      );
      if (lookup) newPipeline.push(lookup);
    } else if (stageName === '$facet') {
      const facet = {
        $facet: Object.keys(stage['$facet']).reduce(
          (acc, key) => ({
            ...acc,
            [key]: accessiblePipeline(
              schemaTrees,
              roleAccess,
              stage['$facet'][key]
            ),
          }),
          {}
        ),
      };
      newPipeline.push(facet);
    } else {
      newPipeline.push(stage);
    }
  });
  return newPipeline;
};

const accessibleLookup = (
  schemaTrees: SchemaTrees,
  roleAccess: IQuery,
  $lookup: any
) => {
  const { from: collectionName, pipeline } = $lookup;
  const modelName = schemaTrees.getModelName(collectionName);
  const { granted, attributes } = roleAccess.canRead({
    resource: modelName,
  });
  if (!granted) return null; // user has no access to this resource
  const { canReadAllAttributes, projection } = permissionAttributes(
    attributes.rawAttributePermission
  );
  if (!canReadAllAttributes && !projection) return null; // user has no access to any attributes
  if (!canReadAllAttributes) addProjectionToLookup($lookup, projection); // user has access to some attributes

  return {
    ...$lookup,
    ...(pipeline && {
      pipeline: accessiblePipeline(schemaTrees, roleAccess, pipeline),
    }),
  };
};

const permissionAttributes = (attributes: string[]) => {
  const { hasWildcard, deniedAttributes, allowedFields } = attributes.reduce(
    (acc, attr) => {
      if (attr === '*') {
        acc.hasWildcard = true;
      } else if (attr.startsWith('!')) {
        acc.deniedAttributes.push(attr.slice(1));
      } else {
        acc.allowedFields.push(attr);
      }
      return acc;
    },
    { hasWildcard: false, deniedAttributes: [], allowedFields: [] }
  );

  const deniedProjection =
    deniedAttributes.length &&
    Object.fromEntries(deniedAttributes.map(attr => [attr, 0]));
  const allowedProjection =
    allowedFields.length &&
    Object.fromEntries(allowedFields.map(attr => [attr, 1]));

  return {
    canReadAllAttributes: Boolean(hasWildcard && !deniedAttributes.length),
    projection: hasWildcard ? deniedProjection : allowedProjection,
  };
};

/**
 * Adds a projection stage to the $lookup pipeline.
 * @param $lookup - The $lookup object representing the lookup stage in the aggregation pipeline.
 * @param projection - The projection object specifying the fields to include or exclude in the output.
 */
const addProjectionToLookup = ($lookup: any, projection: any) => {
  const { pipeline, localField, foreignField } = $lookup;

  if (!pipeline) {
    $lookup['let'] = { [localField]: `$${localField}` };
    $lookup['pipeline'] = [
      {
        $match: {
          $expr: {
            $eq: [`$${foreignField}`, `$$${localField}`],
          },
        },
      },
      { $project: projection },
    ];
    delete $lookup.localField;
    delete $lookup.foreignField;
    return;
  }

  const matchStageIndex = pipeline.findIndex(
    (stage: any) => Object.keys(stage)[0] === '$match'
  );
  pipeline.splice(matchStageIndex + 1, 0, { $project: projection });
};
