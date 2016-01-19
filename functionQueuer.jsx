/**
* This wraps a function so that anything that calls it waits for reservations
* to finish before executing.
*/

// like Promise.all, but doesn't return values or fail
const afterPromises = (promises) => {
    let remainingCount = promises.length;
    let _resolve;
    let settle = () => {
        if (!--remainingCount) {
            _resolve();
        }
    };

    return new Promise(resolve => {
        _resolve = resolve;

        if (promises.length) {
            promises.forEach(promise => {
                promise.then(settle, settle);
            });
        } else {
            resolve();
        }
    });
};

export default {
    /**
    * wraps function so it starts using reservations
    * @param {Object} options.scope
    * @param {String} options.name
    * @example functionQueuer.wrap({ scope: console, name: 'log' })
    */
    wrap(options) {
        const { scope, name } = options;

        const reservations = [];

        /**
        * adds a reservation for the wrapped function
        * @return {Promise}
        */
        const reserve = () => {
            let _resolve, _reject;

            let reservation = new Promise((resolve, reject) => {
                _resolve = resolve;
                _reject = reject;
            });

            reservation.use = (...args) => {
                const index = reservations.indexOf(reservation);

                if (reservation.used) {
                    throw 'reservation already used';
                } else {
                    reservation.used = true;
                }

                return afterPromises(reservations.slice(0, index))
                    .then(() => {
                        return queuedFunction.original.apply(scope, args);
                    })
                    .then(
                        result => _resolve(result),
                        result => _reject(result)
                    );
            };

            // When reservation is done, remove it.
            const clear = (result) => {
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

        const queuedFunction = (...args) => {
            // If you call this directly, we're going to create a reservation for you, you heathen.
            return reserve().use(...args);
        };

        const removeReservation = (promise) => {
            let index = reservations.indexOf(promise);
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
    unwrap(options) {
        const { scope, name } = options;
        scope[name] = scope[name].original;
    },
}
