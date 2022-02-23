import { PrismaClient, Prisma } from '@prisma/client';
import { DMMF } from '@prisma/generator-helper';
import { getDMMF, getSchemaSync } from '@prisma/sdk';
import { mockDeep } from 'jest-mock-extended';
import path from 'path';

type UnwrapPromise<P extends any> = P extends Promise<infer R> ? R : P

type PrismaDelegate = {
  findUnique: (...args: Array<any>) => Promise<any>;
}

type IsTable<S> = S extends `\$${infer fnc}` ? never : S;
type IsString<S extends any> = S extends string ? S : never;

type PrismaList<P extends { [key: string]: any }, K extends string> =
  P[K] extends PrismaDelegate ?
  Array<Partial<UnwrapPromise<ReturnType<P[K]["findUnique"]>>>> :
  never

export type PrismaMockData<P> = Partial<{
  [key in IsTable<Uncapitalize<IsString<keyof P>>>]: PrismaList<P, key>
}>


// TODO:
// - groupBy

let cachedSchema: DMMF.Document;

// type Key = Uncapitalize<ModelName>


const createPrismaMock = async <P>(
  data: PrismaMockData<P> = {},
  pathToSchema?: string,
  client = mockDeep<P>(),
): Promise<P> => {


  const getCamelCase = (name: any) => {
    return name.substr(0, 1).toLowerCase() + name.substr(1);
  };

  const shallowCompare = (
    a: { [key: string]: any },
    b: { [key: string]: any },
  ) => {
    for (let key in a) {
      if (a[key] !== b[key]) return false;
    }
    return true;
  };

  const checkIds = (model: DMMF.Model, data: PrismaMockData<P>) => {
    const c = getCamelCase(model.name);
    const idFields = model.idFields || model.primaryKey?.fields
    // console.log("model.name", model.name)
    if (idFields?.length > 1) {
      const id = idFields.join('_');
      data = {
        ...data,
        [c]: data[c].map(item => {
          return {
            ...item,
            [id]: idFields.reduce((prev, field) => {
              return {
                ...prev,
                [field]: item[field],
              };
            }, {}),
          };
        }),
      };
    }
    return data;
  };

  const getFieldRelationshipWhere = (item, field: DMMF.Field) => ({
    [field.relationToFields[0]]: item[field.relationFromFields[0]],
  });


  const getJoinField = (field: DMMF.Field) => {
    const joinmodel = cachedSchema.datamodel.models.find(model => {
      return model.name === field.type;
    });

    const joinfield = joinmodel.fields.find(f => {
      return f.relationName === field.relationName;
    });
    return joinfield;
  }


  if (!cachedSchema) {
    const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma')
    var pathToModule =
      pathToSchema || require.resolve(schemaPath);
    const datamodel = getSchemaSync(pathToModule);
    cachedSchema = await getDMMF({
      datamodel,
    });
  }

  // @ts-ignore
  client["$transaction"].mockImplementation((actions) => {
    return Promise.all(actions)
  })

  const Delegate = (prop: string, model: DMMF.Model) => {


    const nestedUpdate = (args, isCreating: boolean, item) => {
      let d = args.data;

      // Get field schema for default values
      const model = cachedSchema.datamodel.models.find(model => {
        return getCamelCase(model.name) === prop;
      });

      model.fields.forEach(field => {

        if (d[field.name]) {
          const c = d[field.name];

          if (field.kind === 'object') {

            if (c.connect) {
              const { [field.name]: connect, ...rest } = d;
              d = {
                ...rest,
                [field.relationFromFields[0]]:
                  connect.connect[field.relationToFields[0]],
              };
            }
            if (c.create || c.createMany) {
              const { [field.name]: create, ...rest } = d;
              d = rest;
              // @ts-ignore
              const name = getCamelCase(field.type);
              const delegate = Delegate(name, model);

              const joinfield = getJoinField(field);

              if (field.relationFromFields.length > 0) {
                const item = delegate.create({
                  data: create.create
                })
                d = {
                  ...rest,
                  [field.relationFromFields[0]]:
                    item[field.relationToFields[0]],
                };
              } else {
                const map = (val) => ({
                  ...val,
                  [joinfield.name]: {
                    connect: joinfield.relationToFields.reduce(
                      (prev, cur, index) => {
                        let val = d[cur]
                        if (!isCreating && !val) {
                          val = findOne(args)[cur]
                        }
                        return {
                          ...prev,
                          [cur]: val,
                        };
                      },
                      {},
                    ),
                  },
                })
                if (c.createMany) {
                  delegate.createMany({
                    ...c.createMany,
                    data: c.createMany.data.map(map),
                  });
                } else {
                  if (Array.isArray(c.create)) {
                    delegate.createMany({
                      ...c.create,
                      data: c.create.map(map),
                    });
                  } else {
                    delegate.create({
                      ...create.create,
                      data: map(create.create),
                    });
                  }
                }
              }
            }

            if (c.update || c.updateMany) {
              const name = getCamelCase(field.type);
              const delegate = Delegate(name, model);
              if (c.updateMany) {
                if (Array.isArray(c.updateMany)) {
                  c.updateMany.forEach(updateMany => {
                    delegate.updateMany(updateMany);
                  })
                } else {
                  delegate.updateMany(c.updateMany);
                }
              } else {
                if (Array.isArray(c.update)) {
                  c.update.forEach(update => {
                    delegate.update(update);
                  })
                } else {
                  const item = findOne(args);
                  delegate.update({ data: c.update, where: getFieldRelationshipWhere(item, field) });
                }
              }
            }
          }
          
          if (c.increment) {
            d = {
              ...d,
              [field.name]: item[field.name] + c.increment
            }
          }
          if (c.decrement) {
            d = {
              ...d,
              [field.name]: item[field.name] - c.decrement
            }
          }
          if (c.multiply) {
            d = {
              ...d,
              [field.name]: item[field.name] * c.multiply
            }
          }
          if (c.divide) {
            d = {
              ...d,
              [field.name]: item[field.name] / c.divide
            }
          }
          if (c.set) {
            d = {
              ...d,
              [field.name]: c.set
            }
          }

        }

        if (isCreating && !d[field.name] && field.default) {
          if (typeof field.default === 'object') {
            if (field.default.name === 'autoincrement') {
              let m = 1;
              data[prop].forEach(item => {
                m = Math.max(m, item[field.name]);
              });
              d = {
                ...d,
                [field.name]: m + 1,
              };
            }
          } else {
            d = {
              ...d,
              [field.name]: field.default,
            };
          }
        }
        // return field.name === key
      });
      return d
    }

    const matchItem = (child, item, where) => {
      const val = item[child];
      const filter = where[child];
      if (child === "OR") {
        return matchOr(item, filter);
      }
      if (child === "AND") {
        return matchAnd(item, filter);
      }
      if (child === "NOT") {
        return !matchOr(item, filter);
      }
      if (!filter) {
        if (filter === null) {
          return !val;
        }
        return true
      }

      if (filter instanceof Date) {
        if (val === undefined) {
          return false;
        }
        if (!(val instanceof Date) || val.getTime() !== filter.getTime()) {
          return false;
        }
      } else {
        if (typeof filter === 'object') {
          const info = model.fields.find(field => field.name === child);
          if (info?.relationName) {
            const childName = getCamelCase(info.type);
            const res = data[childName].filter(
              matchFnc({
                ...filter,
                ...getFieldRelationshipWhere(item, info),
              }),
            );
            return res.length > 0;
          }
          const idFields = model.idFields || model.primaryKey?.fields
          if (idFields?.length > 1) {
            if (child === idFields.join('_')) {
              return shallowCompare(val, filter);
            }
          }
          if (val === undefined) {
            return false;
          }
          let match = true;
          if ('equals' in filter && match) {
            match = filter.equals === val;
          }
          if ('startsWith' in filter && match) {
            match = val.indexOf(filter.startsWith) === 0;
          }
          if ('endsWith' in filter && match) {
            match =
              val.indexOf(filter.endsWith) ===
              val.length - filter.endsWith.length;
          }
          if ('contains' in filter && match) {
            match = val.indexOf(filter.contains) > -1;
          }
          if ('gt' in filter && match) {
            match = val > filter.gt;
          }
          if ('gte' in filter && match) {
            match = val >= filter.gte;
          }
          if ('lt' in filter && match) {
            match = val < filter.lt;
          }
          if ('lte' in filter && match) {
            match = val <= filter.lte;
          }
          if ('in' in filter && match) {
            match = filter.in.includes(val);
          }
          if ('not' in filter && match) {
            match = val !== filter.not
          }
          if ('notIn' in filter && match) {
            match = !filter.notIn.includes(val);
          }
          if (!match) return false
        } else if (val !== filter) {
          return false;
        }
      }
      return true
    }

    const matchItems = (item, where) => {
      for (let child in where) {
        if (!matchItem(child, item, where)) {
          return false;
        }
      }
      return true
    }

    const matchAnd = (item, where) => {
      return where.filter((child) => matchItems(item, child)).length > 0
    }

    const matchOr = (item, where: Array<{ [key: string]: any }>) => {
      return where.some((child) => matchItems(item, child))
    }

    const matchFnc = where => item => {
      if (where) {
        return matchItems(item, where);
      }
      return true;
    };

    const findOne = args => {
      if (!data[prop]) throw new Error(`${prop} not found in data`)
      const items = findMany(args)
      if (items.length === 0) {
        return null
      }
      return items[0]
    };
    const findMany = args => {
      const res = data[prop].filter(matchFnc(args?.where)).map(includes(args));
      if (args?.distinct) {
        let values = {};
        return res.filter(item => {
          let shouldInclude = true;
          args.distinct.forEach(key => {
            const vals = values[key] || [];
            if (vals.includes(item[key])) {
              shouldInclude = false;
            } else {
              vals.push(item[key]);
              values[key] = vals;
            }
          });
          return shouldInclude;
        });
      }
      if (args?.select) {
        return res.map(item => {
          const newItem = {}
          Object.keys(args.select).forEach(key => newItem[key] = item[key])
          return newItem
        })
      }
      return res;
    };
    // const findFirst = args => {
    //   const item = data[prop].find(matchFnc(args?.where));
    //   if (item) return includes(args)(item);
    //   return null;
    // };
    const updateMany = args => {
      // if (!Array.isArray(data[prop])) {
      //   throw new Error(`${prop} not found in data`)
      // }
      const newItems = data[prop].map(e => {
        if (matchFnc(args.where)(e)) {
          let data = nestedUpdate(args, false, e);
          return {
            ...e,
            ...data,
          };
        }
        return e;
      })
      data = {
        ...data,
        [prop]: newItems,
      };
      return data
    };


    const create = args => {

      const d = nestedUpdate(args, true, null)

      data = {
        ...data,
        [prop]: [...data[prop], d],
      };
      data = checkIds(model, data);

      return findOne({ where: { id: d.id }, ...args });
    };

    const deleteMany = args => {
      data = {
        ...data,
        [prop]: data[prop].filter(e => !matchFnc(args?.where)(e)),
      };
    };

    const includes = args => item => {
      if ((!args?.include && !args?.select) || !item) return item;
      let newItem = item;
      const obj = args?.select || args?.include;
      const keys = Object.keys(obj);
      keys.forEach(key => {
        // Get field schema for relation info

        const model = cachedSchema.datamodel.models.find(model => {
          return getCamelCase(model.name) === prop;
        });

        const schema = model.fields.find(field => {
          return field.name === key;
        });

        if (!schema.relationName) {
          return
        }

        // Get delegate for relation
        const delegate = Delegate(getCamelCase(schema.type), model);

        // Construct arg for relation query
        let subArgs = obj[key] === true ? {} : obj[key];
        subArgs = {
          ...subArgs,
          where: {
            ...subArgs.where,
            ...getFieldRelationshipWhere(item, schema),
          },
        };

        if (schema.isList) {
          // Add relation
          newItem = {
            ...newItem,
            [key]: delegate.findMany(subArgs),
          };
        } else {
          newItem = {
            ...newItem,
            [key]: delegate.findUnique(subArgs),
          };
        }
      });
      return newItem;
    };

    return {
      findOne,
      findUnique: findOne,
      findMany,
      findFirst: findOne,
      create,
      createMany: (args) => {
        args.data.forEach((data) => {
          create({
            ...args,
            data,
          })
        })
        return findMany(args)
      },
      delete: deleteMany,
      update: (args) => {
        updateMany(args)
        return findOne(args)
      },
      deleteMany,
      updateMany: (args) => {
        updateMany(args)
        return findMany(args)
      },

      upsert(args) {
        const res = findOne(args);
        if (res) {
          updateMany({
            ...args,
            data: args.update,
          });
        } else {
          create({
            ...args,
            data: args.create,
          });
        }
      },

      count(args) {
        const res = findMany(args);
        return res.length;
      },
    };
  };

  cachedSchema.datamodel.models.forEach(model => {
    if (!model) return
    const c = getCamelCase(model.name);
    if (!data[c]) {
      data = {
        ...(data || {}),
        [c]: [],
      };
    }
    data = checkIds(model, data);

    const objs = Delegate(c, model);
    Object.keys(objs).forEach(fncName => {
      client[c][fncName].mockImplementation(async (...params) => {
        return objs[fncName](...params);
      });
    });
  });

  return client;
};

export default createPrismaMock;

