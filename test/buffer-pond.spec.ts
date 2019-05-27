import { Transform, Readable, Writable, pipeline } from 'stream';

import { curry } from '@typed/curry';

import { BufferPond } from '../lib/buffer-pond';





const TIMEOUT = 500;



describe('BufferPond', () => {

    test('import', () => {
        expect(BufferPond).toBeDefined();
    });



    describe('Callback', () => {

        let pond: ReturnType<typeof BufferPond>;



        beforeEach(() => {
            pond = BufferPond();
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

        let pond: ReturnType<typeof BufferPond>;



        beforeEach(() => {
            pond = BufferPond();
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

        let pond: ReturnType<typeof BufferPond>;



        beforeEach(() => {
            pond = BufferPond();
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



    describe('Transform Callback', () => {

        let pond: ReturnType<typeof BufferPond>;



        beforeEach(() => {
            pond = BufferPond();
        });



        test('transform through', done => {

            const readable = new Readable({
                read () {
                    this.push(Helper.buffer('11-22-44-55'));
                    this.push(null);
                }
            });



            const { transform, read } = pond;
            const trans = new Transform({ transform });

            read(2, chunk => {
                trans.push(Buffer.concat([ chunk, Helper.buffer('33') ]));

                read(2, chunk => {
                    trans.push(Buffer.concat([ chunk, Helper.buffer('66') ]));
                });
            });



            const result = [] as Buffer[];

            const writable = new Writable({
                write (chunk, _encoding, callback) {
                    result.push(chunk);
                    callback();
                }
            });



            pipeline(
                readable,
                trans,
                writable,

                err => {
                    expect(err).toBeUndefined();

                    Helper.equal('11-22-33-44-55-66', Buffer.concat(result));

                    done();
                }
            );

        }, TIMEOUT);

    });

});





namespace Helper {

    export const buffer = (hex: string) => Buffer.from(hex.replace(/\-/g, ''), 'hex');

    export const equal = curry((hex: string, data: Buffer) => expect(data).toEqual(buffer(hex)));

}

