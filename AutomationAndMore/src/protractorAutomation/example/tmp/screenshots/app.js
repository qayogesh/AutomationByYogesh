var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var convertTimestamp = function (timestamp) {
    var d = new Date(timestamp),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth() + 1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        h = hh,
        min = ('0' + d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;

    if (hh > 12) {
        h = hh - 12;
        ampm = 'PM';
    } else if (hh === 12) {
        h = 12;
        ampm = 'PM';
    } else if (hh === 0) {
        h = 12;
    }

    // ie: 2013-02-18, 8:35 AM
    time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

    return time;
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    } else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    } else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};

//</editor-fold>

app.controller('ScreenshotReportController', ['$scope', '$http', 'TitleService', function ($scope, $http, titleService) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;
    this.totalDurationFormat = clientDefaults.totalDurationFormat;
    this.showTotalDurationIn = clientDefaults.showTotalDurationIn;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime) {
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }


    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };
    this.hasNextScreenshot = function (index) {
        var old = index;
        return old !== this.getNextScreenshotIdx(index);
    };

    this.hasPreviousScreenshot = function (index) {
        var old = index;
        return old !== this.getPreviousScreenshotIdx(index);
    };
    this.getNextScreenshotIdx = function (index) {
        var next = index;
        var hit = false;
        while (next + 2 < this.results.length) {
            next++;
            if (this.results[next].screenShotFile && !this.results[next].pending) {
                hit = true;
                break;
            }
        }
        return hit ? next : index;
    };

    this.getPreviousScreenshotIdx = function (index) {
        var prev = index;
        var hit = false;
        while (prev > 0) {
            prev--;
            if (this.results[prev].screenShotFile && !this.results[prev].pending) {
                hit = true;
                break;
            }
        }
        return hit ? prev : index;
    };

    this.convertTimestamp = convertTimestamp;


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };

    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.totalDuration = function () {
        var sum = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.duration) {
                sum += result.duration;
            }
        }
        return sum;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };


    var results = [
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3316,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569308385790,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569308385839,
                "type": ""
            }
        ],
        "screenShotFile": "00d40057-00b5-004a-00df-00bf00c20046.png",
        "timestamp": 1569308384343,
        "duration": 4051
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3316,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00db0010-0044-005a-00b5-0046009800e1.png",
        "timestamp": 1569308389705,
        "duration": 174
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5516,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569337457703,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569337457809,
                "type": ""
            }
        ],
        "screenShotFile": "001e0063-00bb-0050-007e-007e00820054.png",
        "timestamp": 1569337448140,
        "duration": 16393
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5516,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569337465757,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569337465757,
                "type": ""
            }
        ],
        "screenShotFile": "00560070-0090-007a-004b-008a00610024.png",
        "timestamp": 1569337467755,
        "duration": 95
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4972,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338128257,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338128306,
                "type": ""
            }
        ],
        "screenShotFile": "005d00e1-0001-0092-00aa-003200a2000e.png",
        "timestamp": 1569338126563,
        "duration": 2941
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4972,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00480051-002e-0001-005a-00a600170090.png",
        "timestamp": 1569338131396,
        "duration": 154
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4972,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'toEqual' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'toEqual' of undefined\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:9:46)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:7:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00600010-00db-0049-002f-0022009900ad.png",
        "timestamp": 1569338132309,
        "duration": 33
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3920,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338191250,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338191308,
                "type": ""
            }
        ],
        "screenShotFile": "0039000c-004a-00f4-0094-005700dc00a6.png",
        "timestamp": 1569338189953,
        "duration": 2776
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3920,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006800f7-0052-00b0-00f6-00580044000f.png",
        "timestamp": 1569338193324,
        "duration": 108
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3920,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: angularHomePage.getTextSearchField(...).toEqual is not a function"
        ],
        "trace": [
            "TypeError: angularHomePage.getTextSearchField(...).toEqual is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:9:47)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:7:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0035002c-0091-00d0-0016-00ab008e0090.png",
        "timestamp": 1569338194101,
        "duration": 18
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4000,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338251760,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338251815,
                "type": ""
            }
        ],
        "screenShotFile": "00fc0045-008c-0031-00d2-001d008a00bb.png",
        "timestamp": 1569338250629,
        "duration": 3228
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4000,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00a30027-008b-007b-00fc-006c00ae000a.png",
        "timestamp": 1569338254425,
        "duration": 175
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4000,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338259847,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338260009,
                "type": ""
            }
        ],
        "screenShotFile": "00350026-00e2-006e-0049-00b80074003d.png",
        "timestamp": 1569338255320,
        "duration": 5778
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4000,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: angularHomePage.getTextSearchField(...).toEqual is not a function"
        ],
        "trace": [
            "TypeError: angularHomePage.getTextSearchField(...).toEqual is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:47)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007c00b9-00a6-00f4-0022-004d004d0054.png",
        "timestamp": 1569338261556,
        "duration": 13
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5708,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338331856,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338331900,
                "type": ""
            }
        ],
        "screenShotFile": "0065008c-00eb-00cb-00eb-002c008f00e5.png",
        "timestamp": 1569338330464,
        "duration": 2515
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5708,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00de00cd-00fc-0095-004e-00ff00fd008b.png",
        "timestamp": 1569338333715,
        "duration": 261
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5708,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338336760,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338336787,
                "type": ""
            }
        ],
        "screenShotFile": "00910093-0014-0021-0077-005f008e0024.png",
        "timestamp": 1569338334488,
        "duration": 3116
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5708,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: angularHomePage.getTextSearchField(...).toEqual is not a function"
        ],
        "trace": [
            "TypeError: angularHomePage.getTextSearchField(...).toEqual is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:47)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "003500db-008b-0074-00fb-00d10089009f.png",
        "timestamp": 1569338338144,
        "duration": 14
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3152,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338406290,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338406340,
                "type": ""
            }
        ],
        "screenShotFile": "0073000c-00ce-00b2-005d-00dd000b00a7.png",
        "timestamp": 1569338403370,
        "duration": 4808
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3152,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00350010-004c-00f1-0014-0012002800ec.png",
        "timestamp": 1569338408761,
        "duration": 122
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3152,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338412640,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338412668,
                "type": ""
            }
        ],
        "screenShotFile": "00c7008f-0035-00ea-0007-001a00ea00b6.png",
        "timestamp": 1569338409468,
        "duration": 4080
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3152,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: angularHomePage.getTextSearchField(...).toEqual is not a function"
        ],
        "trace": [
            "TypeError: angularHomePage.getTextSearchField(...).toEqual is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:47)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ef00c3-0007-0005-00ee-004a00a4000f.png",
        "timestamp": 1569338414046,
        "duration": 14
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3332,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338447103,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338447146,
                "type": ""
            }
        ],
        "screenShotFile": "00370069-00e5-00cf-0044-009a00d5002e.png",
        "timestamp": 1569338445567,
        "duration": 2644
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3332,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "000b0069-0050-00d3-00a9-00b500e70066.png",
        "timestamp": 1569338448826,
        "duration": 365
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3332,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338454444,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338454469,
                "type": ""
            }
        ],
        "screenShotFile": "009c0083-0009-00b9-009c-005300e90085.png",
        "timestamp": 1569338449924,
        "duration": 5465
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3332,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: angularHomePage.getTextSearchField(...).toEqual is not a function"
        ],
        "trace": [
            "TypeError: angularHomePage.getTextSearchField(...).toEqual is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:47)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002600bd-0068-00f1-00ba-003e00e00054.png",
        "timestamp": 1569338455926,
        "duration": 12
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4472,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338548241,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338548305,
                "type": ""
            }
        ],
        "screenShotFile": "00cf0081-00bf-00ca-003c-003e00be003d.png",
        "timestamp": 1569338546188,
        "duration": 3249
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4472,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ec0056-0022-0017-004c-005200840078.png",
        "timestamp": 1569338550006,
        "duration": 366
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4472,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338551698,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569338551748,
                "type": ""
            }
        ],
        "screenShotFile": "006b0028-005d-0018-00a2-00ce00680055.png",
        "timestamp": 1569338550829,
        "duration": 1483
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4472,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569338555776,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569338555776,
                "type": ""
            }
        ],
        "screenShotFile": "00b800c1-0078-0054-0034-00e100ec006e.png",
        "timestamp": 1569338552835,
        "duration": 3524
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5604,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340171661,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340171709,
                "type": ""
            }
        ],
        "screenShotFile": "00f60097-0081-0041-0027-00bd00330020.png",
        "timestamp": 1569340166405,
        "duration": 7280
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5604,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003f0066-00aa-00d9-00f6-00890011006d.png",
        "timestamp": 1569340174297,
        "duration": 46
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5604,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569340174915,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340188236,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340188283,
                "type": ""
            }
        ],
        "screenShotFile": "00720015-009d-0060-00b3-00c000da0071.png",
        "timestamp": 1569340174812,
        "duration": 14338
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5604,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Expected Function to equal 'API List'.",
            "Failed: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()= 'API List'])"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:34)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()= 'API List'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:27:23)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a3005b-0060-0033-00ff-007e0067002f.png",
        "timestamp": 1569340189702,
        "duration": 1706
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340718476,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340718525,
                "type": ""
            }
        ],
        "screenShotFile": "00f50032-00c7-00fa-0028-003100f500a0.png",
        "timestamp": 1569340717438,
        "duration": 1966
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f80095-0039-0022-000d-0004009a001f.png",
        "timestamp": 1569340720017,
        "duration": 570
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340725695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340725725,
                "type": ""
            }
        ],
        "screenShotFile": "00590044-004d-0058-00b1-006b00180003.png",
        "timestamp": 1569340721088,
        "duration": 5670
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Expected Function to equal 'API List'.",
            "Failed: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()='API List'])"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:34)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()='API List'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:27:23)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002b00ea-008b-00e0-00bb-000d00d700c2.png",
        "timestamp": 1569340727228,
        "duration": 1556
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4244,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340819414,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340819455,
                "type": ""
            }
        ],
        "screenShotFile": "00440077-0082-009e-003d-00d800880021.png",
        "timestamp": 1569340818258,
        "duration": 2277
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4244,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "005300f5-00cd-007e-0004-0018003f0023.png",
        "timestamp": 1569340821117,
        "duration": 378
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4244,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340823852,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569340823885,
                "type": ""
            }
        ],
        "screenShotFile": "00ac0087-0071-0042-00b0-006c00c70095.png",
        "timestamp": 1569340822020,
        "duration": 2562
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4244,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Expected Function to equal 'API List'.",
            "Failed: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()='API.List'])"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:34)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(xpath, //a[@class='search-result-item']/span[text()='API.List'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:27:23)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005400be-00b5-00ac-0015-00fb00e80010.png",
        "timestamp": 1569340825117,
        "duration": 1854
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5216,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341149526,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341149591,
                "type": ""
            }
        ],
        "screenShotFile": "003a006f-00cd-00e1-001e-00aa002400a8.png",
        "timestamp": 1569341143626,
        "duration": 10987
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5216,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b80006-003a-007b-00a2-00b4002d00b5.png",
        "timestamp": 1569341155195,
        "duration": 38
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5216,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569341156107,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341158347,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341158372,
                "type": ""
            }
        ],
        "screenShotFile": "004500a6-00c2-00bf-00a0-00d8007300b6.png",
        "timestamp": 1569341156024,
        "duration": 3084
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5216,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Expected Function to equal 'API List'.",
            "Failed: No element found using locator: By(css selector, a[class='search-result-item'][href='api']>span)"
        ],
        "trace": [
            "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:34)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
            "NoSuchElementError: No element found using locator: By(css selector, a[class='search-result-item'][href='api']>span)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:27:23)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00db00c0-002c-0026-00f6-00ec00e30023.png",
        "timestamp": 1569341159645,
        "duration": 1733
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4760,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341284364,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341284413,
                "type": ""
            }
        ],
        "screenShotFile": "00620022-001f-00c3-0058-0098002000a2.png",
        "timestamp": 1569341262865,
        "duration": 39435
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4760,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003c006b-003a-0002-00fd-007200520050.png",
        "timestamp": 1569341302889,
        "duration": 39
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4760,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341306677,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341306715,
                "type": ""
            }
        ],
        "screenShotFile": "0070004e-00a6-0002-00f0-0010009e00dd.png",
        "timestamp": 1569341303403,
        "duration": 5247
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4760,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, a[class='search-result-item'][href='api']>span)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, a[class='search-result-item'][href='api']>span)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:27:23)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:14:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00dc00f2-001b-0005-00ee-006a009300e8.png",
        "timestamp": 1569341309157,
        "duration": 990
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4836,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341548060,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341548146,
                "type": ""
            }
        ],
        "screenShotFile": "00100045-008a-00e5-00cb-00ac0065004c.png",
        "timestamp": 1569341545685,
        "duration": 4089
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4836,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b9004e-00f0-0044-0004-000200fd0011.png",
        "timestamp": 1569341550420,
        "duration": 65
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4836,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341554281,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341554311,
                "type": ""
            }
        ],
        "screenShotFile": "006e00e8-0026-00d5-00a1-006b00b300b2.png",
        "timestamp": 1569341551088,
        "duration": 3876
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4836,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #api-list)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #api-list)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008b0051-006e-00c7-0009-003f00460003.png",
        "timestamp": 1569341555501,
        "duration": 2180
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 848,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341651080,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341651133,
                "type": ""
            }
        ],
        "screenShotFile": "00bd000b-0016-0004-0055-003f00440022.png",
        "timestamp": 1569341648271,
        "duration": 5048
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 848,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001e00a3-000e-0056-0033-00960008006c.png",
        "timestamp": 1569341654184,
        "duration": 54
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 848,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569341655026,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341656038,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341656039,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341656203,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569341656243,
                "type": ""
            }
        ],
        "screenShotFile": "005400ac-00fa-008f-003a-005900db00a8.png",
        "timestamp": 1569341654842,
        "duration": 2130
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 848,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #api-list)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #api-list)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f6007c-002d-0042-0090-001f005e0071.png",
        "timestamp": 1569341657586,
        "duration": 1765
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3800,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342047887,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342047935,
                "type": ""
            }
        ],
        "screenShotFile": "000900e3-00b1-0076-0021-008f00bc0080.png",
        "timestamp": 1569342044677,
        "duration": 7858
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3800,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00030059-00ae-00fd-0034-001200990075.png",
        "timestamp": 1569342053105,
        "duration": 40
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3800,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342054206,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342054246,
                "type": ""
            }
        ],
        "screenShotFile": "006d0020-0070-00f6-0010-0080002200a0.png",
        "timestamp": 1569342053678,
        "duration": 1407
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3800,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #api-list)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #api-list)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0001009b-0064-0061-0053-00540089003a.png",
        "timestamp": 1569342055643,
        "duration": 1781
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3912,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342159724,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342159773,
                "type": ""
            }
        ],
        "screenShotFile": "000c0047-004c-00a4-0033-002500b600a6.png",
        "timestamp": 1569342158277,
        "duration": 2597
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3912,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "003b0015-0013-001b-00ff-005f008400a3.png",
        "timestamp": 1569342161539,
        "duration": 268
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3912,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342164706,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342164733,
                "type": ""
            }
        ],
        "screenShotFile": "00a3006c-0042-00d6-0023-00cc007f0081.png",
        "timestamp": 1569342162361,
        "duration": 3102
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3912,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: No element found using locator: By(css selector, #api-list)"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(css selector, #api-list)\n    at elementArrayFinder.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00dd00cb-008c-00d6-007a-008900380056.png",
        "timestamp": 1569342166119,
        "duration": 1897
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3260,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342513953,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342514005,
                "type": ""
            }
        ],
        "screenShotFile": "002f0008-0046-00c9-0051-00250055003b.png",
        "timestamp": 1569342512311,
        "duration": 3119
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3260,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0026001d-00a5-00a7-0015-00b600ec004d.png",
        "timestamp": 1569342516044,
        "duration": 52
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3260,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342521801,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569342521826,
                "type": ""
            }
        ],
        "screenShotFile": "00060039-005a-0025-0068-00cb00a7006f.png",
        "timestamp": 1569342516665,
        "duration": 5866
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3260,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Failed: Wait timed out after 30007ms"
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "TimeoutError: Wait timed out after 30007ms\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569342525473,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569342525473,
                "type": ""
            }
        ],
        "screenShotFile": "000e00fa-0025-00c6-0026-00b40091005f.png",
        "timestamp": 1569342523112,
        "duration": 31895
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3280,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343091571,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343091618,
                "type": ""
            }
        ],
        "screenShotFile": "004d0069-003b-00a7-00ad-00f000ac00b1.png",
        "timestamp": 1569343090286,
        "duration": 2587
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3280,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001d0093-001e-00d2-00c0-001e00190062.png",
        "timestamp": 1569343093459,
        "duration": 208
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3280,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343094583,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343094608,
                "type": ""
            }
        ],
        "screenShotFile": "00f10013-0059-00f8-009e-00bc00a50080.png",
        "timestamp": 1569343094207,
        "duration": 4164
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3280,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Wait timed out after 5006ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5006ms\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at apiListPage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:6:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:15:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Enter text into search field\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:12:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569343101473,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569343101473,
                "type": ""
            }
        ],
        "screenShotFile": "00d300d0-009e-00af-0077-002000a100cc.png",
        "timestamp": 1569343099046,
        "duration": 6439
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6124,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343460687,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343460733,
                "type": ""
            }
        ],
        "screenShotFile": "00f7002f-00cd-0025-0089-003200a7003c.png",
        "timestamp": 1569343458931,
        "duration": 2845
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6124,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "002900ac-00b7-0051-008c-0023000e0023.png",
        "timestamp": 1569343462366,
        "duration": 471
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6124,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343469480,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569343469508,
                "type": ""
            }
        ],
        "screenShotFile": "00e3006e-00dc-00c9-00cd-00d400670020.png",
        "timestamp": 1569343463316,
        "duration": 6900
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6124,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569343473044,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569343473044,
                "type": ""
            }
        ],
        "screenShotFile": "00250039-0062-00a8-0066-002e00a40073.png",
        "timestamp": 1569343470808,
        "duration": 4838
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6532,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345091953,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345091998,
                "type": ""
            }
        ],
        "screenShotFile": "00a8006b-001f-00ef-001d-0054008800e0.png",
        "timestamp": 1569345089726,
        "duration": 3672
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6532,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345096485,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345096485,
                "type": ""
            }
        ],
        "screenShotFile": "00b800a9-00db-000b-005b-001c00b400a8.png",
        "timestamp": 1569345096475,
        "duration": 42
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6532,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345097808,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345097842,
                "type": ""
            }
        ],
        "screenShotFile": "009a00dd-00f9-00a8-0019-00c400c5003c.png",
        "timestamp": 1569345097022,
        "duration": 1532
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6532,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345101428,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345101428,
                "type": ""
            }
        ],
        "screenShotFile": "00f3000d-0019-0005-0027-005500ee007d.png",
        "timestamp": 1569345099067,
        "duration": 4042
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6532,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002600c1-007f-0049-00d0-002d00d7007e.png",
        "timestamp": 1569345103511,
        "duration": 250
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5648,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345376511,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345376564,
                "type": ""
            }
        ],
        "screenShotFile": "00b00019-0060-00de-00f6-007700890055.png",
        "timestamp": 1569345375122,
        "duration": 2713
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5648,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008d0099-001d-00bf-00e6-0073007b0053.png",
        "timestamp": 1569345378505,
        "duration": 156
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5648,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345382578,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345382603,
                "type": ""
            }
        ],
        "screenShotFile": "00580074-0075-005c-001e-00ca001a0030.png",
        "timestamp": 1569345379706,
        "duration": 3741
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5648,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345386592,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345386592,
                "type": ""
            }
        ],
        "screenShotFile": "00fd00fe-0071-00da-0061-006c00b600e3.png",
        "timestamp": 1569345383986,
        "duration": 5584
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5648,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f3007a-00e8-002e-00a5-004100c20042.png",
        "timestamp": 1569345390103,
        "duration": 377
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4324,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345440854,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345440901,
                "type": ""
            }
        ],
        "screenShotFile": "00d200c8-00c6-0063-004e-00b700270038.png",
        "timestamp": 1569345439501,
        "duration": 2390
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4324,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009b0016-0041-005e-005b-00e000f100f2.png",
        "timestamp": 1569345442625,
        "duration": 385
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4324,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345444845,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345444901,
                "type": ""
            }
        ],
        "screenShotFile": "008700ac-001f-00da-00cb-00eb00f200fb.png",
        "timestamp": 1569345443750,
        "duration": 2062
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4324,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345448991,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345448991,
                "type": ""
            }
        ],
        "screenShotFile": "0018008d-00b0-00bf-008c-0001005100c2.png",
        "timestamp": 1569345446385,
        "duration": 4003
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4324,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: EC.ExpectedConditions is not a function"
        ],
        "trace": [
            "TypeError: EC.ExpectedConditions is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:19:26)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006e0061-0020-0012-001b-004b00e600e8.png",
        "timestamp": 1569345450958,
        "duration": 12
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6904,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345490457,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345490507,
                "type": ""
            }
        ],
        "screenShotFile": "005e00a7-00c8-0011-004c-00d1002400a1.png",
        "timestamp": 1569345489417,
        "duration": 4209
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6904,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008800d9-0095-00ef-00fb-00b500bc0061.png",
        "timestamp": 1569345494476,
        "duration": 57
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6904,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569345495207,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345502931,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345502978,
                "type": ""
            }
        ],
        "screenShotFile": "00b00018-00bd-0071-00f6-006f00f50097.png",
        "timestamp": 1569345495090,
        "duration": 8790
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6904,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345506601,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345506601,
                "type": ""
            }
        ],
        "screenShotFile": "006800ec-007b-0037-004f-00ff000c007f.png",
        "timestamp": 1569345504466,
        "duration": 4327
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6904,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: EC.ExpectedConditions is not a function"
        ],
        "trace": [
            "TypeError: EC.ExpectedConditions is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:19:26)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "003e0031-0018-002c-0019-00cd005600a5.png",
        "timestamp": 1569345509212,
        "duration": 17
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345542695,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345542743,
                "type": ""
            }
        ],
        "screenShotFile": "00d9007b-00b9-00fc-00ce-0062005800f4.png",
        "timestamp": 1569345541465,
        "duration": 2822
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001100ad-008f-0081-00be-009800840002.png",
        "timestamp": 1569345544937,
        "duration": 85
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345546756,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345546795,
                "type": ""
            }
        ],
        "screenShotFile": "00950097-00f9-0065-00eb-00780017003b.png",
        "timestamp": 1569345545711,
        "duration": 2044
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345550547,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345550547,
                "type": ""
            }
        ],
        "screenShotFile": "0004002c-0083-0013-008c-0083000c0011.png",
        "timestamp": 1569345548297,
        "duration": 4698
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: apiTypeLists.forEach is not a function"
        ],
        "trace": [
            "TypeError: apiTypeLists.forEach is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:20:16)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005c004e-0056-00f0-001d-0029004600a8.png",
        "timestamp": 1569345553485,
        "duration": 15
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5864,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345653307,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345653357,
                "type": ""
            }
        ],
        "screenShotFile": "009c00da-00a5-0088-006d-008a00cc00e6.png",
        "timestamp": 1569345652088,
        "duration": 2122
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5864,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004b000f-00e0-004f-00eb-008800480000.png",
        "timestamp": 1569345654813,
        "duration": 588
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5864,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345660770,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345660794,
                "type": ""
            }
        ],
        "screenShotFile": "008f002f-00c7-0028-00ba-001d00cb0081.png",
        "timestamp": 1569345655883,
        "duration": 5523
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5864,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345664292,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345664292,
                "type": ""
            }
        ],
        "screenShotFile": "00f40035-0005-007d-001e-0030001d0090.png",
        "timestamp": 1569345661948,
        "duration": 4259
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5864,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: apiTypeLists.forEach is not a function"
        ],
        "trace": [
            "TypeError: apiTypeLists.forEach is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:20:16)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007d00de-0014-00d2-0055-0075005e001c.png",
        "timestamp": 1569345666559,
        "duration": 11
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4304,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345846086,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345846143,
                "type": ""
            }
        ],
        "screenShotFile": "005300e5-000e-000b-00c2-004500820095.png",
        "timestamp": 1569345843973,
        "duration": 3261
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4304,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004e00f9-007b-004a-00f7-008b008a0092.png",
        "timestamp": 1569345847892,
        "duration": 346
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4304,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345851330,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569345851372,
                "type": ""
            }
        ],
        "screenShotFile": "00fa006f-004c-0002-0075-0089002a006b.png",
        "timestamp": 1569345848947,
        "duration": 3187
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4304,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345855059,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569345855060,
                "type": ""
            }
        ],
        "screenShotFile": "00ea0092-0014-004d-00b0-00a100c20054.png",
        "timestamp": 1569345852695,
        "duration": 4260
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4304,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: apiTypeLists.forEach is not a function"
        ],
        "trace": [
            "TypeError: apiTypeLists.forEach is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:20:16)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002a0093-0023-00c0-0040-007200100089.png",
        "timestamp": 1569345857379,
        "duration": 12
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5220,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346086288,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346086338,
                "type": ""
            }
        ],
        "screenShotFile": "000c0057-00b3-00ae-0017-00ad00950098.png",
        "timestamp": 1569346084810,
        "duration": 2652
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5220,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006d009b-00ca-009d-0083-0047000e00b3.png",
        "timestamp": 1569346088189,
        "duration": 254
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5220,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346092448,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346092472,
                "type": ""
            }
        ],
        "screenShotFile": "00e30026-0040-00c4-001d-003b00e000ba.png",
        "timestamp": 1569346088923,
        "duration": 4272
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5220,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346096050,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346096050,
                "type": ""
            }
        ],
        "screenShotFile": "004e0043-0078-004f-00e9-00cb00c8001f.png",
        "timestamp": 1569346093788,
        "duration": 5343
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5220,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: apiTypeLists.forEach is not a function"
        ],
        "trace": [
            "TypeError: apiTypeLists.forEach is not a function\n    at apiListPage.getApiTypeList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:20:16)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:20:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate the list of api Type\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:18:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006500b3-0062-0095-001c-00dc0095000d.png",
        "timestamp": 1569346099547,
        "duration": 32
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346314148,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346314195,
                "type": ""
            }
        ],
        "screenShotFile": "00570056-0028-007f-001d-005e00f800df.png",
        "timestamp": 1569346312051,
        "duration": 3660
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00960063-00dc-004d-00b8-00f1008b008e.png",
        "timestamp": 1569346316380,
        "duration": 50
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346318078,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346318168,
                "type": ""
            }
        ],
        "screenShotFile": "0001005c-00da-0051-00fc-0023007c004f.png",
        "timestamp": 1569346317016,
        "duration": 2019
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346322084,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346322084,
                "type": ""
            }
        ],
        "screenShotFile": "00d200f8-00b1-0067-0052-00e8006e00f6.png",
        "timestamp": 1569346319570,
        "duration": 4677
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2252,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a20036-0073-00da-00bb-000d00350007.png",
        "timestamp": 1569346324633,
        "duration": 60019
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6164,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346488885,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346488935,
                "type": ""
            }
        ],
        "screenShotFile": "00f20091-009b-0060-0002-005300ae000f.png",
        "timestamp": 1569346486977,
        "duration": 3089
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6164,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b200d8-0011-00e3-0056-002c007b00e1.png",
        "timestamp": 1569346490692,
        "duration": 333
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6164,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346493269,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346493311,
                "type": ""
            }
        ],
        "screenShotFile": "005d00a4-0046-000e-00b6-00c200450047.png",
        "timestamp": 1569346491570,
        "duration": 2573
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6164,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346496995,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346496995,
                "type": ""
            }
        ],
        "screenShotFile": "00c90039-00c2-00ae-0020-00c5004c005f.png",
        "timestamp": 1569346494741,
        "duration": 4008
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6164,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [],
        "screenShotFile": "0024002d-00b4-006b-00e4-009c00820082.png",
        "timestamp": 1569346499163,
        "duration": 60050
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5696,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346594222,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346594282,
                "type": ""
            }
        ],
        "screenShotFile": "00f200c0-00fe-0017-0083-0020005c0070.png",
        "timestamp": 1569346593107,
        "duration": 2247
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5696,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00120077-00fc-00ee-0027-00e300b80077.png",
        "timestamp": 1569346595985,
        "duration": 351
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5696,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346597793,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346597819,
                "type": ""
            }
        ],
        "screenShotFile": "0021007d-00bd-0046-00a2-006100a800eb.png",
        "timestamp": 1569346596861,
        "duration": 1730
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5696,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346601696,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346601696,
                "type": ""
            }
        ],
        "screenShotFile": "008900fa-00f8-005f-0004-0076006600d9.png",
        "timestamp": 1569346599119,
        "duration": 3804
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5696,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [],
        "screenShotFile": "001f0056-0063-0041-0061-009f001400c2.png",
        "timestamp": 1569346603302,
        "duration": 60009
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5684,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346771538,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346771598,
                "type": ""
            }
        ],
        "screenShotFile": "00a40017-0065-006e-00da-003f00bc0023.png",
        "timestamp": 1569346770343,
        "duration": 2557
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5684,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00130081-0048-009d-005d-001f00b10075.png",
        "timestamp": 1569346773634,
        "duration": 79
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5684,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346775779,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569346775810,
                "type": ""
            }
        ],
        "screenShotFile": "007d0082-008d-0057-00a8-00c8004f0018.png",
        "timestamp": 1569346774320,
        "duration": 2404
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5684,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346779829,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569346779829,
                "type": ""
            }
        ],
        "screenShotFile": "00e70094-00cf-0033-00d2-00b8009d009b.png",
        "timestamp": 1569346777298,
        "duration": 4355
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5684,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a30001-00c4-0052-0098-00aa00c90087.png",
        "timestamp": 1569346782043,
        "duration": 60017
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347097233,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347097280,
                "type": ""
            }
        ],
        "screenShotFile": "00a9001c-0065-0085-0054-008c000800b7.png",
        "timestamp": 1569347095348,
        "duration": 3173
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001600a1-0093-0086-0006-001f00fd0033.png",
        "timestamp": 1569347099135,
        "duration": 186
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347106095,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347106136,
                "type": ""
            }
        ],
        "screenShotFile": "00170044-0062-00ba-0050-007e008300e4.png",
        "timestamp": 1569347099895,
        "duration": 7095
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569347109773,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569347109773,
                "type": ""
            }
        ],
        "screenShotFile": "001f00ec-0025-0098-004e-00ad00f300ba.png",
        "timestamp": 1569347107569,
        "duration": 4972
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL."
        ],
        "trace": [
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)",
            "Error: Timeout - Async callback was not invoked within timeout specified by jasmine.DEFAULT_TIMEOUT_INTERVAL.\n    at Timeout._onTimeout (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4281:23)\n    at ontimeout (timers.js:436:11)\n    at tryOnTimeout (timers.js:300:5)\n    at listOnTimeout (timers.js:263:5)\n    at Timer.processTimers (timers.js:223:10)"
        ],
        "browserLogs": [],
        "screenShotFile": "000f00bd-006d-005f-00e2-00da007000a2.png",
        "timestamp": 1569347112927,
        "duration": 60030
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5212,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347219815,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347219865,
                "type": ""
            }
        ],
        "screenShotFile": "006d00be-0037-00ac-0065-005300c30030.png",
        "timestamp": 1569347217817,
        "duration": 3401
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5212,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006600af-0003-00b8-002b-00ce00e1007b.png",
        "timestamp": 1569347221853,
        "duration": 55
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5212,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347224830,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569347224883,
                "type": ""
            }
        ],
        "screenShotFile": "00720080-0015-0042-0055-007d0073006d.png",
        "timestamp": 1569347222541,
        "duration": 4289
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5212,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569347229513,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569347229513,
                "type": ""
            }
        ],
        "screenShotFile": "00ec00d5-00d6-003b-0020-0093004400a0.png",
        "timestamp": 1569347227978,
        "duration": 7258
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5212,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b50088-00b7-0058-007a-00740026001b.png",
        "timestamp": 1569347235725,
        "duration": 1007
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348764189,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348764239,
                "type": ""
            }
        ],
        "screenShotFile": "008c002d-0069-0012-0087-004300b40046.png",
        "timestamp": 1569348762215,
        "duration": 3786
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "006600ff-00b0-007b-00b6-009e00960024.png",
        "timestamp": 1569348766589,
        "duration": 157
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348775246,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348775292,
                "type": ""
            }
        ],
        "screenShotFile": "00c80022-0034-0023-005e-001b004800a0.png",
        "timestamp": 1569348767421,
        "duration": 8896
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348779190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348779190,
                "type": ""
            }
        ],
        "screenShotFile": "00660063-00a9-009d-0011-005d00b80004.png",
        "timestamp": 1569348777123,
        "duration": 4185
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cf00a2-001b-00b1-009c-004a002e0050.png",
        "timestamp": 1569348781762,
        "duration": 850
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2960,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0038003a-00ad-00b9-00e7-00d500ee0002.png",
        "timestamp": 1569348783039,
        "duration": 6
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348832815,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348832873,
                "type": ""
            }
        ],
        "screenShotFile": "005000bf-0033-00fa-00ad-006a002e0080.png",
        "timestamp": 1569348828607,
        "duration": 5678
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00da0010-0032-00bb-0006-00ff00820027.png",
        "timestamp": 1569348834992,
        "duration": 46
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569348836128,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348836853,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348836853,
                "type": ""
            }
        ],
        "screenShotFile": "000c00da-0017-0098-00d7-004e00ef008b.png",
        "timestamp": 1569348835830,
        "duration": 2005
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348840975,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348840975,
                "type": ""
            }
        ],
        "screenShotFile": "0021009c-00d5-00dd-0048-0009007800ea.png",
        "timestamp": 1569348838630,
        "duration": 5673
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f900a8-000a-001a-0024-00ba0077005c.png",
        "timestamp": 1569348844739,
        "duration": 806
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6432,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: this.clickOnapiTypeList is not a function"
        ],
        "trace": [
            "TypeError: this.clickOnapiTypeList is not a function\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:31:9\n    at arr.map (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:628:33)\n    at Array.map (<anonymous>)\n    at asElementFinders_.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:627:28)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d500bc-00e6-00b6-00a0-008b00a200a7.png",
        "timestamp": 1569348845962,
        "duration": 132
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348875752,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348875796,
                "type": ""
            }
        ],
        "screenShotFile": "007e006a-00a8-005c-00e3-00ef004d0056.png",
        "timestamp": 1569348873892,
        "duration": 3034
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00db0014-00ec-0047-007f-003f00ea00d3.png",
        "timestamp": 1569348877582,
        "duration": 260
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348882740,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348882767,
                "type": ""
            }
        ],
        "screenShotFile": "00ed007d-0047-0009-0085-0041007300f2.png",
        "timestamp": 1569348878584,
        "duration": 4971
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348886395,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569348886395,
                "type": ""
            }
        ],
        "screenShotFile": "00ad0089-0093-004d-00e4-0089001a00ee.png",
        "timestamp": 1569348884142,
        "duration": 4012
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005700fb-00ec-0057-00e5-00cd00d9006f.png",
        "timestamp": 1569348888569,
        "duration": 773
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3804,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: clickOnapiTypeList is not defined"
        ],
        "trace": [
            "ReferenceError: clickOnapiTypeList is not defined\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:31:4\n    at arr.map (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:628:33)\n    at Array.map (<anonymous>)\n    at asElementFinders_.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:627:28)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00520000-00dc-00e7-0017-002f008c0059.png",
        "timestamp": 1569348889739,
        "duration": 126
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348996988,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569348997033,
                "type": ""
            }
        ],
        "screenShotFile": "006f0048-009b-006f-00bd-00470045009d.png",
        "timestamp": 1569348995813,
        "duration": 2707
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00510035-0016-009d-000f-00f80000003c.png",
        "timestamp": 1569348999145,
        "duration": 50
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349003178,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349003201,
                "type": ""
            }
        ],
        "screenShotFile": "00ce00df-005b-0014-00ef-00ee007200e8.png",
        "timestamp": 1569349000357,
        "duration": 3670
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349006854,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349006854,
                "type": ""
            }
        ],
        "screenShotFile": "00f70052-003b-0004-0066-00c600ee0035.png",
        "timestamp": 1569349004619,
        "duration": 4606
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d8000e-00bd-0036-00e2-001800f1007d.png",
        "timestamp": 1569349009711,
        "duration": 869
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4028,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: apiTypeLists.clickOnapiTypeList is not a function"
        ],
        "trace": [
            "TypeError: apiTypeLists.clickOnapiTypeList is not a function\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:31:17\n    at arr.map (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:628:33)\n    at Array.map (<anonymous>)\n    at asElementFinders_.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:627:28)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00590099-00bf-0058-0006-006700690023.png",
        "timestamp": 1569349010974,
        "duration": 113
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349121038,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349121090,
                "type": ""
            }
        ],
        "screenShotFile": "00c200ae-008e-0055-00ba-00c0003f008e.png",
        "timestamp": 1569349118810,
        "duration": 4581
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00eb0013-005d-00bf-009d-000500e20062.png",
        "timestamp": 1569349124519,
        "duration": 119
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349125843,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349125869,
                "type": ""
            }
        ],
        "screenShotFile": "00f200b6-005f-0010-005d-001b00770036.png",
        "timestamp": 1569349125339,
        "duration": 1260
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349129747,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349129747,
                "type": ""
            }
        ],
        "screenShotFile": "00ea00d6-00fc-0071-00d8-006400f500eb.png",
        "timestamp": 1569349127158,
        "duration": 4438
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006b00ba-0075-006b-0049-00a700c800ee.png",
        "timestamp": 1569349132007,
        "duration": 783
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=77.0.3865.90)\n  (Driver info: chromedriver=76.0.3809.126 (d80a294506b4c9d18015e755cee48f953ddc3f2f-refs/branch-heads/3809@{#1024}),platform=Windows NT 6.1.7601 SP1 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=77.0.3865.90)\n  (Driver info: chromedriver=76.0.3809.126 (d80a294506b4c9d18015e755cee48f953ddc3f2f-refs/branch-heads/3809@{#1024}),platform=Windows NT 6.1.7601 SP1 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:30:17\n    at arr.map (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:628:33)\n    at Array.map (<anonymous>)\n    at asElementFinders_.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:627:28)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ee008a-00a9-0057-0080-0085005a001d.png",
        "timestamp": 1569349133159,
        "duration": 575
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349326465,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349326502,
                "type": ""
            }
        ],
        "screenShotFile": "0084004d-0070-00c4-0048-000b00d5007e.png",
        "timestamp": 1569349324732,
        "duration": 3343
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00b9000e-00c4-0037-003a-0097000d00bf.png",
        "timestamp": 1569349328894,
        "duration": 167
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349331082,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349331118,
                "type": ""
            }
        ],
        "screenShotFile": "0065005a-008a-0017-0070-00ab001b00ce.png",
        "timestamp": 1569349329888,
        "duration": 2347
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349335074,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349335074,
                "type": ""
            }
        ],
        "screenShotFile": "00220093-0051-00c8-0027-004f00e300f1.png",
        "timestamp": 1569349332916,
        "duration": 3729
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000600b4-0087-00be-008d-00fa001200f9.png",
        "timestamp": 1569349337039,
        "duration": 875
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 1980,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: stale element reference: element is not attached to the page document\n  (Session info: chrome=77.0.3865.90)\n  (Driver info: chromedriver=76.0.3809.126 (d80a294506b4c9d18015e755cee48f953ddc3f2f-refs/branch-heads/3809@{#1024}),platform=Windows NT 6.1.7601 SP1 x86_64)"
        ],
        "trace": [
            "StaleElementReferenceError: stale element reference: element is not attached to the page document\n  (Session info: chrome=77.0.3865.90)\n  (Driver info: chromedriver=76.0.3809.126 (d80a294506b4c9d18015e755cee48f953ddc3f2f-refs/branch-heads/3809@{#1024}),platform=Windows NT 6.1.7601 SP1 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.click()\n    at Driver.schedule (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.click (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2092:17)\n    at actionFn (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:30:17\n    at arr.map (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:628:33)\n    at Array.map (<anonymous>)\n    at asElementFinders_.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:627:28)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00db0032-008d-005b-0082-000f002300ce.png",
        "timestamp": 1569349338339,
        "duration": 755
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349518470,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349518516,
                "type": ""
            }
        ],
        "screenShotFile": "00a7000c-00ad-00c7-00b2-00d000ed00e2.png",
        "timestamp": 1569349512635,
        "duration": 7945
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00c6008b-00fc-0029-00ba-00e0003000e3.png",
        "timestamp": 1569349521423,
        "duration": 445
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349522971,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349522972,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349523378,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349523439,
                "type": ""
            }
        ],
        "screenShotFile": "0074009c-00f4-0014-005a-00d800510088.png",
        "timestamp": 1569349522595,
        "duration": 1772
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349527490,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349527490,
                "type": ""
            }
        ],
        "screenShotFile": "00420044-001a-0078-00bd-00a800bc00f0.png",
        "timestamp": 1569349524975,
        "duration": 3946
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006b0054-00bc-00f3-00ad-00fa00f1007e.png",
        "timestamp": 1569349529324,
        "duration": 850
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4952,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: i is not defined"
        ],
        "trace": [
            "ReferenceError: i is not defined\n    at apiListPage.validateApiTypeListContentsAreAvailable (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:29:21)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:24:15)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002c0028-006a-005e-00ae-0084002500e5.png",
        "timestamp": 1569349530554,
        "duration": 10
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349562919,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349562967,
                "type": ""
            }
        ],
        "screenShotFile": "006600a5-00cd-002e-005a-00ed005d00df.png",
        "timestamp": 1569349561824,
        "duration": 2327
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00e700d6-0027-00fe-006d-00a100c3009f.png",
        "timestamp": 1569349564828,
        "duration": 287
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349566972,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349567055,
                "type": ""
            }
        ],
        "screenShotFile": "00ec00ba-0069-00be-0011-004e00340052.png",
        "timestamp": 1569349565686,
        "duration": 2296
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349570868,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349570868,
                "type": ""
            }
        ],
        "screenShotFile": "00160036-00c9-005a-0099-002b00cb0065.png",
        "timestamp": 1569349568566,
        "duration": 3875
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008600de-0060-004a-002e-0078003e0084.png",
        "timestamp": 1569349572817,
        "duration": 823
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6096,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: i is not defined"
        ],
        "trace": [
            "ReferenceError: i is not defined\n    at apiListPage.validateApiTypeListContentsAreAvailable (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:29:21)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:24:15)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "000d00bc-0055-0041-00aa-00fe000700f3.png",
        "timestamp": 1569349574016,
        "duration": 10
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349598084,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349598138,
                "type": ""
            }
        ],
        "screenShotFile": "0088000c-00a2-0065-00e6-00e70066003b.png",
        "timestamp": 1569349596586,
        "duration": 3002
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "007b00df-005f-006c-000c-003400270022.png",
        "timestamp": 1569349600229,
        "duration": 115
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349601592,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349601600,
                "type": ""
            }
        ],
        "screenShotFile": "005e00eb-0013-00a2-0051-002600ac0034.png",
        "timestamp": 1569349600865,
        "duration": 1940
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349605650,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349605650,
                "type": ""
            }
        ],
        "screenShotFile": "006c00d5-00e5-0078-00b7-00f8000f0093.png",
        "timestamp": 1569349603376,
        "duration": 5242
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000100f2-0034-0018-00fe-00a300a90024.png",
        "timestamp": 1569349608984,
        "duration": 937
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4328,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: i is not defined"
        ],
        "trace": [
            "ReferenceError: i is not defined\n    at apiListPage.validateApiTypeListContentsAreAvailable (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\apiListPage.js:29:21)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:24:15)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"Validate that each api type has contents available\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:23:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\TC02SearchFieldOperations.js:6:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a10084-00fd-0033-00aa-00c10034002a.png",
        "timestamp": 1569349610288,
        "duration": 10
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349756764,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349756836,
                "type": ""
            }
        ],
        "screenShotFile": "00610020-0006-00b7-00c5-00390063003f.png",
        "timestamp": 1569349755223,
        "duration": 2594
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ee009c-0037-009e-005f-00be00a00097.png",
        "timestamp": 1569349758491,
        "duration": 391
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349764536,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349764561,
                "type": ""
            }
        ],
        "screenShotFile": "003e0071-00aa-00ae-0006-008000dc00d4.png",
        "timestamp": 1569349759492,
        "duration": 5865
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349768190,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349768190,
                "type": ""
            }
        ],
        "screenShotFile": "00160055-0059-0077-00e2-00f2008b00fa.png",
        "timestamp": 1569349765921,
        "duration": 4189
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0043000e-0089-00f8-007d-00330033008e.png",
        "timestamp": 1569349770497,
        "duration": 762
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6740,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006700bc-0023-00c8-0091-004f00cf00fc.png",
        "timestamp": 1569349771641,
        "duration": 84
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349941778,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349941823,
                "type": ""
            }
        ],
        "screenShotFile": "003b009f-0079-001d-0026-00ee00ef009b.png",
        "timestamp": 1569349939946,
        "duration": 3063
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0083001b-0072-00e2-00a0-006b00bd0044.png",
        "timestamp": 1569349943689,
        "duration": 220
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "data:text/html,<html></html> - Error while trying to use the following icon from the Manifest: https://angular.io/assets/images/favicons/favicon-144x144.png (Download error or resource isn't a valid image)",
                "timestamp": 1569349945357,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349947099,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569349947143,
                "type": ""
            }
        ],
        "screenShotFile": "00540012-0090-0048-009b-00c800090081.png",
        "timestamp": 1569349944846,
        "duration": 3235
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349950998,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569349950998,
                "type": ""
            }
        ],
        "screenShotFile": "00a00015-009b-00c0-00a1-003c005e0065.png",
        "timestamp": 1569349948807,
        "duration": 4948
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001d005f-008f-0072-004e-000500a200e9.png",
        "timestamp": 1569349954180,
        "duration": 844
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00000030-008e-00f2-003d-00f400650053.png",
        "timestamp": 1569349955448,
        "duration": 571
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350000825,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350000899,
                "type": ""
            }
        ],
        "screenShotFile": "00fb0070-008a-009e-0096-007900f1005e.png",
        "timestamp": 1569349996451,
        "duration": 6318
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001200df-002a-0058-00c6-00a5000d0006.png",
        "timestamp": 1569350003828,
        "duration": 212
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350005696,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350005745,
                "type": ""
            }
        ],
        "screenShotFile": "00a30035-00e2-00ca-0023-0033002d0000.png",
        "timestamp": 1569350005024,
        "duration": 1914
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350009975,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350009975,
                "type": ""
            }
        ],
        "screenShotFile": "00840099-00c4-00ca-0047-005600e600e7.png",
        "timestamp": 1569350007541,
        "duration": 4021
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d80023-00df-0011-00f0-00b400a3004f.png",
        "timestamp": 1569350011953,
        "duration": 917
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7248,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ea0026-00ef-0032-0092-009100fc005c.png",
        "timestamp": 1569350013271,
        "duration": 299
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350035423,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350035478,
                "type": ""
            }
        ],
        "screenShotFile": "008b000b-00e2-000c-004b-004b001b0022.png",
        "timestamp": 1569350034194,
        "duration": 2602
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008200ce-0017-0031-008e-00df0017001c.png",
        "timestamp": 1569350037480,
        "duration": 102
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350039575,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350039610,
                "type": ""
            }
        ],
        "screenShotFile": "005300a9-0007-0035-00d2-001500e000c5.png",
        "timestamp": 1569350038445,
        "duration": 2194
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350043922,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350043922,
                "type": ""
            }
        ],
        "screenShotFile": "00ac006b-0071-0084-0046-00190012002b.png",
        "timestamp": 1569350041223,
        "duration": 4159
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009200f0-0025-0056-000a-00c70053007b.png",
        "timestamp": 1569350045796,
        "duration": 863
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6780,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c2001e-00d0-00a7-0016-00eb002e000a.png",
        "timestamp": 1569350047126,
        "duration": 383
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350057150,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350057215,
                "type": ""
            }
        ],
        "screenShotFile": "00840006-004b-00f1-007a-004e0066005f.png",
        "timestamp": 1569350056121,
        "duration": 2220
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00f700cd-001f-003e-00f2-008100040063.png",
        "timestamp": 1569350059055,
        "duration": 204
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350062440,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350062466,
                "type": ""
            }
        ],
        "screenShotFile": "00710004-007b-0087-00ac-004a006900e9.png",
        "timestamp": 1569350059840,
        "duration": 3466
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350066112,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350066112,
                "type": ""
            }
        ],
        "screenShotFile": "00fb0097-0005-0084-00a8-005e00d30037.png",
        "timestamp": 1569350063934,
        "duration": 8033
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d90065-0068-005b-0006-003f00c000d3.png",
        "timestamp": 1569350072661,
        "duration": 1908
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7588,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c500aa-002d-00f0-00fb-0001002900ac.png",
        "timestamp": 1569350075254,
        "duration": 806
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350259234,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350259288,
                "type": ""
            }
        ],
        "screenShotFile": "00bc0008-007f-00d3-00b8-00cd00b400b5.png",
        "timestamp": 1569350257709,
        "duration": 3344
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00310004-0051-009a-009d-00d2005400a5.png",
        "timestamp": 1569350261852,
        "duration": 78
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350262902,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350262904,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350263198,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350263232,
                "type": ""
            }
        ],
        "screenShotFile": "00d000ca-00ab-00b5-0053-00c500c400d3.png",
        "timestamp": 1569350262652,
        "duration": 1718
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350267365,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350267365,
                "type": ""
            }
        ],
        "screenShotFile": "00610051-0088-0037-00b8-007200f2004b.png",
        "timestamp": 1569350264902,
        "duration": 4065
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009400b6-0033-009c-009b-00f5007b00ca.png",
        "timestamp": 1569350269479,
        "duration": 720
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3720,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e60020-006d-00d4-0018-006200af006a.png",
        "timestamp": 1569350270590,
        "duration": 2343
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350494044,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350494118,
                "type": ""
            }
        ],
        "screenShotFile": "00570029-0012-00a4-000f-00eb003800e1.png",
        "timestamp": 1569350492781,
        "duration": 2791
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00ff0089-0038-00a8-0059-00c400fb00a3.png",
        "timestamp": 1569350496322,
        "duration": 37
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350498351,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350498351,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350498604,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350498668,
                "type": ""
            }
        ],
        "screenShotFile": "00a70015-0063-0058-00bd-001600d700e5.png",
        "timestamp": 1569350497239,
        "duration": 2416
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350502490,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350502490,
                "type": ""
            }
        ],
        "screenShotFile": "003e00cf-00df-00c4-00c6-00be00c600ec.png",
        "timestamp": 1569350500350,
        "duration": 3855
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c50075-006f-00b1-0075-00b8001500af.png",
        "timestamp": 1569350504612,
        "duration": 765
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5688,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003700ae-00f7-0013-0033-00ec00b2009e.png",
        "timestamp": 1569350505770,
        "duration": 81
    },
    {
        "description": "should have title as |Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350697798,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350697852,
                "type": ""
            }
        ],
        "screenShotFile": "007000e5-006f-0017-005e-00f400cc00d1.png",
        "timestamp": 1569350696335,
        "duration": 3284
    },
    {
        "description": "should display home page title as Angular|Test Angular Home page",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "004c002b-0082-0080-00be-00280024006d.png",
        "timestamp": 1569350700322,
        "duration": 120
    },
    {
        "description": "should have title as |Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350704851,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569350704879,
                "type": ""
            }
        ],
        "screenShotFile": "00a4002c-001c-00c5-00a8-005800cc00a9.png",
        "timestamp": 1569350701128,
        "duration": 4500
    },
    {
        "description": "Enter text into search field|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350708511,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569350708511,
                "type": ""
            }
        ],
        "screenShotFile": "00b900c9-00be-00a9-0045-00ec0071000f.png",
        "timestamp": 1569350706153,
        "duration": 4404
    },
    {
        "description": "Validate the list of api Type|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007800a9-0027-007b-0062-005200cb00d0.png",
        "timestamp": 1569350710954,
        "duration": 826
    },
    {
        "description": "Validate that each api type has contents available|Should retrive search result on entering search text",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4892,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005c00a2-00dd-0015-009d-0025009c0089.png",
        "timestamp": 1569350712176,
        "duration": 189
    },
    {
        "description": "should display API List Class contents|API Lists Type should display contents",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8452,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.enterSearchText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:23:15)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:9:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"should display API List Class contents\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:7:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569359303452,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569359303500,
                "type": ""
            }
        ],
        "screenShotFile": "00870011-00bf-00d6-005f-009500440001.png",
        "timestamp": 1569359301915,
        "duration": 3786
    },
    {
        "description": "should display API List Class contents|API Lists Type should display contents",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9012,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at AngularHomePage.enterSearchText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:23:15)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:9:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"should display API List Class contents\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:7:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569359398589,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569359398640,
                "type": ""
            }
        ],
        "screenShotFile": "003c0003-0078-003f-0030-00a900c000c2.png",
        "timestamp": 1569359396821,
        "duration": 3943
    },
    {
        "description": "should display api docs class type |API Lists Type should display contents",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8596,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360064594,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360064668,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360068924,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360068925,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360083429,
                "type": ""
            }
        ],
        "screenShotFile": "00a30055-005b-00ea-0036-003600a000d0.png",
        "timestamp": 1569360062797,
        "duration": 22939
    },
    {
        "description": "should display api docs class type |API Lists Type should display contents",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7224,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360190559,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360190612,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360194571,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360194571,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360198146,
                "type": ""
            }
        ],
        "screenShotFile": "007400c5-002b-00b7-00b0-00c000c80048.png",
        "timestamp": 1569360188792,
        "duration": 11664
    },
    {
        "description": "Class type |API Type: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6228,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Wait timed out after 5088ms"
        ],
        "trace": [
            "TimeoutError: Wait timed out after 5088ms\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2201:17\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: <anonymous wait>\n    at scheduleWait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2188:20)\n    at ControlFlow.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2517:12)\n    at Driver.wait (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:934:29)\n    at AngularHomePage.clickAPIList (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\AngularHomePage.js:28:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"Class type \") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:7:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\APIDocsPageTests\\TC01ValidateAPIListTypeContents.js:5:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360295876,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360295940,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360302460,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360302461,
                "type": ""
            }
        ],
        "screenShotFile": "00e8007e-005b-0073-0010-00ba00e5007c.png",
        "timestamp": 1569360292891,
        "duration": 12606
    },
    {
        "description": "Const type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6228,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360308043,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360308045,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360308045,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360308045,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360308580,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360308642,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360313316,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360313316,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360331834,
                "type": ""
            }
        ],
        "screenShotFile": "006e00b6-0004-00e0-0072-002600dd0056.png",
        "timestamp": 1569360307472,
        "duration": 26895
    },
    {
        "description": "Decorator type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6228,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360336157,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360336157,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360339500,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360339571,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360343062,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569360343063,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569360357921,
                "type": ""
            }
        ],
        "screenShotFile": "003c0061-0074-00e3-0039-004900fc0097.png",
        "timestamp": 1569360336053,
        "duration": 24267
    },
    {
        "description": "Class type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8364,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569361007928,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569361007989,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569361012350,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569361012350,
                "type": ""
            }
        ],
        "screenShotFile": "00ae0035-00e3-00f5-00b3-009f004e000c.png",
        "timestamp": 1569361006491,
        "duration": 9531
    },
    {
        "description": "Const type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8364,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003500c4-0011-00d7-003d-008900a800bc.png",
        "timestamp": 1569361016673,
        "duration": 629
    },
    {
        "description": "Decorator type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8364,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0075006f-0049-0087-004f-004800b200bc.png",
        "timestamp": 1569361017771,
        "duration": 522
    },
    {
        "description": "Class type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7340,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/navigation.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569361157503,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "https://angular.io/polyfills-es2015.c45d89a67228e0308422.js 0 A preload for 'https://angular.io/generated/docs/index.json' is found, but is not used because the request headers do not match.",
                "timestamp": 1569361157553,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/docs/index.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569361162349,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "javascript - The resource https://angular.io/generated/navigation.json was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.",
                "timestamp": 1569361162350,
                "type": ""
            }
        ],
        "screenShotFile": "00f900bd-0091-0029-00e0-00e800b20099.png",
        "timestamp": 1569361153894,
        "duration": 13022
    },
    {
        "description": "Const type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7340,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c700b9-0029-00b9-00e1-00c300cc008f.png",
        "timestamp": 1569361167508,
        "duration": 643
    },
    {
        "description": "Decorator type |API Type: ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7340,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c9007f-0037-0054-00b3-00d100190026.png",
        "timestamp": 1569361168804,
        "duration": 1282
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8412,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.getHeading is not a function"
        ],
        "trace": [
            "TypeError: browser.getHeading is not a function\n    at netflixHomePage.getHeading (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:13:18)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:7:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e3000b-008c-0064-00f7-005200b80032.png",
        "timestamp": 1569365065420,
        "duration": 14
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6976,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.actions.mouseDown is not a function"
        ],
        "trace": [
            "TypeError: browser.actions.mouseDown is not a function\n    at netflixHomePage.scrollDownToBottom (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:17:19)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:8:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006a0080-0064-0036-0047-00d80023008d.png",
        "timestamp": 1569365095849,
        "duration": 14
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5424,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopicText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007e004d-00c7-00ba-006a-004a006e00f6.png",
        "timestamp": 1569365140322,
        "duration": 26
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7456,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopicText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00860040-00a6-005c-006b-005c00f7006c.png",
        "timestamp": 1569365323951,
        "duration": 49
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7788,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopicText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ac0068-0037-000b-0011-00a600a600d3.png",
        "timestamp": 1569365583328,
        "duration": 21
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9024,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopicText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:20)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e4003e-0090-0042-0047-009c00fc0083.png",
        "timestamp": 1569365892969,
        "duration": 44
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 772,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopicText (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:20)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006f00df-0037-00bf-00b7-002400cf00ca.png",
        "timestamp": 1569366258265,
        "duration": 40
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 3240,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0047004c-0090-009f-00b5-00ed00270020.png",
        "timestamp": 1569366333285,
        "duration": 18
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6300,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a0001f-0059-00e3-000b-0017006f0035.png",
        "timestamp": 1569366395426,
        "duration": 44
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8580,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:34)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ea0012-0093-0024-0018-005500440020.png",
        "timestamp": 1569366663118,
        "duration": 40
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7376,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.faqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:26:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00770049-00d9-0099-0006-00ab00c400eb.png",
        "timestamp": 1569366745183,
        "duration": 13
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8900,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.faqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:28:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008c006a-005a-0027-00f3-00580089009a.png",
        "timestamp": 1569366847815,
        "duration": 29
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8208,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:22:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e000c3-0043-0096-0081-001b005100a0.png",
        "timestamp": 1569367158513,
        "duration": 40
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7492,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.faqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:28:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bf0045-0034-001d-00ad-002100b80014.png",
        "timestamp": 1569367209940,
        "duration": 13
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6500,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: i is not defined"
        ],
        "trace": [
            "ReferenceError: i is not defined\n    at netflixHomePage.scrollDownToBottom (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:17:17)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:8:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00890070-0053-0012-00e0-00e7001a0027.png",
        "timestamp": 1569367306928,
        "duration": 36
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9176,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.faqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f70074-00f9-00a1-0003-002800f000e5.png",
        "timestamp": 1569367346623,
        "duration": 28
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6988,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: netflixhomepage.signInbutton.click is not a function"
        ],
        "trace": [
            "TypeError: netflixhomepage.signInbutton.click is not a function\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:32)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007e0039-005d-0070-003a-002000190057.png",
        "timestamp": 1569367607460,
        "duration": 29
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8136,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at process._tickCallback (internal/process/next_tick.js:68:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:9:34)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "https://www.netflix.com/ - Refused to apply style from 'https://www.netflix.com/personalization/cl2/freeform/WebsiteDetect?source=wwwhead&fetchType=css&modalView=nmLanding' because its MIME type ('text/plain') is not a supported stylesheet MIME type, and strict MIME checking is enabled.",
                "timestamp": 1569367657278,
                "type": ""
            }
        ],
        "screenShotFile": "009d00ed-000c-006c-003f-0041006d00d5.png",
        "timestamp": 1569367655522,
        "duration": 5950
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9108,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'get' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'get' of undefined\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:31:27)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:11:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ae007b-00fd-00f2-008c-006c0057006c.png",
        "timestamp": 1569368066683,
        "duration": 25
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8972,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'click' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'click' of undefined\n    at netflixHomePage.signInbutton (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:20:31)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00be0078-00f1-00b8-0093-000700590077.png",
        "timestamp": 1569368122851,
        "duration": 38
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8936,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'click' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'click' of undefined\n    at netflixHomePage.signInbutton (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:20:31)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00690012-00d9-0078-00fb-0037001100c7.png",
        "timestamp": 1569368159882,
        "duration": 50
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6208,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'click' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'click' of undefined\n    at netflixHomePage.signInbutton (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:20:31)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002100f8-00da-00d6-003e-005400a20012.png",
        "timestamp": 1569368217698,
        "duration": 26
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9056,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'click' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'click' of undefined\n    at netflixHomePage.signInbutton (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:20:31)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00f1003f-00eb-0051-00f4-001500f10039.png",
        "timestamp": 1569368507458,
        "duration": 25
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7448,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: Cannot read property 'click' of undefined"
        ],
        "trace": [
            "TypeError: Cannot read property 'click' of undefined\n    at netflixHomePage.signInbutton (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:20:31)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:19)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e90006-0025-0045-00fb-00f800c500cb.png",
        "timestamp": 1569368530518,
        "duration": 28
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5256,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: faqLists.get is not a function"
        ],
        "trace": [
            "TypeError: faqLists.get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:48)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00d700d4-0099-00c1-0054-002900080061.png",
        "timestamp": 1569368701907,
        "duration": 54
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4844,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: faqLists.get is not a function"
        ],
        "trace": [
            "TypeError: faqLists.get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:76)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00280046-00dd-00ed-0031-003c007b00c3.png",
        "timestamp": 1569369018716,
        "duration": 24
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2400,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: faqLists.get is not a function"
        ],
        "trace": [
            "TypeError: faqLists.get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:76)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0006006c-0036-00d3-00e3-005c00b9007e.png",
        "timestamp": 1569369678062,
        "duration": 21
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.driver.findElements(...).get is not a function"
        ],
        "trace": [
            "TypeError: browser.driver.findElements(...).get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:77)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006f00e8-000f-0076-0009-000100320085.png",
        "timestamp": 1569369753769,
        "duration": 29
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9020,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.driver.findElements(...).get is not a function"
        ],
        "trace": [
            "TypeError: browser.driver.findElements(...).get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:41)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e0009c-00e6-00c1-00e9-006600ee0069.png",
        "timestamp": 1569369790620,
        "duration": 22
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7788,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.driver.findElements(...).get is not a function"
        ],
        "trace": [
            "TypeError: browser.driver.findElements(...).get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:62)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00da0071-0053-00f1-002c-005800e100e7.png",
        "timestamp": 1569369841842,
        "duration": 22
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8940,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: by.css(...).get is not a function"
        ],
        "trace": [
            "TypeError: by.css(...).get is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:61)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a700cc-00d4-00e0-0077-0069006f00fd.png",
        "timestamp": 1569369946253,
        "duration": 24
    },
    {
        "description": "What is Netflix?|Netflix FAQ: ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7396,
        "browser": {
            "name": "chrome",
            "version": "77.0.3865.90"
        },
        "message": [
            "Failed: browser.driver.findElements(...).first is not a function"
        ],
        "trace": [
            "TypeError: browser.driver.findElements(...).first is not a function\n    at netflixHomePage.getFaqTopic (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\pages\\netflix\\netflixHomePage.js:30:62)\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:10:26)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: Run it(\"What is Netflix?\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:5:2)\n    at addSpecsToSuite (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\YOGESH\\AppData\\Roaming\\npm\\node_modules\\protractor\\example\\testScripts\\netflixSite\\TC01TestFrequentlyAskedQuestions.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:701:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:712:10)\n    at Module.load (internal/modules/cjs/loader.js:600:32)\n    at tryModuleLoad (internal/modules/cjs/loader.js:539:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ad0098-00a4-0027-00da-002700ba0098.png",
        "timestamp": 1569370306058,
        "duration": 48
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});

    };

    this.setTitle = function () {
        var title = $('.report-title').text();
        titleService.setTitle(title);
    };

    // is run after all test data has been prepared/loaded
    this.afterLoadingJobs = function () {
        this.sortSpecs();
        this.setTitle();
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    } else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.afterLoadingJobs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.afterLoadingJobs();
    }

}]);

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

