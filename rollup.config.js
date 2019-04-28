import pkg from './package.json';





export default {

    input: './lib/index.ts',

    output: [
        {
            file: pkg.main,
            format: 'cjs'
        },
        {
            file: pkg.module,
            format: 'es'
        },
        {
            file: pkg.browser,
            format: 'iife',
            name: 'BufferPond'
        },
    ],

    external: 'buffer'.split('|'),

    plugins: [

        require('rollup-plugin-typescript')({
            typescript: require('typescript'),
        }),

        require('rollup-plugin-terser').terser(),

    ],

};

