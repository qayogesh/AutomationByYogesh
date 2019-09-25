var angularHomePage = require('..//../../pages//angularJS//AngularHomePage');
var apilistPage = require('..//../../pages//angularJS//apiListPage');

describe('API Type: ', function () {

	it('Class type ', function () {
		angularHomePage.openWebApplication();
		angularHomePage.enterSearchText("API documentation");
		angularHomePage.clickAPIList();
		expect(apilistPage.getHeading()).toEqual('API List');
		apilistPage.clickOnapiTypeList();
		apilistPage.getApiTypeList();
		apilistPage.validateApiTypeListClassContentsAreAvailable(1);
	});

	it('Const type ', function () {
		apilistPage.validateApiTypeListClassContentsAreAvailable(2);
	});

	it('Decorator type ', function () {
		apilistPage.validateApiTypeListClassContentsAreAvailable(3);
	});

});