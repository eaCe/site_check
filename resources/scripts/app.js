import Alpine from 'alpinejs';

window.Alpine = Alpine

window.scan = () => {
    return {
        loading: false,
        requestUrl: '',
        error: '',
        type: '',
        types: [],
        urls: [],
        cookies: [],
        localStorage: [],
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
            window.api.invoke('scanSite', this.requestUrl.href)
                .then(res => {
                    this.reset();
                    this.urls = res.urls;
                    this.cookies = res.cookies;
                    this.types = res.types;
                    this.localStorage = res.localStorage;
                })
                .catch(err => {
                    console.error(err);
                })
                .finally(() => {
                    this.loading = false;
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