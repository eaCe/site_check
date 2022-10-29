const mix = require('laravel-mix');
require('laravel-mix-copy-watched');

mix.js('./resources/scripts/app.js', 'js')
    .postCss('./resources/styles/app.css', 'styles',
        [
            require("tailwindcss"),
        ])
    .setPublicPath('app');

mix.copyWatched('resources/templates/**', 'app/templates');

mix.disableNotifications();
