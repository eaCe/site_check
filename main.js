const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const {chromium} = require('playwright');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true,
            nodeIntegration: false,
            contextIsolation: true,
        }
    })

    mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})

let availableTypes = [];

/**
 * get request types
 * @param request
 * @returns {string|*}
 */
function getType(request) {
    const resourceType = request.resourceType();
    const url = request.url();

    if (resourceType === 'image' ||
        resourceType === 'script' ||
        resourceType === 'stylesheet') {
        if (availableTypes.indexOf(resourceType) === -1) {
            availableTypes.push(resourceType);
        }
        return resourceType;
    } else if (url.includes('fonts.googleapis.com') ||
        url.includes('fonts.gstatic.com') ||
        url.includes('myfonts.net') ||
        url.includes('use.typekit.net')) {
        if (availableTypes.indexOf('font') === -1) {
            availableTypes.push('font');
        }
        return 'font';
    } else if (url.includes('maps.googleapis.com') ||
        url.includes('google.com/maps')) {
        if (availableTypes.indexOf('map') === -1) {
            availableTypes.push('map');
        }
        return 'map';
    } else if (url.includes('youtube.com') ||
        url.includes('ytimg.com')) {
        if (availableTypes.indexOf('youtube') === -1) {
            availableTypes.push('youtube');
        }
        return 'youtube';
    }

    if (availableTypes.indexOf('misc') === -1) {
        availableTypes.push('misc');
    }
    return 'misc';
}

ipcMain.handle('scanSite', async (event, url) => {
    availableTypes = [];
    const currentUrl = new URL(url);
    const currentHost = currentUrl.host.replace('www.', '');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let urls = [];
    let cookies = [];
    let localStorage = [];
    let ssl = false;
    let sslExpiration = '';

    /**
     * get urls
     */
    await page.on('request', request => {
        const url = new URL(request.url());
        const host = url.host.replace('www.', '');
        urls.push({
            'url': request.url(),
            // 'type': host === currentHost ? host : getType(request.url()),
            'type': getType(request),
            'same_host': host === currentHost
        });
    });

    // await page.on('response', response => {
    // const url = new URL(response.url());
    // const host = url.host.replace('www.', '');
    // urls.push({
    //     'url': response.url(),
    //     // 'type': host === currentHost ? host : getType(response.url()),
    //     'type': getType(response),
    //     'same_host': host === currentHost
    // });
    // });

    const pageResponse = await page.goto(url, {waitUntil: 'load'});
    const securityDetails = await pageResponse.securityDetails();

    if (securityDetails.hasOwnProperty('validTo')) {
        const expirationDate = securityDetails.validTo * 1000;
        ssl = true;
        sslExpiration = new Date(expirationDate).toLocaleDateString('de-DE');
    }

    /**
     * get cookies
     * @type {Array<Cookie>}
     */
    const rawCookies = await page.context().cookies();

    if (rawCookies.length) {
        const criticalCookies = [
            // youtube
            'GPS',
            'YSC',
            'VISITOR_INFO1_LIVE',
            // google analytics
            '_ga',
            '_gat',
            '_gid',
            '_gtag',
        ];

        cookies = rawCookies;
        cookies.forEach(cookie => {
            cookie['critical'] = criticalCookies.some(criticalCookie => cookie.name.includes(criticalCookie));

            if (cookie.expires > 0) {
                cookie['expires'] = new Date(cookie.expires * 1000).toLocaleDateString('de-DE');
            } else {
                cookie['expires'] = '∞';
            }
        });
    }

    /**
     * get data from local storage
     * @type {Storage}
     */
    const localStorageData = await page.evaluate(() =>
        window.localStorage
    );

    if (Object.keys(localStorageData).length) {
        for (const key in localStorageData) {
            if (localStorageData.hasOwnProperty(key)) {
                localStorage.push({'key': key, 'value': localStorageData[key]})
            }
        }
    }

    await browser.close();

    /**
     * sort by type
     */
    urls.sort((a, b) => {
        const typeA = a.type.toUpperCase();
        const typeB = b.type.toUpperCase();
        return (typeA > typeB) ? -1 : (typeA < typeB) ? 1 : 0;
    });

    /**
     * sort by host
     */
    urls.sort((a, b) => Number(b.same_host) - Number(a.same_host));

    return {
        'urls': urls,
        'cookies': cookies,
        'localStorage': localStorage,
        'types': availableTypes,
        'ssl': ssl,
        'sslExpiration': sslExpiration,
    };
});