const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('path');
let mainWindow = null;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            webviewTag: true,
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    await mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
    await createWindow()

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
    const resourceType = request.resourceType;
    const url = request.url;

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

/**
 * get the cookies array
 * @param rawCookies
 * @returns {*[]}
 */
function getCookies(rawCookies) {
    let cookies = [];
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

            if (cookie.expirationDate > 0) {
                cookie['expires'] = new Date(cookie.expirationDate * 1000).toLocaleDateString('de-DE');
            } else {
                cookie['expires'] = '∞';
            }
        });
    }

    return cookies;
}

ipcMain.on('scanSite', async (event, url) => {
    const currentUrl = new URL(url);
    const currentHost = currentUrl.host.replace('www.', '');
    availableTypes = [];
    let urls = [];
    let cookies = [];
    let localStorage = [];

    const win = new BrowserWindow({show: false})

    win.webContents.once('did-finish-load', async () => {
        /**
         * get cookies
         * @type {Electron.Cookie[]}
         */
        const rawCookies = await win.webContents.session.cookies.get({});
        cookies = getCookies(rawCookies);

        /**
         * get localstorage
         * @type {any}
         */
        const rawLocalStorage = await win.webContents.executeJavaScript('window.localStorage', true);
        if (Object.keys(rawLocalStorage).length) {
            for (const key in rawLocalStorage) {
                if (rawLocalStorage.hasOwnProperty(key)) {
                    localStorage.push({'key': key, 'value': rawLocalStorage[key]})
                }
            }
        }

        /**
         * sort by type
         */
        urls.sort((a, b) => a.type.toUpperCase().localeCompare(b.type.toUpperCase()));

        /**
         * sort by available types
         */
        availableTypes.sort((a, b) => a.toUpperCase().localeCompare(b.toUpperCase()));

        /**
         * sort by host
         */
        urls.sort((a, b) => Number(b.same_host) - Number(a.same_host));

        setTimeout(() => {
            event.sender.send('siteScanned', {
                'urls': urls,
                'cookies': cookies,
                'localStorage': localStorage,
                'types': availableTypes,
                'ssl': false,
                // 'sslExpiration': sslExpiration,
            });

            win.webContents.session.clearStorageData();
            win.destroy();
        }, 250)
    });

    await win.webContents.session.webRequest.onHeadersReceived({urls: []}, async (request, cb) => {
        /**
         * skip main frame
         */
        if (request.resourceType !== 'mainFrame') {
            const url = new URL(request.url);
            const host = url.host.replace('www.', '');
            let size = '0';

            if(request.responseHeaders['content-length'] || request.responseHeaders['Content-Length']) {
                const responseSize = request.responseHeaders[Object.keys(request.responseHeaders).find(key => key.toLowerCase() === 'content-length')];
                size = (responseSize / 1000).toFixed(2);
            }

            urls.push({
                'url': request.url,
                // 'type': host === currentHost ? host : getType(request.url()),
                'type': getType(request),
                'same_host': host === currentHost,
                'size': size
            });
        }
        else {
        }

        cb({cancel: false, responseHeaders: request.responseHeaders});
    });

    await win.loadURL(url)
});

// ipcMain.handle('scanSite', async (event, url) => {
    // const pageResponse = await page.goto(url, {waitUntil: 'load'});
    // const securityDetails = await pageResponse.securityDetails();
    //
    // if (securityDetails.hasOwnProperty('validTo')) {
    //     const expirationDate = securityDetails.validTo * 1000;
    //     ssl = true;
    //     sslExpiration = new Date(expirationDate).toLocaleDateString('de-DE');
    // }
// });
