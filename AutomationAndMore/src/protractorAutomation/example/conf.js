var {
  SpecReporter
} = require('jasmine-spec-reporter');
var HtmlReporter = require('protractor-beautiful-reporter');

exports.config = {
  directConnect: true,

  // Capabilities to be passed to the webdriver instance.
  capabilities: {
    'browserName': 'chrome'
  },

  // Framework to use. Jasmine is recommended.
  framework: 'jasmine',
  jasmineNodeOpts: {
    showColors: true,
  },

  // Spec patterns are relative to the location of the spec file.
  //execute in cmd ..//node_modules\protractor\example>protractor conf.js --suite netflix, angularJS
  suites: {
    netflix: 'testScripts//netflixSite//TC01TestFrequentlyAskedQuestions.js',

    angularJS: ['testScripts//angularJSSite//APIDocsPageTests//TC01ValidateAPIListTypeContents.js',
      'testScripts//angularJSSite//homePageTests//TC01ValidatePageTitle.js',
      'testScripts//angularJSSite//homePageTests//TC02SearchFieldOperations.js'
    ]
  },

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true, // Use colors in the command line report.
  },

  onPrepare: function () {
    // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
    jasmine.getEnv().addReporter(new HtmlReporter({
      baseDirectory: 'tmp/screenshots'
    }).getJasmine2Reporter());
  },

};