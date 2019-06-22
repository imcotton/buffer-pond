type ReadableStream = Pick<NodeJS.ReadableStream, 'on' | 'off' | 'read'>;

export type IAsyncReadable = ReturnType<typeof AsyncReadable>;

export function AsyncReadable <T extends Buffer> (stream: ReadableStream) {

    let next = 0;

    /* istanbul ignore next */ // tslint:disable-next-line:no-unused-expression
    let resolve = (chunk: T) => { chunk; };

    stream.on('readable', onReadable);



    return Object.freeze({

        read (size: number) {

            return new Promise<T>(res => {

                if (Boolean(size) === false || size < 1) {
                    throw new RangeError(`Invalid size: ${ size }`);
                }

                next = size;
                resolve = res;

                onReadable();

            });

        },

        off () {
            stream.off('readable', onReadable);
        },

    });



    function onReadable () {

        const data = stream.read(next) as T | null;

        if (data !== null && data !== undefined) {
            next = 0;
            resolve(data);
        }

    }

}

