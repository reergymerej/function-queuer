# Function Queuer

This wraps a function so that anything that calls it waits for reservations to finish before executing.

## Problem

`a` does an async operation that takes 3 seconds, then it calls `print`.

`b` calls `print` immediately.

`a` is executed, immediately followed by `b`.  The result is `print` is called by `b`, then `a` 3 seconds later, but we want `b` to wait until `a` has had its turn.

```js
var app = {
    a: function () {
        var me = this;

        setTimeout(function () {
            me.print('called from a');
        }, 3000);
    },

    b: function () {
        this.print('called from b');
    },

    print: function (message) {
        console.log(message);
    },
};

app.a();
app.b();

// result:
// called from b
// called from a (3 seconds later)
```

## Solution

Use Function Queuer to make `print` take reservations.  Calls to `print` will be handled in the order of reservations made.  If no reservation was made, they'll have to wait in line for those who called ahead.

```js
var functionQueuer = require('functionQueuer');

var app = {
    a: function () {
        // ----- MAKE A RESERVATION -----
        var reservation = this.print.reserve();

        return new Promise(function (resolve) {
            setTimeout(function () {
                // ----- USE THE RESERVATION -----
                reservation.use('called from a');
                resolve();
            }, 3000);
        });
    },

    b: function () {
        this.print('called from b');
    },

    print: function (message) {
        console.log(message);
    },
};

// ----- WRAP app.print SO IT STARTS HANDLING RESERVATIONS -----
functionQueuer.wrap({
    scope: app,
    name: 'print',
});

app.a();
app.b();

// result:
// called from a (after 3 seconds)
// called from b
```

## Installation

1. clone repo (npm module forthcoming)

## Usage

Use functionQueuer.es6 or functionQueuer.js (es5), your choice.

## API

### functionQueuer.wrap(options)
* `options` Object
    * `scope` Object - the scope of the method to be wrapped
    * `name` String - the name of the function/method

Changes a function to start using reservations.  Adds a `reserve` method to the function specified.

Once a function is wrapped, it has a `reserve` method used to make reservations.

```js
functionQueuer.wrap({ scope: foo, name: 'bar' });
var reservation = foo.bar.reserve();
```

When you want to use the reservation, instead of calling the function directly, call the `use` method of the reservation object.

```js
// Don't use this.
// foo.bar('blah blah blah');

// We have a reservation!
reservation.use('blah blah blah');
```

### functionQueuer.unwrap(options)
* `options` Object
    * `scope` Object - the scope of the method to be restored
    * `name` String - the name of the function/method

Restores the original function.  Any pending reservations will be handled, but subsequent calls to the function will not wait for them to finish.  Function Queuer is non-destructive, so you can `unwrap` at any time and the function will act as it did before.
