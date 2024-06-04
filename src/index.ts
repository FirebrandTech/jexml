import { parse } from 'yaml';
import * as fs from 'fs';
import jexl from 'jexl';
import { Transform, TransformCallback } from 'stream';

type Primitive = boolean | number | string | undefined;

type Config = {
  templatePath?: string;
  templateString?: string;
  formatSpacing?: number | string;
  ignoreUndefined?: boolean;
  tranforms?: Record<string, (value: any, ...args: any[]) => any>;
  functions?: Record<string, (value: any, ...args: any[]) => any>;
  binaryOps?: Record<
    string,
    {
      precedence: number;
      fn: (left: any, right: any) => any;
    }
  >;
};
type Context = Record<string, any>;
type Node = Record<string, any>;

interface Template {
  root: string;
  elements: Record<string, any>;
}

const NOWRAP = '<!NOWRAP>';
export class Jexml {
  private template: Template;
  private formatSpacing: number | string;
  private ignoreUndefined: boolean;

  constructor(config: Config) {
    const tmpl = config.templatePath
      ? fs.readFileSync(config.templatePath, 'utf8')
      : config.templateString;
    this.template = parse(tmpl);
    this.formatSpacing = config.formatSpacing;
    this.ignoreUndefined = config.ignoreUndefined === true ? false : true;

    // Add custom functions to Jexl
    if (config.functions) {
      for (const fn in config.functions) {
        jexl.addFunction(fn, config.functions[fn]);
      }
    }

    // Add custom transforms to Jexl
    if (config.tranforms) {
      for (const transform in config.tranforms) {
        jexl.addTransform(transform, config.tranforms[transform]);
      }
    }

    // Add custom binary operators to Jexl
    if (config.binaryOps) {
      for (const operator in config.binaryOps) {
        jexl.addBinaryOp(
          operator,
          config.binaryOps[operator].precedence,
          config.binaryOps[operator].fn
        );
      }
    }
  }

  // Abstract the creation of XML elements
  private createXMLElements(key: string, value: any, attributes?: any) {
    // Check if the key is an array indicator and remove it
    const elementKey = key.endsWith('[]') ? key.slice(0, -2) : key;
    let noWrap = false;
    if (this.ignoreUndefined && value === undefined) return '';
    if (value && typeof value === 'string' && value.startsWith(NOWRAP)) {
      value = value.substr(NOWRAP.length);
      noWrap = true;
    }
    if (noWrap) return value;
    return attributes
      ? `<${elementKey} ${attributes}>${value !== undefined ? value : ''}</${elementKey}>`
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
  private parseArray(key: string, node: Node | Node[], context: Context) {
    // If the node is an array, map over it for repeating the key
    if (Array.isArray(node)) {
      return node
        .map((item: any) => {
          if (typeof item === 'object') {
            if (Object.keys(item)[0] === 'elements') {
              return this.createXMLElements(
                key,
                this.parseNode(key, item.elements, context)
              );
            }
            return this.parseNode(key, item, context);
          } else {
            return this.createXMLElements(
              key,
              this.parseNode(key, item, context)
            );
          }
        })
        .join('');
    }

    // If the node is an object, map over the context to create nested arrays
    const { as, from, elements } = node;
    const array = context[from]; // Get data from the context
    return array.map((item: any) => {
      return this.createXMLElements(as, this.parseObject(elements, item));
    });
  }

  private parseConditional(node: Node, context: Context) {
    const evaluated = jexl.evalSync(node.condition, context);
    if (evaluated) {
      return this.parseObject(node.elements, context);
    }
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
      // ARRAYS
      if (key.endsWith('[]') || Array.isArray(node)) {
        const res = this.parseArray(key, node, context);
        return key.endsWith('[]') ? res : `${NOWRAP}${res}`;
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
          // OBJECT WITH CONDITON
        } else if (Object.keys(node).includes('condition')) {
          return this.parseConditional(node, context);
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

  public stream(opts: StreamOptions): JexmlTransformStream {
    return new JexmlTransformStream(this, opts);
  }
}

interface StreamOptions {
  documentOpen?: string | string[];
  documentClose?: string | string[];
}

class JexmlTransformStream extends Transform {
  private jexml: Jexml;
  private isFirstChunk: boolean = true;
  private options: StreamOptions;

  i = 0;

  constructor(jexml: Jexml, options?: StreamOptions) {
    super({ objectMode: true });
    this.jexml = jexml;
    this.options = options;
  }

  _transform(chunk: any, encoding: string, callback: TransformCallback) {
    if (this.isFirstChunk) {
      Array.isArray(this.options.documentOpen)
        ? this.options.documentOpen.forEach((head) => this.push(head))
        : this.push(this.options.documentOpen || '');
      this.isFirstChunk = false;
    }
    let xml;
    if (Array.isArray(chunk)) {
      for (let i = 0; i < chunk.length; i++) {
        xml = this.jexml.convert(chunk[i]);
        this.push(xml);
      }
    } else {
      xml = this.jexml.convert(chunk);
      this.push(xml);
    }
    callback();
  }

  _final(callback: (error?: Error) => void): void {
    Array.isArray(this.options.documentClose)
      ? this.options.documentClose.forEach((tail) => this.push(tail))
      : this.push(this.options.documentClose || '');
    callback();
  }
}
