/// <reference lib="es2018.asynciterable" />

import { DuplexOptions as Opts, Duplex } from 'stream';

import { reader } from 'async-readable';





export type Gen <T> = (pond: Pick<BufferPond, 'read'>) => AsyncIterable<T>;

export function toTransform <T> (gen: Gen<T>) {

    return function (opts: Opts = { readableObjectMode: true }) {

        const { read, write, pending, destroy } = bufferPond();

        return new Duplex({

            ...opts,

            write,

            read: reader(gen({ read }), destroy),

            final (callback) {

                if (pending()) {
                    destroy();
                    this.push(null);
                    setImmediate(callback);
                }

            },

        });

    };

}



export function noop () {
}



export type BufferPond = ReturnType<typeof bufferPond>;

export function bufferPond <T extends Buffer> () {

    let sizeCurrent = 0;
    let sizeWanted = 0;

    const store = [] as T[];

    /* istanbul ignore next */ // tslint:disable-next-line:no-unused-expression
    let resolve = (chunk: T) => { chunk; };

    let destroyed = false;

    let callback = noop;


    return Object.freeze({
        feed,
        read,
        rest,
        write,
        pending,
        destroy,
    });



    function feed (chunk: T): boolean {

        if (destroyed === true) {
            return false;
        }

        store.push(chunk);
        sizeCurrent += chunk.length;

        return sync();

    }

    function read (size: number): Promise<T>;
    function read (size: number, cb: typeof resolve): void;
    function read (size: number, cb?: typeof resolve) {

        sizeWanted = size;

        if (typeof cb === 'function') {
            resolve = cb;
            sync();
            return;
        }

        return new Promise<T>(res => {
            resolve = res;
            sync();
        });

    }

    function sync (): boolean {

        if (destroyed === true) {
            return false;
        }

        if (sizeWanted < 1) {
            return false;
        }

        if (sizeCurrent < sizeWanted) {
            drain();
            return true;
        }

        const buffer = Buffer.concat(store);

        sizeCurrent -= sizeWanted;

        store.length = 0;

        if (sizeCurrent > 0) {
            store.push(buffer.slice(sizeWanted) as T);
        }

        resolve(buffer.slice(0, sizeWanted) as T);

        sizeWanted = 0;

        if (sizeCurrent < 1) {
            drain();
        }

        return false;

    }

    function rest (): Promise<T>;
    function rest (cb: typeof resolve): void;
    function rest (cb?: typeof resolve) {

        if (typeof cb === 'function') {
            return read(sizeCurrent, cb);
        }

        return read(sizeCurrent);
    }

    function write
        <P extends Parameters<typeof Duplex.prototype._write>>
            (chunk: P[0], _encoding: P[1], cb: P[2]) {

        if (feed(chunk) !== true) {
            callback = cb;
            return;
        }

        setImmediate(cb);
    }

    function pending () {
        return sizeWanted > 0;
    }

    function drain () {
        process.nextTick(callback);
        callback = noop;
    }

    function destroy () {
        store.length = sizeWanted = sizeCurrent = 0;
        destroyed = true;
    }

}

