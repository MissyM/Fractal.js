# Architecture

Fractal is a fully featured framework to make frontend apps using a simple and powerful architecture. It is based on the functional programming paradigm and other aproaches that simplify UI development. It may also be used in other contexts, note that Fractal.js is the implementation of the Fractal architecture for the web platform, but its designed to be language agnostic.

Fractal is an unidirectional user interface architeture that is fractal (autosimilar):

> A unidirectional architecture is said to be fractal if subcomponents are structured in the same way as the whole is.
> -[ Andre Staltz](http://staltz.com/unidirectional-user-interface-architectures.html)

Fractal modules are based on the [Model View Update architecture](http://staltz.com/unidirectional-user-interface-architectures.html#elm). This means that each module is mostly structured in this way.

Fractal offers a complete architecture with useful patterns and conventions that allows you center in usability, design and business logic instead of architecture. In the following drawing you can see the whole overview.

<img src="https://github.com/fractalPlatform/Fractal.js/blob/master/assets/architecture.png">

All the application logic is contained into a main module and is hierachicaly structured and composed following the MVU pattern.

If you want to learn more about Fractal's main foundations check out:

- An awesome article called [Unidirectional user interface architectures](http://staltz.com/unidirectional-user-interface-architectures.html) by [Andre Staltz](http://staltz.com/)
- A nice repo and discuss in [functional-frontend-architecture](https://github.com/paldepind/functional-frontend-architecture) by [Simon Friss Vindum](https://github.com/paldepind)
- [Controlling Time and Space: understanding the many formulations of FRP](https://www.youtube.com/watch?v=Agu6jipKfYw) talk by Evan Czaplicki
- An article on why Fractal.js is [implemented in Typescript](http://staltz.com/all-js-libraries-should-be-authored-in-typescript.html) (This is a work in progress) (TODO-DOCS)
- [CSS in JS](https://vimeo.com/116209150) talk by Christopher Chedeau. [Slides here](https://speakerdeck.com/vjeux/react-css-in-js)
- [Virtual DOM approach](https://medium.com/@yelouafi/react-less-virtual-dom-with-snabbdom-functions-everywhere-53b672cb2fe3#.nfir9w2fb)

## Modules

Modules are computing units that can have any size and be composed on many other modules (thus, fractal). Each module has three parts:

- Model ->  A type defining the structure of state data. The model is defined by the `init` function.
- Processing -> Is the way in which the application transform data and react to events. Here live two types of functions:
  - Inputs -> Are used to react to events. This functions transform data and return a list of Action and/or Task structures (or one) with the transformed data, this list is dispatched to the corresponding Action Updates and Task Handlers by Fractal.
  - Actions -> Are functions that transform or modify specific parts of the model. An Action has three parts: a name, data related to it and one transform function (also called update in Model View Update pattern). Think in Actions like things triggered for doing certain modifications to the model and therefore all interfaces (also functions) are recomputed including the view.
- Comunications -> Interaction with external world. Here live two types of functions:
  - Interfaces -> Are functions that depends on the model, there are many types of interfaces (e.g. view). Each change on the model, causes a recompute of all interfaces. The result of an interface recompute is passed to the parent module, then it is propagated to main module, which pass this to a Driver related to this specific type of interface (e.g. View Driver). Drivers interact with external world and perform side effects, it also can subscribe Inputs to events that occurs in the interface context, for example a View interface can subscribe an Input to the click event over a button. Interfaces are designed for continuous communication with external world, via model updates or event subscriptions. The key here is that interfaces are recomputed on each model change (done by an Action) and sends data and Input subscriptions to external world. That Inputs are triggered by events from the external world, note that the initiative are taken out of the module.
  - Tasks -> Are data structures that have attached a name and some data. When dispatched, Task Handlers runs an especific task an perform a side effect using this data. Tasks are designed for discrete communication with external world. The key here is that the module takes the initiative, and may have incoming data in response to the Task via callbacks and those are asyncronous.

For each module should be a module definition. Implementation is described in the following lines.


```javascript
// The `def` function is responsible to convert definition objects into module objects
let myModule = F.def({
  name: 'ModuleName',
  init,
  ...inputs,
  ...actions,
  ...interfaces,
})
```

Module objects are similar to definition objects. `F.def` function makes some validations and prepare the definition object to be executed by Fractal core or merged in another module. Note that modules should have a name in upper camelcase.

### Model

The model contains all the module state and only can be changed by an Action update. The `init` function is responsible to return the initial model. There are a part of the model called `key`, this one identifies the module and should be unique for the same level of hierarchy (modules that are childs of the same parent).

```javascript
let myModule = F.def({
  name,
  init : ({key, otherParam1, otherParam2, ...otherParams}) => ({
    key,
    otherParam1,
    otherParam2,
    ...otherParams,
    variable1: initialValue1,
    variable2: initialValue2,
    ...someOtherVariables,
  }),
})
```

### Inputs

Inputs are the way interfaces dispatch actions or tasks. This means inputs are subscribed by interfaces to any external event, and in react to this event the input process the data and dispatch actions or tasks.

Inputs are described into an object, and have a function that behaves like expected.

```javascript
let myModule = F.def({
  name,
  init,
  inputs: {
    // Inputs can return an Action
    input1: (ctx, Action, data1, data2 ...) => Action.SomeAction(data1, ...),
    // Inputs can return a Task
    input2: (ctx, Action, data1, data2 ...) => ['taskName', taskEmitter(data1, ...)],
    // Inputs can return a list of Actions
    input3: (ctx, Action, data1, data2 ...) => [
      Action.SomeAction1(data1, ...),
      Action.SomeAction2(data1, ...),
    ],
    // Inputs can return a list of Tasks
    input4: (ctx, Action, data1, data2 ...) => [
      ['taskName1', task1Emitter(data1, ...)],
      ['taskName2', task2Emitter(data1, ...)],
    ],
    // Inputs can return a list of Actions and Tasks
    input5: (ctx, Action, data1, data2 ...) => [
      ['taskName', task1Emitter(data1, ...)],
      Action.SomeAction(data1, ...),
    ],
  },
})
```

There are two arguments passed by Fractal to each Input, the context (ctx) and the Actions (Action). Action are an object with the Action types. The context are composed by multiple parts but there are two that are very important to this topic, action$ and task$ streams.

The action$ stream is the spine of Fractal, all Actions are dispatched by it. This is used in the case that an Input should dispatch an Action asyncronously, similarly task$ stream are used for dispatch Tasks asyncronously. Take a look of the next code:

```javascript
let myModule = F.def({
  name,
  init,
  inputs: {
    // Inputs can dispatch Action and Tasks asyncronously
    input1: (ctx, Action, data1, data2 ...) => someAsyncStuff1.then(result => ctx.action$(Action.SomeAction(data1, ...))),
    input2: (ctx, Action, data1, data2 ...) => someAsyncStuff2.then(result => ctx.task$(Action.SomeAction(data1, ...))),
    input3: (ctx, Action, data1, data2 ...) => {
      // asyncronous dispatching
      someAsyncStuff2.then(result => {
        ctx.task$(['taskName1', task1Emitter(data1, ...)])
        ctx.action$(Action.SomeAction1(data1, ...))
      })
      // syncronous dispatching
      return [
        ['taskName2', task1Emitter(data1, ...)],
        Action.SomeAction2(data1, ...),
      ]
    },
  },
})
```

There are an input called _action created by default for easy subscription to an event that don't require processing or multiple dispatching. You can use this input in the same way a any input by passing the Action name and the data it must dispatch: `i._action('SomeAction', someValue)`

### Actions

An Action is the unique way to modify the model. An Action are a function that receives some data and the actual model (state) and returns the new model. This mean that is a tranform function, also is pure, in the same way as all app functions in Fractal.

Description of Actions should be an object with the Action name as key and an array with the input data types and the transform function (A.K.A. update), see next lines (Note that by convention Actions should be in upper camelcase) :

```javascript
let myModule = F.def({
  name,
  init: ({key}) => ({
    key,
    count: 0,
  }),
  ...inputs,
  actions: {
    // Action with normal functions
    IncrementNumber1: [[Number], (num, m) => {
      m.count += num
      return m
    }],
    // Action with Ramda (R) functions
    IncrementNumber2: [[Number], (num, m) => R.evolve({count: R.inc})],
    // In general Fractal Actions use this structure
    SomeAction1: [[type1, ...OtherTypes], (data1, ...OtherData, m) => somePureFunction(data1, ...OtherData, m)],
  },
```

In order to be more declarative Fractal use [Ramda](http://ramdajs.com/) functions to build Actions updates.

### Interfaces

Interfaces are functions that allow you to have a continous (persistent) comunication with external world. There are some interfaces: View, LocalStorage, ... (Work in progress) (TODO-DOCS), but the most important for UIs are the View interface. interfaces are handled by drivers.

This is a list of interfaces, to begin we recomend see the View interface in detail:

- [View](https://github.com/fractalPlatform/Fractal.js/tree/master/docs/interfaces/view.md)
- ... (TODO-DOCS)

### Logging Modules

(TODO-DOCS)

## Tasks

(TODO)

## Composing

Composing is done by the MVU pattern. You can nest modules infinitely in theory, but its a very bad practice. Use composition for achive reutilization and modularity of your app functionality.

In a nutsell MVU composing means that each part of the child module is merged into their related parent part, the following ilustrates this point:

- Child **model** is merged into parent **model**
- Child **inputs** is merged into parent **inputs**
- Child **actions** is merged into parent **actions**
- Child **interfaces** is merged into parent **interfaces**

Each of that task is delegated to the parent module, this means have a grained control over childs. Note that Tasks are not composed by hand, Tasks are direct ways to the external world (or to a service). If you need to take control on tasks, you can use the Task Middleware (Work in progress ...) (TODO-DOCS).

## Services

A service is an entity that contains state that is transversal to modules(e.g. data service), the communication way is:

- service-driver attachs event listeners from inputs of modules to service
- service send data via event listeners
- modules send data via service-task

`// TODO: improve this explanation`
See an example of service pattern in the mailbox example

## Engine

(TODO-DOCS)

### Middleware

(TODO-DOCS)

## The router pattern

Use the Router for binding your data with components, and Router should have all the navigation logic (Router is an incomming feature)
(TODO FEATURE)

## Interaction Patterns

- feature adding: model(data + state) -> logic -> interface
- debugging code
- code navigation
- composing
- UI interaction

## Module Patterns model - logic - interface

- sequential
- router
- string handling (i18n)
- animations

## Composition Patterns for: modules and model

- simple: a -> a
- router: (arr:[a, b, c], num) -> arr[num]
- lazy router: (arr:[a, b, c], num) -> arr[num], and only evualuates arr[num]; AKA async composing
- dinamic list
- lazy rendered dinamic list (Comming soon ...), AKA infinite list

Modules that use load or loadAfter to dispatch actions shouldn't to be composed dinamically, this causes infinite loops. Note that lazy loaded modules can't be composed dinamically for this reason but not make sense to do that!.
