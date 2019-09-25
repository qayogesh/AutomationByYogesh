var netflixHomePage = function () {

	browser.driver.ignoreSynchronization = true
	var EC = protractor.ExpectedConditions;

	this.openNetflixWeb = function () {
		browser.driver.get("https://www.netflix.com/");
	};

	this.getHeading = function () {
		return browser.driver.getTitle();
	};

	this.signInbutton = function () {
		browser.driver.findElement(by.css('a.authLinks.redButton')).click();
	}

	this.scrollDownToBottom = function () {
		for (var t = 0; t < 30; t++) {
			browser.driver.actions().mouseDown().perform(by.css('ul.faq-list'));
		}
	};

	this.getFaqTopic = function (index, text) {
		browser.driver.findElements(by.css('button.faq-question')).then(function (items) {
			items[index].getText();
		})
	};

	this.faqTopic = function (index) {
		browser.driver.findElements(by.css('button.faq-question')).then(function (items) {
			items[index].click();
		})
	};

	this.getFaqDescription = function (index, text) {
		browser.driver.findElements(by.css('button.faq-question')).then(function (items) {
			items[index].getText().toContain(text);
		})
	};


}
module.exports = new netflixHomePage();