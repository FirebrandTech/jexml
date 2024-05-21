import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Xamlator } from '../../src';

function formatXml(xml, tab = '  ') {
  // tab = optional indent value, default is tab (\t)
  var formatted = '',
    indent = '';
  tab = tab || '\t';
  xml.split(/>\s*</).forEach(function (node) {
    if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent by one 'tab'
    formatted += indent + '<' + node + '>\r\n';
    if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab; // increase indent
  });
  return formatted.substring(1, formatted.length - 3);
}

const data = readFileSync(resolve(__dirname, './sample.json'), 'utf8');
const template = readFileSync(resolve(__dirname, './sample.yml'), 'utf8');

const xamlator = new Xamlator({ templateString: template });

const xml = xamlator.convert(JSON.parse(data));

console.log(formatXml(xml));
