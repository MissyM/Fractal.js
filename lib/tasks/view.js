let Type = require('union-type')
let R = {
  T: require('ramda/src/T')
}


export default {
  types: Type({
    setFocused: [String, R.T, R.T],
  }),
  task: function(rootSelector) {
    let taskFn = this.types.caseOn({
      setFocused: (elementSelector, focused, {success = () => 0, error = () => 0}) => {
        let elements = document.querySelectorAll(`${rootSelector} ${elementSelector}`)
        if (elements.length === 1) {
          if (focused) {
            elements[0].focus()
          } else {
            elements[0].blur()
          }
          return success()
        }
        error(`No element selected at: ${rootSelector} ${elementSelector}`)
      },
    })

    // task runner
    return {
      run: function(task) {
        // perform side effect
        taskFn(task, '')
      },
      get: {},
    }
  },
}
