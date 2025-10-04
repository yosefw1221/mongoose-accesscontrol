export const sum = (a: number, b: number) => a + b;

import { flatten, unflatten } from './flat';

import { AccessControl, IQueryInfo } from 'accesscontrol';
import mongoose, {
  Schema,
  Model,
  Query,
  QueryOptions,
  Types,
  model,
} from 'mongoose';
import MongooseAccessControl from './MongooseAccessControl';
import IAccessControl from './acl/IAccessControl';
import IMongooseACL from './interfaces/IMongooseACL';
import IMongooseACLmethods from './interfaces/IMongooseACLmethods';
import { AccessibleRecordModel } from './types/casl';
import { AttributePermissionChecker } from './utils';

const grantList = new AccessControl();
grantList
  .grant('user')
  .readAny('Contact', ['_id', 'car', 'followers', 'user', 'email', 'phone'])
  .update('Contact', [
    'phone',
    '!arrayTest',
    'arrayTest.test',
    'car',
    'location',
  ]);
grantList
  .grant('user')
  .readAny('User', ['*', 'nickName', '!posts'])
  .update('User')
  .create('User', ['*', '!nickName']);

const accessControl = new IAccessControl(grantList);

const fields = [
  { name: 1, email: 1, phone: 1, address: 1, createdAt: 1, updatedAt: 1 },
];
const filteredField = grantList
  .can('user')
  .readOwn('Contact')
  .filter(fields);
console.log({ filteredField });

grantList
  .grant('admin')
  .extend('user')
  .readAny('Contact');

const connectDatabase = async () => {
  mongoose.plugin(MongooseAccessControl({ grantList: accessControl }));
  await mongoose.connect('mongodb://localhost:27017/accessControl');
  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'connection error:'));
  return db;
};

const run = async () => {
  await connectDatabase();
  interface IUser {
    posts: Schema.Types.ObjectId[];
    likes: Schema.Types.ObjectId[];
    nickName: String;
  }

  const UserSchema = new mongoose.Schema<
    IUser,
    IMongooseACL<IUser>,
    IMongooseACLmethods<IUser>
  >(
    {
      nickName: String,
      posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    },
    { timestamps: true }
  );

  const User = mongoose.model<IUser, AccessibleRecordModel<IUser>>(
    'User',
    UserSchema
  );

  interface IContact {
    _id: Schema.Types.ObjectId;
    name: String;
    email: String;
    car: {
      plate: String;
      model: String;
    };
    user: typeof UserSchema;
    favoriteFoods: [String];
    location: { lat: Number; lng: Number };
    phone: String;
    posts: Schema.Types.ObjectId[];
    secondary: Schema.Types.ObjectId;
    followers: IUser[];
    arrayTest: any;
  }

  type MongooseModel<T, X> = Model<
    T,
    X & IMongooseACL<T>,
    IMongooseACLmethods<T>
  >;

  interface IContactStatics extends Model<IContact> {
    getContactList: (query: Query<IContact, IContact>) => Promise<QueryOptions>;
  }

  const ContactSchema = new mongoose.Schema<
    IContact,
    IMongooseACL<IContact>,
    IMongooseACLmethods<IContact>
  >({
    name: String,
    email: String,
    phone: String,
    car: {
      plate: UserSchema,
      model: { type: Types.ObjectId, ref: 'Car' },
    },
    user: UserSchema,
    favoriteFoods: [String],
    location: {
      type: new Schema({ lat: Number, lng: Number }),
    },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],

    secondary: { type: Schema.Types.ObjectId, ref: 'Contact' },
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    arrayTest: [
      {
        test: String,
        test2: String,
      },
    ],
  });

  ContactSchema.static('getContactList', function() {
    console.log(this);
    return this.find({});
  });

  const Contact = model<IContact, AccessibleRecordModel<IContact>>(
    'Contact',
    ContactSchema
  );
  const r = await Contact.m1('user')
    .findOne({ posts: { $exists: true } })
    .limit(1)
    .select({ 'arrayTest.test2': 0 });

  console.log(r);
  // const d = new Contact({}).save();
  // console.log(JSON.stringify(r, null, 2));
  // const r = await Contact.withAccess('user')
  //   .findOne({})
  //   .populate('followers');
  // console.log(JSON.stringify(r, null, 2));
  // const deleteResult = await Contact.withAccess('user').updateOne(
  //   {},
  //   {
  //     $set: { phone: '122355' },
  //     $push: { arrayTest: { test: 'test', test2: 'test2' } },
  //   }
  // );
  // const user = await Contact.findOne({});
  // const _user = await Contact.withAccess('user').findOne({});
  // const n = new Contact({});
  // n.withAccess('');
  // await User.withAccess('role');
  // console.log({ deleteResult });

  // const contacts = await Contact.withAccess('user').aggregate([
  //   { $addFields: { test: 'test' } },
  //   { $limit: 2 },
  //   {
  //     $lookup: {
  //       from: 'users',
  //       localField: 'user',
  //       foreignField: '_iy',
  //       as: 'user',
  //     },
  //   },
  //   {
  //     $facet: {
  //       f1: [],
  //       f2: [
  //         {
  //           $lookup: {
  //             from: 'users',
  //             localField: 'user',
  //             foreignField: '_id',
  //             as: 'user',
  //           },
  //         },
  //       ],
  //     },
  //   },
  // ]);
  // console.log({ contacts });

  // const result = await User.withAccess('user').create([{ nickName: 'multi' }]);
  // // const result = await user.withAccess('user').save();
  // console.log({ result });
  const t = User.findOne({});
  const y = User.findOne({});
  const b = User.m1('');
  // type d = ReturnType< typeof t.findOne>
  var _id = (mongoose.Types.ObjectId as any).createFromHexString(
    '4eb6e7e7e9b7f4194e000001'
  );
  const f = flatten({ b: { _id } });
  const unflat = unflatten(f);
  const hasPermissionToUpdate = AttributePermissionChecker([
    '*',
    'k1',
    'k2',
    'k3',
  ]);
  console.log({ k5: hasPermissionToUpdate('k5.k3') });
  console.log(unflat);
};
console.error(' run ');
run()
  .then(() => {
    console.error(' finally ');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(e => {
    console.error(' catch ');
    console.error(e);
    mongoose.disconnect();
    process.exit(1);
  });
