export function BufferPond <T extends Buffer> () {

    let sizeCurrent = 0;
    let sizeWanted = 0;

    const store = [] as T[];

    /* istanbul ignore next */ // tslint:disable-next-line:no-unused-expression
    let resolve = (chunk: T) => { chunk; };



    return Object.freeze({
        feed,
        read,
        rest,
    });



    function feed (chunk: T) {

        store.push(chunk);
        sizeCurrent += chunk.length;

        sync();

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

    function sync () {

        if (sizeWanted < 1 || sizeCurrent < sizeWanted) {
            return;
        }

        const buffer = Buffer.concat(store);

        sizeCurrent -= sizeWanted;

        store.length = 0;

        if (sizeCurrent > 0) {
            store.push(buffer.slice(sizeWanted) as T);
        }

        resolve(buffer.slice(0, sizeWanted) as T);

        sizeWanted = 0;

    }

    function rest (): Promise<T>;
    function rest (cb: typeof resolve): void;
    function rest (cb?: typeof resolve) {

        if (typeof cb === 'function') {
            return read(sizeCurrent, cb);
        }

        return read(sizeCurrent);
    }

}