//formats millseconds to h m s
app.filter('timeFormat', function () {
    return function (tr, fmt) {
        if(tr == null){
            return "NaN";
        }

        switch (fmt) {
            case 'h':
                var h = tr / 1000 / 60 / 60;
                return "".concat(h.toFixed(2)).concat("h");
            case 'm':
                var m = tr / 1000 / 60;
                return "".concat(m.toFixed(2)).concat("min");
            case 's' :
                var s = tr / 1000;
                return "".concat(s.toFixed(2)).concat("s");
            case 'hm':
            case 'h:m':
                var hmMt = tr / 1000 / 60;
                var hmHr = Math.trunc(hmMt / 60);
                var hmMr = hmMt - (hmHr * 60);
                if (fmt === 'h:m') {
                    return "".concat(hmHr).concat(":").concat(hmMr < 10 ? "0" : "").concat(Math.round(hmMr));
                }
                return "".concat(hmHr).concat("h ").concat(hmMr.toFixed(2)).concat("min");
            case 'hms':
            case 'h:m:s':
                var hmsS = tr / 1000;
                var hmsHr = Math.trunc(hmsS / 60 / 60);
                var hmsM = hmsS / 60;
                var hmsMr = Math.trunc(hmsM - hmsHr * 60);
                var hmsSo = hmsS - (hmsHr * 60 * 60) - (hmsMr*60);
                if (fmt === 'h:m:s') {
                    return "".concat(hmsHr).concat(":").concat(hmsMr < 10 ? "0" : "").concat(hmsMr).concat(":").concat(hmsSo < 10 ? "0" : "").concat(Math.round(hmsSo));
                }
                return "".concat(hmsHr).concat("h ").concat(hmsMr).concat("min ").concat(hmsSo.toFixed(2)).concat("s");
            case 'ms':
                var msS = tr / 1000;
                var msMr = Math.trunc(msS / 60);
                var msMs = msS - (msMr * 60);
                return "".concat(msMr).concat("min ").concat(msMs.toFixed(2)).concat("s");
        }

        return tr;
    };
});


function PbrStackModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;
    ctrl.convertTimestamp = convertTimestamp;
    ctrl.isValueAnArray = isValueAnArray;
    ctrl.toggleSmartStackTraceHighlight = function () {
        var inv = !ctrl.rootScope.showSmartStackTraceHighlight;
        ctrl.rootScope.showSmartStackTraceHighlight = inv;
    };
    ctrl.applySmartHighlight = function (line) {
        if ($rootScope.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return '';
    };
}


app.component('pbrStackModal', {
    templateUrl: "pbr-stack-modal.html",
    bindings: {
        index: '=',
        data: '='
    },
    controller: PbrStackModalController
});

function PbrScreenshotModalController($scope, $rootScope) {
    var ctrl = this;
    ctrl.rootScope = $rootScope;
    ctrl.getParent = getParent;
    ctrl.getShortDescription = getShortDescription;

    /**
     * Updates which modal is selected.
     */
    this.updateSelectedModal = function (event, index) {
        var key = event.key; //try to use non-deprecated key first https://developer.mozilla.org/de/docs/Web/API/KeyboardEvent/keyCode
        if (key == null) {
            var keyMap = {
                37: 'ArrowLeft',
                39: 'ArrowRight'
            };
            key = keyMap[event.keyCode]; //fallback to keycode
        }
        if (key === "ArrowLeft" && this.hasPrevious) {
            this.showHideModal(index, this.previous);
        } else if (key === "ArrowRight" && this.hasNext) {
            this.showHideModal(index, this.next);
        }
    };

    /**
     * Hides the modal with the #oldIndex and shows the modal with the #newIndex.
     */
    this.showHideModal = function (oldIndex, newIndex) {
        const modalName = '#imageModal';
        $(modalName + oldIndex).modal("hide");
        $(modalName + newIndex).modal("show");
    };

}

