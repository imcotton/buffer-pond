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

            Helper.equal('11-22', await pond.read(2));
            Helper.equal('33-44-55', await pond.read(3));

        }, TIMEOUT);

        test('demand in middle of supply', async () => {

            pond.feed(Helper.buffer('11'));

            setTimeout(() => {
                pond.feed(Helper.buffer('22-33-44'));
            }, 100);

            Helper.equal('11-22', await pond.read(2));

            setTimeout(() => {
                pond.feed(Helper.buffer('55-66'));
            }, 100);

            Helper.equal('33-44-55', await pond.read(3));

        }, TIMEOUT);

        test('rest', async () => {

            pond.feed(Helper.buffer('11-22-33-44-55-66'));

            Helper.equal('11-22', await pond.read(2));
            Helper.equal('33-44-55-66', await pond.rest());

        }, TIMEOUT);

    });

});





namespace Helper {

    export const buffer = (hex: string) => Buffer.from(hex.replace(/\-/g, ''), 'hex');

    export const equal = curry((hex: string, data: Buffer) => expect(data).toEqual(buffer(hex)));

}

