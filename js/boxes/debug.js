import {generateUnusedKey} from '../utils/objects.js'
import {APGBox} from '../box.js'

export class SlowComputation extends APGBox {
  constructor () {
    super()
    this.newInputPlug('iterations', this.redoComputation)
    this.newOutputPlug('output')
  }

  createLayout () {
    let button = document.createElement('button')
    button.innerText = 'boop'
    button.addEventListener('click', () => {
      this.scheduleProcessing(this.redoComputation)
    })
    return button
  }

  static metadata () {
    return {category: 'debug', name: 'slow'}
  }

  async redoComputation (yieldControl) {
    let n = this.input.iterations.read()

    let output = 1
    for (let i = 1; i <= n; i++) {
      output = (output * 123456 + 789012) % 1500007

      if ((i & 1023) === 0) {
        await yieldControl()
      }
    }

    this.output.output.write(output)
  }
}

export class AwaitCounter extends APGBox {
  constructor () {
    super()
    this.newOutputPlug('counter')

    if (window.apgDebug_promises === undefined) {
      window.apgDebug_promises = new Map()
    }

    this.state = {
      name: generateUnusedKey(window.apgDebug_promises, 'promise'),
      counter: 0,
    }
  }

  static metadata () {
    return {category: 'debug', name: 'await'}
  }

  createLayout () {
    let div = document.createElement('div')

    let pre = document.createElement('pre')
    pre.innerText = (
      `apgDebug_promises.get('${this.state.name}').resolve()\n`
      + `apgDebug_promises.get('${this.state.name}').resolve(10)\n`
      + `apgDebug_promises.get('${this.state.name}').reject(new Error('hi'))`
    )
    div.appendChild(pre)

    let button = document.createElement('button')
    button.innerText = 'await'
    button.addEventListener('click', () => this.scheduleProcessing(this.awaitThenIncrement))
    div.appendChild(button)

    return div
  }

  async awaitThenIncrement (yieldControl) {
    let promise = new Promise((resolve, reject) => {
      window.apgDebug_promises.set(this.state.name, {resolve, reject})
    })

    try {
      var {data} = await yieldControl(promise)
    } finally {
      window.apgDebug_promises.delete(this.state.name)
    }

    let increment = (data !== undefined) ? data : 1

    this.state.counter += increment
    this.output.counter.write(this.state.counter)
  }
}
