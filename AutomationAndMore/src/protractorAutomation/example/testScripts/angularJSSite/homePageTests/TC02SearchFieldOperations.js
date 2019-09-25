//execute test as cmd => navigate to conf.js folder and => protractor conf.js --suite homepage

var angularHomePage = require('..//../../pages//angularJS//AngularHomePage');
var apilistPage = require('..//../../pages//angularJS//apiListPage');

describe('Should retrive search result on entering search text', function () {

	it('should have title as ', function () {
		angularHomePage.openWebApplication();
	});

	it('Enter text into search field', function () {
		angularHomePage.enterSearchText("API documentation");
		angularHomePage.clickAPIList();
		expect(apilistPage.getHeading()).toEqual('API List');
	});

	it('Validate the list of api Type', function () {
		apilistPage.clickOnapiTypeList();
		apilistPage.getApiTypeList();
	});

	it('Validate that each api type has contents available', function () {
		apilistPage.validateApiTypeListContentsAreAvailable();
	});
});