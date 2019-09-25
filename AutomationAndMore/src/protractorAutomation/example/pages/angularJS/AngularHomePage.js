/**
 * create object of page to operate
 */

var AngularHomePage = function () {

	var EC = protractor.ExpectedConditions;
	var searchField = element(by.css("input[type='search']"));
	var searchResultAPIList = element(by.css("a[class='search-result-item'][href='api']"));

	//Open application under test
	this.openWebApplication = function () {
		browser.get("https://angular.io/");
	};

	//Get page title
	this.getPageTitle = function () {
		return browser.getTitle();
	};

	//Enter search text
	this.enterSearchText = function (name) {
		searchField.sendKeys(name);
	};

	//Click on 'API List' on search result
	this.clickAPIList = async function () {
		browser.driver.wait(EC.visibilityOf(searchResultAPIList), 5000);
		await searchResultAPIList.click();
	};

	this.closeBrowser = function () {
		browser.quit();
	};
};

module.exports = new AngularHomePage();