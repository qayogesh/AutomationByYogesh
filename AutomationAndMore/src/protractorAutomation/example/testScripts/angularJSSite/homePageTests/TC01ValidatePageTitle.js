//execute test as cmd => navigate to conf.js folder and => protractor conf.js --suite homepage
var angularHomePage = require('..//../../pages//angularJS//AngularHomePage');

describe('Test Angular Home page', function () {

	it('should have title as ', function () {
		angularHomePage.openWebApplication();
	});

	it('should display home page title as Angular', function () {
		expect(angularHomePage.getPageTitle()).toEqual('Angular');
		console.log('passed-should display home page title as Angular')
	});
});