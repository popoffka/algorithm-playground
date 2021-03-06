import {APGInputPlug, APGOutputPlug} from './plugs.js'

export class APGBox {
  constructor () {
    this.input = {}
    this.output = {}

    this._inputOrder = []
    this._outputOrder = []

    this._program = null
    this._id = null
    this._deferredProcessing = []

    this._isProcessing = false
  }

  createLayout () {}
  /* eslint-disable no-unused-vars */
  render (node) {}

  newInputPlug (name, updateHandler = null) {
    if (this._program !== null) {
      throw new Error('cannot add plugs after being attached to a program')
    }
    if (this.input.hasOwnProperty(name)) {
      throw new Error(`cannot add duplicate input plug ${name}`)
    }
    let plug = new APGInputPlug(name, this, updateHandler)
    this.input[name] = plug
    this._inputOrder.push(name)
  }

  newOutputPlug (name) {
    if (this._program !== null) {
      throw new Error('cannot add plugs after being attached to a program')
    }
    if (this.output.hasOwnProperty(name)) {
      throw new Error(`cannot add duplicate output plug ${name}`)
    }
    let plug = new APGOutputPlug(name, this)
    this.output[name] = plug
    this._outputOrder.push(name)
  }

  scheduleProcessing (callback) {
    if (this._program === null) {
      this._deferredProcessing.push(callback)
    } else {
      this._program.scheduleProcessing(this._id,
        // make sure that the `this` reference is set correctly
        (yieldExecution) => callback.call(this, yieldExecution)
      )
    }
  }

  attachToProgram (program, id) {
    if (this._program !== null) {
      throw new Error('boxes can only be attached once')
    }

    Object.freeze(this.inputs)
    Object.freeze(this.outputs)
    Object.freeze(this._inputOrder)
    Object.freeze(this._outputOrder)

    this._program = program
    this._id = id

    for (let callback of this._deferredProcessing) {
      this.scheduleProcessing(callback)
    }
    this._deferredProcessing = []
  }

  static _typeId () {
    let {category, name} = this.metadata()
    return `${category}.${name}`
  }
}
