import { Jexml } from '../src/index';

const fixture = {
  first_name: 'John',
  last_name: 'Doe',
  age: 30,
  company: {
    name: 'Acme Inc',
    type: 'Corporation',
  },
  address: {
    street: '123 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
    faces: ['east', 'west'],
  },
  friends: [
    { first_name: 'Jane', last_name: 'Doe', age: 28 },
    { first_name: 'Jim', last_name: 'Smith', age: 32 },
  ],
};

describe('Jexml', () => {
  it('should convert json to xml using template', () => {
    const config = `
    root: Record
    elements:
      FirstName: first_name
      LastName: last_name
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<Record>');
    expect(xml).toContain('<FirstName>John</FirstName>');
    expect(xml).toContain('<LastName>Doe</LastName>');
  });
  it('should replace value() with literal', () => {
    const config = `
    root: Record
    elements:
      FirstName: value(John)
      LastName: value(Doe)
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<Record>');
    expect(xml).toContain('<FirstName>John</FirstName>');
    expect(xml).toContain('<LastName>Doe</LastName>');
  });
  it('should support string interpolation', () => {
    const config = `
    root: Record
    elements:
      FullName: first_name + " " + last_name
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<FullName>John Doe</FullName>');
  });
  it('should support nested objects', () => {
    const config = `
    root: Record
    elements:
      FirstName: first_name
      LastName: last_name
      Company:
        Name: company.name
        Type: company.type
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<Record>');
    expect(xml).toContain('<FirstName>John</FirstName>');
    expect(xml).toContain('<LastName>Doe</LastName>');
    expect(xml).toContain('<Company>');
    expect(xml).toContain('<Name>Acme Inc</Name>');
    expect(xml).toContain('<Type>Corporation</Type>');
  });
  it('should support attributes for elements', () => {
    const config = `
    root: Record
    elements:
      FirstName:
        value: first_name
        attributes:
          id: value(1)
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<FirstName id="1">John</FirstName>');
  });
  it('should support inline conditional evaluation', () => {
    const config = `
    root: Record
    elements:
      CompanyMatch: "company.name == 'Acme Inc' ? company.name : ''"
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<CompanyMatch>Acme Inc</CompanyMatch>');
  });
  it('should support conditional elements with children nodes', () => {
    const config = `
    root: Record
    elements:
      CompanyMatch:
        condition: company.name == 'Acme Inc'
        elements:
          NameMatched: company.name
      CompanyNoMatch:
        condition: company.name != 'Acme Inc'
        elements:
          NameNotMatched: company.name
    `;
    const xml = new Jexml({
      templateString: config,
    }).convert(fixture);
    expect(xml).toContain('<CompanyMatch>');
    expect(xml).toContain('<NameMatched>Acme Inc</NameMatched>');
    expect(xml).not.toContain('<CompanyNoMatch>');
  });
  it('should support array elements nested', () => {
    const config = `
    root: Record
    elements:
      Friends[]:
        as: Friend
        from: friends
        elements:
          FirstName: first_name
          LastName: last_name
    `;
    const xml = new Jexml({
      templateString: config,
      formatSpacing: 2,
    }).convert(fixture);
    expect(xml).toContain('<Friends>');
    expect(xml).toContain('<FirstName>Jane</FirstName>');
    expect(xml).toContain('<LastName>Doe</LastName>');
  });
  it('should support arrays with no wrapping element', () => {
    const config = `
    root: Record
    elements:
      $[]:
        as: Friend
        from: friends
        elements:
          FirstName: first_name
          LastName: last_name
    `;
    const xml = new Jexml({
      templateString: config,
      formatSpacing: 2,
    }).convert(fixture);
    expect(!xml.includes('<$>')).toBeTruthy();
    expect(xml).toContain('<FirstName>Jane</FirstName>');
    expect(xml).toContain('<LastName>Doe</LastName>');
  });
  it('should support spread arrays', () => {
    const config = `
    root: Record
    elements:
      AddressPart:
        - address.street
        - value: address.state
          attributes:
            city: address.city
        - elements:
            Zip: address.zip
        - "address.zip == '62701' ? 'Springfield' : 'Unknown'"
        - condition: address.zip == '62701'
          elements:
            IsSpringfield: value(true)
        - condition: address.zip == '55555'
          elements:
            IsSpringfield: value(should not be here)
      `;
    const xml = new Jexml({
      templateString: config,
      formatSpacing: 2,
    }).convert(fixture);
    expect(xml).toContain('<AddressPart>123 Main St</AddressPart>');
    expect(xml).toContain('<AddressPart city="Springfield">IL</AddressPart>');
    expect(xml).toContain('<Zip>62701</Zip>');
    expect(xml).toContain('<AddressPart>Springfield</AddressPart>');
    expect(xml).toContain('<IsSpringfield>true</IsSpringfield>');
  });
  it('should support ability to add custom functions', () => {
    const config = `
    root: Record
    elements:
      FullName: concat(first_name, " ", last_name)
    `;
    const xml = new Jexml({
      templateString: config,
      functions: {
        concat: (...args) => args.join(''),
      },
    }).convert(fixture);
    expect(xml).toContain('<FullName>John Doe</FullName>');
  });
  it('should support ability to add custom transforms', () => {
    const config = `
    root: Record
    elements:
      Age: age|double
    `;
    const xml = new Jexml({
      templateString: config,
      tranforms: {
        double: (value) => value * 2,
      },
    }).convert(fixture);
    expect(xml).toContain('<Age>60</Age>');
  });
  it('should support ability to add custom binary operators', () => {
    const config = `
    root: Record
    elements:
      Age: age add 10
    `;
    const xml = new Jexml({
      templateString: config,
      binaryOps: {
        add: {
          precedence: 10,
          fn: (left, right) => left + right,
        },
      },
    }).convert(fixture);
    expect(xml).toContain('<Age>40</Age>');
  });
  it('should stream xml when called with stream() method', (done) => {
    const config = `
    root: Record
    elements:
      FirstName: first_name
      LastName: last_name
    `;
    const jexml = new Jexml({
      templateString: config,
    });
    const stream = jexml.stream({
      documentOpen: '<People>',
      documentClose: '</People>',
    });
    let xml = '';
    stream.on('data', (chunk) => {
      xml += chunk;
    });
    stream.on('end', () => {
      expect(xml).toContain('<Record>');
      expect(xml).toContain('<FirstName>John</FirstName>');
      expect(xml).toContain('<LastName>Doe</LastName>');
      done();
    });
    stream.write(fixture);
    stream.end();
  });
});
