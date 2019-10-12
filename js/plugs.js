import {deepCopy, deepFreeze} from './util.js'

export class APGInputPlug {
	constructor (name, object, updateHandler) {
		this.name = name
		this.updateHandler = updateHandler
		this._value = null
		this._object = object
	}

	_write (value) {
		// internal method.
		// assumes that value comes in frozen, copied.
		// assumes that object is currently in processing mode.
		this._value = value
		if (this.updateHandler) {
			this.updateHandler.call(this._object)
		}
	}

	read () {
		return this._value
	}

	copy () {
		return deepCopy(this._value)
	}
}

export class APGOutputPlug {
	constructor (name, object, program) {
		this.name = name
		this._value = null
		this._object = object
	}

	write (value) {
		if (!this._object._isProcessing) {
			throw new Error('cannot write into output plugs when object is not in processing mode')
		}

		this._value = deepFreeze(deepCopy(value))
		this._object._program.schedulePlugUpdatesFrom(this._object._name, this.name, this._value)
	}
}
