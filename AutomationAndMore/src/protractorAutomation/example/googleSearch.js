
describe('Test suite to test google search result is correct', function () {

	it('open google page', function () {
		browser.get('https://angular.io/');
		//browser.window.maximize();
	}),

		it('enter search parameter', function () {
			element(by.css('a.button.hero-cta')).click();
		}),

		it('click on search button', function () {
			element(by.css("a[title='Blog']")).click();
		})
});