app.component('pbrScreenshotModal', {
    templateUrl: "pbr-screenshot-modal.html",
    bindings: {
        index: '=',
        data: '=',
        next: '=',
        previous: '=',
        hasNext: '=',
        hasPrevious: '='
    },
    controller: PbrScreenshotModalController
});

app.factory('TitleService', ['$document', function ($document) {
    return {
        setTitle: function (title) {
            $document[0].title = title;
        }
    };
}]);


app.run(
    function ($rootScope, $templateCache) {
        //make sure this option is on by default
        $rootScope.showSmartStackTraceHighlight = true;
        
  $templateCache.put('pbr-screenshot-modal.html',
    '<div class="modal" id="imageModal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="imageModalLabel{{$ctrl.index}}" ng-keydown="$ctrl.updateSelectedModal($event,$ctrl.index)">\n' +
    '    <div class="modal-dialog modal-lg m-screenhot-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="imageModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="imageModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <img class="screenshotImage" ng-src="{{$ctrl.data.screenShotFile}}">\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <div class="pull-left">\n' +
    '                    <button ng-disabled="!$ctrl.hasPrevious" class="btn btn-default btn-previous" data-dismiss="modal"\n' +
    '                            data-toggle="modal" data-target="#imageModal{{$ctrl.previous}}">\n' +
    '                        Prev\n' +
    '                    </button>\n' +
    '                    <button ng-disabled="!$ctrl.hasNext" class="btn btn-default btn-next"\n' +
    '                            data-dismiss="modal" data-toggle="modal"\n' +
    '                            data-target="#imageModal{{$ctrl.next}}">\n' +
    '                        Next\n' +
    '                    </button>\n' +
    '                </div>\n' +
    '                <a class="btn btn-primary" href="{{$ctrl.data.screenShotFile}}" target="_blank">\n' +
    '                    Open Image in New Tab\n' +
    '                    <span class="glyphicon glyphicon-new-window" aria-hidden="true"></span>\n' +
    '                </a>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

  $templateCache.put('pbr-stack-modal.html',
    '<div class="modal" id="modal{{$ctrl.index}}" tabindex="-1" role="dialog"\n' +
    '     aria-labelledby="stackModalLabel{{$ctrl.index}}">\n' +
    '    <div class="modal-dialog modal-lg m-stack-modal" role="document">\n' +
    '        <div class="modal-content">\n' +
    '            <div class="modal-header">\n' +
    '                <button type="button" class="close" data-dismiss="modal" aria-label="Close">\n' +
    '                    <span aria-hidden="true">&times;</span>\n' +
    '                </button>\n' +
    '                <h6 class="modal-title" id="stackModalLabelP{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getParent($ctrl.data.description)}}</h6>\n' +
    '                <h5 class="modal-title" id="stackModalLabel{{$ctrl.index}}">\n' +
    '                    {{$ctrl.getShortDescription($ctrl.data.description)}}</h5>\n' +
    '            </div>\n' +
    '            <div class="modal-body">\n' +
    '                <div ng-if="$ctrl.data.trace.length > 0">\n' +
    '                    <div ng-if="$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer" ng-repeat="trace in $ctrl.data.trace track by $index"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                    <div ng-if="!$ctrl.isValueAnArray($ctrl.data.trace)">\n' +
    '                        <pre class="logContainer"><div ng-class="$ctrl.applySmartHighlight(line)" ng-repeat="line in $ctrl.data.trace.split(\'\\n\') track by $index">{{line}}</div></pre>\n' +
    '                    </div>\n' +
    '                </div>\n' +
    '                <div ng-if="$ctrl.data.browserLogs.length > 0">\n' +
    '                    <h5 class="modal-title">\n' +
    '                        Browser logs:\n' +
    '                    </h5>\n' +
    '                    <pre class="logContainer"><div class="browserLogItem"\n' +
    '                                                   ng-repeat="logError in $ctrl.data.browserLogs track by $index"><div><span class="label browserLogLabel label-default"\n' +
    '                                                                                                                             ng-class="{\'label-danger\': logError.level===\'SEVERE\', \'label-warning\': logError.level===\'WARNING\'}">{{logError.level}}</span><span class="label label-default">{{$ctrl.convertTimestamp(logError.timestamp)}}</span><div ng-repeat="messageLine in logError.message.split(\'\\\\n\') track by $index">{{ messageLine }}</div></div></div></pre>\n' +
    '                </div>\n' +
    '            </div>\n' +
    '            <div class="modal-footer">\n' +
    '                <button class="btn btn-default"\n' +
    '                        ng-class="{active: $ctrl.rootScope.showSmartStackTraceHighlight}"\n' +
    '                        ng-click="$ctrl.toggleSmartStackTraceHighlight()">\n' +
    '                    <span class="glyphicon glyphicon-education black"></span> Smart Stack Trace\n' +
    '                </button>\n' +
    '                <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\n' +
    '            </div>\n' +
    '        </div>\n' +
    '    </div>\n' +
    '</div>\n' +
     ''
  );

    });
