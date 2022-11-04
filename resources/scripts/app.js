import Alpine from 'alpinejs';

window.Alpine = Alpine

window.scan = () => {
    return {
        loading: false,
        showExternal: false,
        requestUrl: '',
        error: '',
        type: '',
        types: [],
        urls: [],
        cookies: [],
        localStorage: [],
        ssl: false,
        sslExpiration: '',
        scanSite() {
            if (this.loading) {
                return false;
            }

            try {
                this.requestUrl = new URL(this.$refs.url.value);
            } catch (error) {
                this.requestUrl = '';
                this.error = 'Ungültige URL';
                return false;
            }

            this.error = '';
            this.loading = true;
            window.api.send('scanSite', this.requestUrl.href);

            window.api.receive('siteScanned', (data) =>{
                this.reset();
                this.urls = data.urls;
                this.cookies = data.cookies;
                this.types = data.types;
                this.localStorage = data.localStorage;
                this.ssl = data.ssl;
                this.loading = false;
                // this.sslExpiration = data.sslExpiration;
            });
        },
        reset() {
            this.type = '';
            this.types = [];
            this.urls = [];
            this.cookies = [];
            this.localStorage = [];
        },
        filteredUrls() {
            return this.urls.filter(url => url.type.toLowerCase().includes(this.type.toLowerCase()));
        },
    };
};

Alpine.start();