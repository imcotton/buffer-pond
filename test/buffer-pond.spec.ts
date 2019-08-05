import { Readable, Writable, pipeline } from 'stream';

import { curry } from '@typed/curry';

import { bufferPond, BufferPond, toTransform } from '../lib/buffer-pond';





const TIMEOUT = 500;



describe('BufferPond', () => {

    test('import', () => {
        expect(bufferPond).toBeDefined();
    });



    describe('Callback', () => {

        let pond: BufferPond;



        beforeEach(() => {
            pond = bufferPond();
        });



        test('demand under supply', () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            pond.read(2, data => {

                Helper.equal('11-22', data);

                pond.read(3, Helper.equal('33-44-55'));

            })

        });

        test('demand above supply', () => {

            pond.read(2, data => {

                Helper.equal('11-22', data);

                pond.read(3, Helper.equal('33-44-55'));

            })

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

        });

        test('demand in middle of supply', () => {

            pond.feed(Helper.buffer('11'));

            pond.read(2, data => {

                Helper.equal('11-22', data);

                pond.read(3, Helper.equal('33-44-55'));

                pond.feed(Helper.buffer('55-66'));

            })

            pond.feed(Helper.buffer('22-33-44'));

        });

        test('rest', () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            pond.read(2, data => {

                Helper.equal('11-22', data);

                pond.rest(Helper.equal('33-44-55-66'));

            })

        });

        test('wrong size', () => {

            const hook = jest.fn();

            pond.feed(Helper.buffer('11-22-33-44-55-66'));
            pond.read(-2, hook);

            expect(hook).not.toHaveBeenCalled();

        });

    });



    describe('Promise', () => {

        jest.useFakeTimers();

        let pond: BufferPond;



        beforeEach(() => {
            pond = bufferPond();
        });



        test('demand under supply', async () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            Helper.equal('11-22', await pond.read(2));
            Helper.equal('33-44-55', await pond.read(3));

        }, TIMEOUT);

        test('demand above supply', async () => {

            setTimeout(() => {
                pond.feed(Helper.buffer('11-22-33-44-55-66'));
            }, 100);

            jest.runAllTimers();

            Helper.equal('11-22', await pond.read(2));
            Helper.equal('33-44-55', await pond.read(3));

        }, TIMEOUT);

        test('demand in middle of supply', async () => {

            pond.feed(Helper.buffer('11'));

            setTimeout(() => {
                pond.feed(Helper.buffer('22-33-44'));
            }, 100);

            jest.runOnlyPendingTimers();

            Helper.equal('11-22', await pond.read(2));

            setTimeout(() => {
                pond.feed(Helper.buffer('55-66'));
            }, 100);

            jest.runOnlyPendingTimers();

            Helper.equal('33-44-55', await pond.read(3));

        }, TIMEOUT);

        test('rest', async () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            Helper.equal('11-22', await pond.read(2));
            Helper.equal('33-44-55-66', await pond.rest());

        }, TIMEOUT);

    });



    describe('Destroy', () => {

        let pond: BufferPond;



        beforeEach(() => {
            pond = bufferPond();
        });



        test('from beginning', () => {

            pond.destroy();

            const hook = jest.fn();

            pond.feed(Helper.buffer('11-22-33'));
            pond.read(2, hook);

            expect(hook).not.toHaveBeenCalled();

        });

        test('in middle', () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            pond.read(2, () => {

                pond.destroy();

                const hook = jest.fn();

                pond.read(2, hook);

                expect(hook).not.toHaveBeenCalled();

            });

        });

    });



    describe('The toTransform', () => {

        let readable: Readable;
        let writable: Writable;

        let result: Buffer[];



        beforeEach(() => {

            readable = new Readable({
                read () {
                    this.push(Helper.buffer('11-22-33-44-55-66'));
                    this.push(null);
                },
            });

            result = [] as Buffer[];

            writable = new Writable({
                write (chunk, _encoding, callback) {
                    result.push(chunk);
                    callback();
                },
            });

        });



        test('toTransform', done => {

            const trans = toTransform(async function* ({ read }) {
                yield read(3);
                yield read(3);
            });

            pipeline(
                readable,
                trans(),
                writable,

                err => {
                    expect(err).toBeUndefined();

                    Helper.equal('11-22-33-44-55-66', Buffer.concat(result));

                    done();
                },
            );

        }, TIMEOUT);

        test('toTransform loop', done => {

            const trans = toTransform(async function* ({ read }) {
                while (true) {
                    yield read(2);
                    yield read(1);
                }
            });

            pipeline(
                readable,
                trans(),
                writable,

                err => {
                    expect(err).toBeUndefined();

                    Helper.equal('11-22-33-44-55-66', Buffer.concat(result));

                    done();
                },
            );

        }, TIMEOUT);

        test('toTransform with internal drain', done => {

            const iterator = (function* () {
                yield Helper.buffer('11');
                yield Helper.buffer('22');
                yield Helper.buffer('33-44-55-66');
            }());

            readable = new Readable({
                read () {
                    this.push(iterator.next().value);
                },
            });

            const trans = toTransform(async function* ({ read }) {
                yield read(4);
                yield read(2);
            });

            pipeline(
                readable,
                trans(),
                writable,

                err => {
                    expect(err).toBeUndefined();

                    Helper.equal('11-22-33-44-55-66', Buffer.concat(result));

                    done();
                },
            );

        }, TIMEOUT);

        test('toTransform with error', done => {

            const trans = toTransform(async function* ({ read }) {

                yield read(2);
                throw new TypeError('read error');

            });

            pipeline(
                readable,
                trans(),
                writable,

                err => {
                    expect(err).toBeInstanceOf(TypeError);
                    done();
                },
            );

        }, TIMEOUT);

    });

});





namespace Helper {

    export const buffer = (hex: string) => Buffer.from(hex.replace(/\-/g, ''), 'hex');

    export const equal = curry((hex: string, data: Buffer) => expect(data).toEqual(buffer(hex)));

}

