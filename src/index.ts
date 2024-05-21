import { parse } from 'yaml';
import * as fs from 'fs';
import jexl from 'jexl';

type Primitive = boolean | number | string | undefined;

type Config = {
  templatePath?: string;
  templateString?: string;
  formatSpacing?: number | string;
};
type Context = Record<string, any>;
type Node = Record<string, any>;

interface Template {
  root: string;
  elements: Record<string, any>;
}
export class Jexml {
  private template: Template;
  private formatSpacing: number | string;

  constructor(config: Config) {
    const tmpl = config.templatePath
      ? fs.readFileSync(config.templatePath, 'utf8')
      : config.templateString;
    this.template = parse(tmpl);
    this.formatSpacing = config.formatSpacing;
  }

  // Abstract the creation of XML elements
  private createXMLElements(key: string, value: any, attributes?: any) {
    // Check if the key is an array indicator and remove it
    const elementKey = key.endsWith('[]') ? key.slice(0, -2) : key;
    return attributes
      ? `<${elementKey} ${attributes}>${value}</${elementKey}>`
      : `<${elementKey}>${value}</${elementKey}>`;
  }

  private formatXml(xml: string) {
    const tab =
      typeof this.formatSpacing === 'number'
        ? ' '.repeat(this.formatSpacing)
        : this.formatSpacing;
    let formatted = '',
      indent = '';
    xml.split(/>\s*</).forEach(function (node) {
      if (node.match(/^\/\w/)) indent = indent.substring(tab.length); // decrease indent by one 'tab'
      formatted += indent + '<' + node + '>\r\n';
      if (node.match(/^<?\w[^>]*[^\/]$/)) indent += tab; // increase indent
    });
    return formatted.substring(1, formatted.length - 3);
  }

  // At node, parse the string and return the value
  private parseString(node: string, context: Context) {
    if (typeof node !== 'object') {
      return node.startsWith('value(') && node.endsWith(')')
        ? this.escapeXml(node.substring(6, node.length - 1))
        : jexl.evalSync(node, context);
    }
  }

  // Get props to map array elements
  private parseArray(node: Node, context: Context) {
    const { as, from, elements } = node;
    const array = context[from]; // Get data from the context
    return array
      .map((item: any) => {
        return this.createXMLElements(as, this.parseObject(elements, item));
      })
      .join('');
  }

  // Creates attribute string from map
  private buildAttributes(attributes: Primitive, context: Context) {
    return Object.keys(attributes)
      .map((attr) => `${attr}="${this.parseString(attributes[attr], context)}"`)
      .join(' ');
  }

  // Determine node type and parse accordingly
  private parseNode(key: string, node: any, context: Context) {
    if (typeof node === 'object') {
      // ARRAY
      if (key.endsWith('[]')) {
        return this.parseArray(node, context);
      } else {
        // OBJECT WITH VALUE AND ATTRIBUTES
        if (
          Object.keys(node).includes('value') &&
          Object.keys(node).includes('attributes')
        ) {
          const element =
            typeof node.value !== 'object'
              ? this.parseString(node.value, context)
              : this.parseNode(key, node.value, context);
          return this.createXMLElements(
            key,
            element,
            this.buildAttributes(node.attributes, context)
          );
          // OBJECT WITH VALUE
        } else {
          return this.parseObject(node, context);
        }
      }
    } else {
      // STRING
      return this.parseString(node, context);
    }
  }

  // Itterate over the object and parse each key
  private parseObject(node: Node, context: Context) {
    let xml = '';
    for (let key in node) {
      xml += this.createXMLElements(
        key,
        this.parseNode(key, node[key], context)
      );
    }
    return xml;
  }

  // Escape unsafe XML entities
  private escapeXml(unsafe: Primitive): string {
    if (unsafe === null || unsafe === undefined) {
      return ''; // Return an empty string for null or undefined inputs
    }
    const safeString = String(unsafe); // Convert non-string inputs to string
    return safeString
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  public convert(context: Context): string {
    const xml = `<${this.template.root}>${this.parseObject(this.template.elements, context)}</${this.template.root}>`;
    return this.formatSpacing ? this.formatXml(xml) : xml;
  }
}
