module.exports = {
    mode: 'jit',
    content: [
        './index.html',
        './resources/scripts/**/*.js',
        './resources/templates/**/*.html'
    ],
    theme: {
        container: {
            center: true,
            padding: '1rem',
        },
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#C90511',
                    '50': '#FC8A91',
                    '100': '#FC767E',
                    '200': '#FB4E58',
                    '300': '#FA2633',
                    '400': '#F10614',
                    '500': '#C90511',
                    '600': '#92040C',
                    '700': '#5C0208',
                    '800': '#250103',
                    '900': '#000000'
                },
                secondary: {
                    DEFAULT: '#343434',
                    '50': '#909090',
                    '100': '#868686',
                    '200': '#717171',
                    '300': '#5D5D5D',
                    '400': '#484848',
                    '500': '#343434',
                    '600': '#272727',
                    '700': '#1A1A1A',
                    '800': '#0E0E0E',
                    '900': '#010101'
                },
            },
        },
    },
    plugins: [],
}
