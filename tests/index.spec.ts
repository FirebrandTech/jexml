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
  it('should be replace value() with literal', () => {
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
  it('should support conditional elements', () => {
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
  it('should support array elements', () => {
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
