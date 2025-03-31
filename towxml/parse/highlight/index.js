const config = require('../../config'),
    hljs = require('./highlight');
// config.highlight.forEach(item => {
//     hljs.registerLanguage(item, require(`./languages/${item}`).default);
// });
hljs.registerLanguage('css', require('./languages/css').default);hljs.registerLanguage('javascript', require('./languages/javascript').default);hljs.registerLanguage('json', require('./languages/json').default);hljs.registerLanguage('xml', require('./languages/xml').default);hljs.registerLanguage('htmlbars', require('./languages/htmlbars').default);

module.exports = hljs;