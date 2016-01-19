'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/**
* This wraps a function so that anything that calls it waits for reservations
* to finish before executing.
*/

// like Promise.all, but doesn't return values or fail
var afterPromises = function afterPromises(promises) {
    var remainingCount = promises.length;
    var _resolve = undefined;
    var settle = function settle() {
        if (! --remainingCount) {
            _resolve();
        }
    };

    return new Promise(function (resolve) {
        _resolve = resolve;

        if (promises.length) {
            promises.forEach(function (promise) {
                promise.then(settle, settle);
            });
        } else {
            resolve();
        }
    });
};

exports.default = {
    /**
    * wraps function so it starts using reservations
    * @param {Object} options.scope
    * @param {String} options.name
    * @example functionQueuer.wrap({ scope: console, name: 'log' })
    */

    wrap: function wrap(options) {
        var scope = options.scope;
        var name = options.name;

        var reservations = [];

        /**
        * adds a reservation for the wrapped function
        * @return {Promise}
        */
        var reserve = function reserve() {
            var _resolve = undefined,
                _reject = undefined;

            var reservation = new Promise(function (resolve, reject) {
                _resolve = resolve;
                _reject = reject;
            });

            reservation.use = function () {
                for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                    args[_key] = arguments[_key];
                }

                var index = reservations.indexOf(reservation);

                if (reservation.used) {
                    throw 'reservation already used';
                } else {
                    reservation.used = true;
                }

                return afterPromises(reservations.slice(0, index)).then(function () {
                    return queuedFunction.original.apply(scope, args);
                }).then(function (result) {
                    return _resolve(result);
                }, function (result) {
                    return _reject(result);
                });
            };

            // When reservation is done, remove it.
            var clear = function clear(result) {
                removeReservation(reservation);

                // Relay the reservation result in case someone else
                // in the chain wants it.
                return result;
            };

            // remove the reservation once it's done
            reservation.then(clear, clear);

            // add to our reservation list
            reservations.push(reservation);

            return reservation;
        };

        var queuedFunction = function queuedFunction() {
            var _reserve;

            // If you call this directly, we're going to create a reservation for you, you heathen.
            return (_reserve = reserve()).use.apply(_reserve, arguments);
        };

        var removeReservation = function removeReservation(promise) {
            var index = reservations.indexOf(promise);
            if (index > -1) {
                reservations.splice(index, 1);
            }
            return reservations.length;
        };

        queuedFunction.reserve = reserve;
        queuedFunction.original = scope[name];

        scope[name] = queuedFunction;
    },

    /**
    * restores original function
    * @param {Object} options.scope
    * @param {String} options.name
    * @example functionQueuer.unwrap({ scope: console, name: 'log' })
    */
    unwrap: function unwrap(options) {
        var scope = options.scope;
        var name = options.name;

        scope[name] = scope[name].original;
    }
};

//# sourceMappingURL=functionQueuer.js.map