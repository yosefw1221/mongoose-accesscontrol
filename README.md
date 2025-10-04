# accesscontrol-mongoose

A powerful Mongoose plugin that seamlessly integrates role-based access control (RBAC) with MongoDB through the [accesscontrol](https://github.com/onury/accesscontrol) library. Enforce field-level and resource-level permissions on your Mongoose models with minimal configuration.

## Features

- **Field-level permissions** - Control which fields users can read, create, or update based on their roles
- **Resource-level permissions** - Manage access to entire models/collections
- **Query-aware** - Automatically filters queries, projections, and population based on role permissions
- **Aggregation support** - Apply permissions to aggregation pipelines including `$lookup` and `$facet` stages
- **Update operation filtering** - Handles MongoDB operators like `$set`, `$push`, etc.
- **TypeScript support** - Full type definitions with generic support
- **Flexible permission syntax** - Use wildcards (`*`), negations (`!field`), and nested paths (`car.model`)
- **Mongoose middleware integration** - Hooks into pre-save, pre-find, pre-update, and pre-aggregate operations
- **Population filtering** - Automatically applies permissions to populated references

## Installation

```bash
npm install accesscontrol-mongoose accesscontrol mongoose
# or
yarn add accesscontrol-mongoose accesscontrol mongoose
```

## Quick Start

```typescript
import mongoose from 'mongoose';
import { AccessControl } from 'accesscontrol';
import MongooseAccessControl from 'accesscontrol-mongoose';
import IAccessControl from 'accesscontrol-mongoose/acl/IAccessControl';

// 1. Define your access control rules
const ac = new AccessControl();
ac.grant('user')
  .readAny('Article', ['title', 'content', 'author'])
  .createOwn('Article', ['title', 'content'])
  .updateOwn('Article', ['title', 'content']);

ac.grant('admin')
  .extend('user')
  .readAny('Article')
  .deleteAny('Article');

// 2. Wrap AccessControl with IAccessControl
const accessControl = new IAccessControl(ac);

// 3. Apply the plugin globally
mongoose.plugin(MongooseAccessControl({ grantList: accessControl }));

// 4. Connect to MongoDB
await mongoose.connect('mongodb://localhost:27017/myapp');

// 5. Define your schema
const ArticleSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  secretField: String,
});

const Article = mongoose.model('Article', ArticleSchema);

// 6. Use role-based queries
// Only allowed fields will be returned
const articles = await Article.withAccess('user').find({});

// Update with permission filtering
await Article.withAccess('user').updateOne(
  { _id: articleId },
  { $set: { title: 'New Title', secretField: 'Blocked!' } } // secretField will be filtered out
);
```

## Usage

### Define Permissions

Use the [accesscontrol](https://github.com/onury/accesscontrol) library syntax:

```typescript
const ac = new AccessControl();

ac.grant('user')
  .readAny('Post', ['*', '!secretField']) // All fields except secretField
  .createOwn('Post', ['title', 'content'])
  .updateOwn('Post', ['content']);

ac.grant('moderator')
  .extend('user')
  .deleteAny('Post');

ac.grant('admin')
  .extend('moderator')
  .readAny('Post'); // All fields including secretField
```

**Permission syntax:**
- `'*'` - Grant access to all fields
- `'!fieldName'` - Deny access to specific field
- `'fieldName'` - Grant access to specific field
- `'nested.path'` - Access nested fields
- `'array.field'` - Access fields in array elements

### Query Methods

All standard Mongoose query methods support the `withAccess(role)` method:

```typescript
// Read operations
const posts = await Post.withAccess('user').find({ published: true });
const post = await Post.withAccess('user').findOne({ _id: postId });
const postById = await Post.withAccess('user').findById(postId);

// Update operations
await Post.withAccess('user').updateOne(
  { _id: postId },
  { $set: { title: 'Updated' } }
);

await Post.withAccess('user').updateMany(
  { author: userId },
  { $set: { status: 'draft' } }
);

await Post.withAccess('user').findOneAndUpdate(
  { _id: postId },
  { $set: { title: 'Updated' } }
);

// Delete operations
await Post.withAccess('moderator').deleteOne({ _id: postId });
await Post.withAccess('admin').deleteMany({ archived: true });
await Post.withAccess('moderator').findOneAndDelete({ _id: postId });

// Create operations
const newPost = await Post.withAccess('user').create({
  title: 'My Post',
  content: 'Content here',
  secretField: 'This will be filtered out'
});
```

### Document Methods

Use `withAccess` on document instances to save with permission filtering:

```typescript
const post = new Post({
  title: 'My Post',
  content: 'Content',
  secretField: 'Secret'
});

// Save with role-based filtering
await post.withAccess('user', 'strict').save();
// 'secretField' will be removed before saving

// Modes:
// - 'strict': Throws error if forbidden fields are present
// - 'lazy': Silently removes forbidden fields (default)
```

### Population

Permissions are automatically applied to populated references:

```typescript
const posts = await Post.withAccess('user')
  .find({})
  .populate('author'); // Author fields filtered based on User model permissions
```

### Aggregation

Apply permissions to aggregation pipelines:

```typescript
const results = await Post.withAccess('user').aggregate([
  { $match: { published: true } },
  { $lookup: {
      from: 'users',
      localField: 'author',
      foreignField: '_id',
      as: 'author'
    }
  }, // Permissions applied to looked-up documents
  { $facet: {
      recent: [{ $limit: 10 }],
      popular: [{ $sort: { views: -1 } }]
    }
  }
]);
```

### TypeScript Integration

Full TypeScript support with type-safe models:

```typescript
import { AccessibleRecordModel } from 'accesscontrol-mongoose/types/casl';
import IMongooseACL from 'accesscontrol-mongoose/interfaces/IMongooseACL';
import IMongooseACLmethods from 'accesscontrol-mongoose/interfaces/IMongooseACLmethods';

interface IArticle {
  title: string;
  content: string;
  author: mongoose.Types.ObjectId;
}

const ArticleSchema = new mongoose.Schema<
  IArticle,
  IMongooseACL<IArticle>,
  IMongooseACLmethods<IArticle>
>({
  title: String,
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Article = mongoose.model<IArticle, AccessibleRecordModel<IArticle>>(
  'Article',
  ArticleSchema
);
```

## Configuration

### Plugin Options

```typescript
mongoose.plugin(MongooseAccessControl({
  grantList: accessControl, // Required: IAccessControl instance
  superAdminRoleNames: ['superAdmin', 'admin', '*'] // Optional: Roles that bypass all permissions
}));
```

**Super admin roles** automatically bypass all permission checks. By default: `['superAdmin', 'admin', '*']`

### Schema-specific Plugin

Apply the plugin to specific schemas:

```typescript
import MongooseAccessControl from 'accesscontrol-mongoose';

ArticleSchema.plugin(MongooseAccessControl({ grantList: accessControl }));
```

## API Reference

### Static Methods

- `Model.withAccess(role: string)` - Returns a permission-aware query builder

### Instance Methods

- `document.withAccess(role: string, mode?: 'strict' | 'lazy')` - Returns permission-aware save method

### Supported Query Operations

- `find()`, `findOne()`, `findById()`
- `updateOne()`, `updateMany()`, `findOneAndUpdate()`
- `deleteOne()`, `deleteMany()`, `findOneAndDelete()`, `findOneAndRemove()`
- `create()`
- `aggregate()`
- `populate()`

## Development

### Commands

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run in watch mode
npm start

# Run tests
npm test

# Lint code
npm run lint

# Analyze bundle size
npm run size
```

### Project Structure

```
src/
├── MongooseAccessControl.ts    # Main plugin
├── acl/
│   ├── IAccessControl.ts       # AccessControl wrapper
│   └── IAccess.ts              # Permission interfaces
├── helper/
│   ├── populateHelper.ts       # Population filtering
│   ├── updateHelper.ts         # Update operation filtering
│   └── createHelper.ts         # Document creation filtering
├── core/
│   └── aggrigation.ts          # Aggregation pipeline processing
├── SchemaTree.ts               # Schema registry
├── utils.ts                    # Utility functions
└── types/                      # TypeScript type definitions
```

## How It Works

1. **Plugin Registration**: The plugin hooks into Mongoose schema lifecycle events
2. **Schema Mapping**: Builds a registry of all schemas and their paths
3. **Query Interception**: Pre-hooks intercept queries before execution
4. **Permission Check**: Retrieves role permissions from AccessControl
5. **Query Modification**: Filters projections, updates, and population based on permissions
6. **Execution**: Modified query executes with enforced permissions

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Yosef

## Links

- [accesscontrol](https://github.com/onury/accesscontrol) - Role and Attribute based Access Control library
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling for Node.js
