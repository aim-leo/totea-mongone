require('reflect-metadata')

const { decode } = require('@mongone/encodeuri')

const { object, array, string, id } = require('tegund')

const crudConfig = {
  findMany: {
    method: 'get',
    uri: '/'
  },
  findById: {
    method: 'get',
    uri: '/:id'
  },
  insert: {
    method: 'post',
    uri: '/'
  },
  updateById: {
    method: 'put',
    uri: '/:id'
  },
  deleteById: {
    method: 'delete',
    uri: '/:id'
  }
}

const Crud = (m, option = {}) => {
  if (!m._isMongone) {
    throw new Error('InjectMongone expected a Mongone obj')
  }

  const crudKeys = Object.keys(crudConfig)

  const optiont = object({
    forbid: array(string().enum(crudKeys)).optional()
  })

  optiont.assert(option)

  return Target => {
    Reflect.defineMetadata('nameFromDecorator', m.name, Target)

    const routeFromDecorator =
      Reflect.getMetadata('routeFromDecorator', Target) || {}

    for (const key in crudConfig) {
      if (option.forbid && option.forbid.includes(key)) continue

      const { method, uri } = crudConfig[key]

      if (!routeFromDecorator[method]) routeFromDecorator[method] = {}

      routeFromDecorator[method][uri] = function (...args) {
        return this[key](...args)
      }
    }

    Reflect.defineMetadata('routeFromDecorator', routeFromDecorator, Target)

    return class extends Target {
      constructor (...args) {
        super(...args)

        this.mongoneModel = m

        this._formatMongoneMethod()
      }

      async findMany ({ query = '' } = {}) {
        query = decode(query)

        const doc = await m.query(query)

        return { result: doc, message: `${m.name} query success!` }
      }

      async findById ({ query = '', params } = {}) {
        object({
          id: id()
        }).assert(params)

        query = decode(query)

        query.id = params.id

        const doc = await m.query(query)

        return { result: doc, message: `${m.name} query success!` }
      }

      async insert ({ body = {} } = {}) {
        object().assert(body)
        const res = await m.insert(body)

        if (res.length > 0) {
          return {
            result: res,
            message: `${m.name} insert success!`
          }
        }
      }

      async updateById ({ params, body }) {
        object().assert(body)
        object({
          id: id()
        }).assert(params)

        const res = await m.updateById(params.id, body)

        if (res) {
          return {
            result: res,
            message: `${m.name} update success!`
          }
        }
      }

      async deleteById ({ params, body }) {
        object().assert(body)
        object({
          id: id()
        }).assert(params)

        const res = await m.deleteById(params.id, body)

        if (res.deletedCount) {
          return {
            result: res,
            message: `${m.name} delete success!`
          }
        } else {
          return {
            code: 400,
            message: `${m.name} delete fail! The target does not exist or has been deleted`
          }
        }
      }

      _formatMongoneMethod () {
        this.mongone = {}

        for (const method of crudKeys) {
          this.mongone[method] = this[method].bind(this)
        }
      }
    }
  }
}

module.exports = {
  Crud
}
