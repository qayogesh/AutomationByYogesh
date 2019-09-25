var apiListPage = function () {

	var EC = protractor.ExpectedConditions;
	var heading = element(by.css('#api-list'));
	var apiTypeListButton = element(by.css("aio-select[label='Type:'] button.form-select-button"));
	var apiTypeLists = element.all(by.css("ul.form-select-dropdown.ng-star-inserted li :nth-child(2)"));

	this.getHeading = function () {
		browser.driver.wait(EC.visibilityOf(heading), 5000);
		return heading.getText();
	};

	this.clickOnapiTypeList = function () {
		browser.driver.wait(EC.visibilityOf(apiTypeListButton, 5000));
		apiTypeListButton.click();
	};

	this.getApiTypeList = async function () {
		browser.driver.wait(EC.visibilityOf(apiTypeLists.get(0), 5000));
		apiTypeLists.each(function (apiTypeLists, index) {
			apiTypeLists.getText().then(function (text) {
				console.log(text);
			})
		})
	};

	this.validateApiTypeListClassContentsAreAvailable = function (i) {
		browser.driver.wait(EC.visibilityOf(apiTypeLists.get(0), 5000));
		apiTypeLists.get(i).click();
		apiTypeListButton.click();
	};

};
module.exports = new apiListPage();