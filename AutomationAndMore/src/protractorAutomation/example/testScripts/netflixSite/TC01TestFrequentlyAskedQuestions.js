var netflixhomepage = require('..//../pages//netflix//netflixHomePage');

describe('Netflix FAQ: ', function () {

	it('What is Netflix?', function () {
		browser.driver.ignoreSynchronization = true;
		netflixhomepage.openNetflixWeb();
		expect(netflixhomepage.getHeading()).toEqual('Netflix - Watch TV Shows Online, Watch Movies Online');
		netflixhomepage.scrollDownToBottom();
		expect(netflixhomepage.getFaqTopic(0, 'What is Netflix?'));
		netflixhomepage.faqTopic(0);
		expect(netflixhomepage.getFaqDescription(0, 'Netflix is a streaming service that offers'));
	});
});